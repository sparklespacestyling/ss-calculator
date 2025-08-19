import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

interface Suggestion {
  place_id: string;
  description: string;
}

const AddressAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Enter property address", 
  className,
  id 
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  // Initialize Google Places API
  useEffect(() => {
    const initializeGoogle = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      
      console.log('Initializing Google Places API...', { apiKey: apiKey ? 'Present' : 'Missing' });
      
      if (!apiKey) {
        console.warn('Google Places API key not found. Address autocomplete will be disabled.');
        setError('Google Places API key not configured');
        return;
      }

      try {
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places'],
          region: 'AU',
        });

        console.log('Loading Google Maps API...');
        await loader.load();
        console.log('Google Maps API loaded successfully');
        
        // Wait a bit more to ensure everything is fully loaded
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (window.google?.maps?.places?.AutocompleteService) {
          serviceRef.current = new window.google.maps.places.AutocompleteService();
          setIsGoogleLoaded(true);
          setError(null);
          console.log('AutocompleteService created successfully');
        } else {
          console.error('Google Maps structure:', window.google?.maps);
          throw new Error('AutocompleteService not available');
        }
      } catch (error) {
        console.error('Error loading Google Places API:', error);
        setError(error instanceof Error ? error.message : 'Failed to load Google Places API');
      }
    };

    initializeGoogle();
  }, []);

  const searchPlaces = useCallback((inputValue: string) => {
    console.log('searchPlaces called with:', inputValue);
    console.log('Current state - isGoogleLoaded:', isGoogleLoaded, 'serviceRef:', serviceRef.current);
    
    // Check service directly instead of relying on isGoogleLoaded state
    if (!serviceRef.current || inputValue.length < 3) {
      console.log('searchPlaces early exit - no service or input too short');
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    console.log('Making API call for:', inputValue);
    
    const request = {
      input: inputValue,
      componentRestrictions: { country: 'au' },
      types: ['address']
    };

    console.log('Request object:', request);

    try {
      serviceRef.current.getPlacePredictions(
        request,
        (predictions, status) => {
          console.log('API callback received - Status:', status, 'Predictions:', predictions?.length || 0);
          console.log('Full predictions:', predictions);
          
          setIsLoading(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            console.log('Processing successful predictions');
            const formattedSuggestions = predictions.map(prediction => ({
              place_id: prediction.place_id,
              description: prediction.description,
            }));
            console.log('Formatted suggestions:', formattedSuggestions);
            setSuggestions(formattedSuggestions);
            setShowSuggestions(true);
            setError(null);
          } else {
            console.log('API returned error or no results:', status);
            setSuggestions([]);
            setShowSuggestions(false);
            
            // Handle specific API errors
            if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
              setError('API request denied - check your API key and restrictions');
            } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
              setError('API quota exceeded - too many requests');
            } else if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              setError(`API error: ${status}`);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error calling getPlacePredictions:', error);
      setIsLoading(false);
      setError('Failed to search addresses');
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((inputValue: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      searchPlaces(inputValue);
    }, 300);
  }, [searchPlaces]);

  // Handle input changes
  const handleInputChange = (inputValue: string) => {
    console.log('handleInputChange called with:', inputValue);
    console.log('isGoogleLoaded:', isGoogleLoaded);
    console.log('serviceRef.current:', serviceRef.current);
    
    onChange(inputValue);

    // Just check if we have the service, not the loading state
    if (!serviceRef.current) {
      console.log('Exiting early - service not available');
      return;
    }

    if (inputValue.length < 3) {
      console.log('Input too short, clearing suggestions');
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    console.log('Starting search for:', inputValue);
    setIsLoading(true);
    setError(null);
    debouncedSearch(inputValue);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: Suggestion) => {
    onChange(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsLoading(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        className={className}
        autoComplete="off"
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={cn(
            "absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                "text-sm text-gray-900 border-b border-gray-100 last:border-b-0",
                "transition-colors duration-150 ease-in-out"
              )}
            >
              {suggestion.description}
            </button>
          ))}
        </div>
      )}

      {/* Status messages */}
      {!isGoogleLoaded && value.length === 0 && !error && (
        <div className="text-xs text-blue-600 mt-1">
          Loading address autocomplete...
        </div>
      )}
      
      {error && (
        <div className="text-xs text-red-600 mt-1">
          {error}
        </div>
      )}

      {/* Success indicator */}
      {isGoogleLoaded && value.length === 0 && !error && (
        <div className="text-xs text-green-600 mt-1">
          Address autocomplete ready - type to search
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;