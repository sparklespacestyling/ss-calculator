import { useState, useEffect, useRef } from 'react';
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

  // Initialize Google Places API using the modern approach
  useEffect(() => {
    const initializeGoogle = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      
      
      if (!apiKey) {
        console.warn('Google Places API key not found. Address autocomplete will be disabled.');
        setError('Google Places API key not configured');
        return;
      }

      try {
        // Use the new importLibrary approach
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
        script.async = true;
        
        script.onload = async () => {
          
          try {
            // Wait for google object to be available
            if (typeof window.google === 'undefined') {
              await new Promise((resolve) => {
                const checkGoogle = () => {
                  if (typeof window.google !== 'undefined') {
                    resolve(true);
                  } else {
                    setTimeout(checkGoogle, 100);
                  }
                };
                checkGoogle();
              });
            }
            
            setIsGoogleLoaded(true);
            setError(null);
          } catch (err) {
            console.error('Error initializing Google Places:', err);
            setError('Failed to initialize Google Places API');
          }
        };
        
        script.onerror = () => {
          console.error('Failed to load Google Maps script');
          setError('Failed to load Google Maps script');
        };
        
        document.head.appendChild(script);
        
      } catch (error) {
        console.error('Error loading Google Places API:', error);
        setError(error instanceof Error ? error.message : 'Failed to load Google Places API');
      }
    };

    initializeGoogle();
  }, []);

  const searchPlaces = async (inputValue: string) => {
    
    if (!isGoogleLoaded || !window.google?.maps?.places || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    
    try {
      // Use the modern Autocomplete approach
      const service = new window.google.maps.places.AutocompleteService();
      
      const request = {
        input: inputValue,
        componentRestrictions: { country: 'au' },
        types: ['address']
      };


      service.getPlacePredictions(request, (predictions, status) => {
        
        setIsLoading(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const formattedSuggestions = predictions.map(prediction => ({
            place_id: prediction.place_id,
            description: prediction.description,
          }));
          setSuggestions(formattedSuggestions);
          setShowSuggestions(true);
          setError(null);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          
          if (status === window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
            setError('API request denied - check your API key');
          } else if (status === window.google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
            setError('API quota exceeded');
          } else if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setError(`API error: ${status}`);
          }
        }
      });
    } catch (error) {
      console.error('Error calling Places API:', error);
      setIsLoading(false);
      setError('Failed to search addresses');
    }
  };

  // Debounced search
  const debouncedSearch = (inputValue: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      searchPlaces(inputValue);
    }, 300);
  };

  // Handle input changes
  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);

    if (!isGoogleLoaded) {
      return;
    }

    if (inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

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

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

      {isGoogleLoaded && value.length === 0 && !error && (
        <div className="text-xs text-green-600 mt-1">
          Address autocomplete ready - type to search
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;