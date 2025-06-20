import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calculator, User, MapPin, DollarSign, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuoteFormProps {
  onClose: () => void;
  editingQuote?: any;
}

interface RoomData {
  [key: string]: {
    count: number;
    percentage: number;
    weight: number;
  };
}

interface QuoteFormData {
  client: string;
  contactPerson: string;
  email: string;
  propertyType: string;
  styling: string;
  propertyAddress: string;
  distanceFromWarehouse: number;
  listingPrice: number;
  accessDifficulty: string;
  roomRate: number;
  rooms: RoomData;
}

interface RateSettings {
  apartment_low_threshold: number;
  apartment_high_threshold: number;
  house_low_threshold: number;
  house_high_threshold: number;
  distance_close_threshold: number;
  distance_medium_min: number;
  distance_medium_max: number;
  distance_far_min: number;
  penalty_discount: number;
  reward_bonus: number;
  distance_close_discount: number;
  distance_medium_fee: number;
  distance_far_fee: number;
  access_standard_fee: number;
  access_difficult_fee: number;
  access_very_difficult_fee: number;
}

const QuoteForm = ({ onClose, editingQuote }: QuoteFormProps) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [rateSettings, setRateSettings] = useState<RateSettings | null>(null);
  const [roomSettings, setRoomSettings] = useState<any>(null);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(['Apartment', 'House']);
  const [stylingTypes, setStylingTypes] = useState<string[]>(['Full', 'Partial']);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [showClientSuggestions, setShowQuoteSuggestions] = useState(false);
  const { toast } = useToast();

  // Default room types with weights (fallback)
  const defaultRooms = {
    'Foyer/Entry': { count: 0, percentage: 100, weight: 0.5 },
    'Living Room': { count: 0, percentage: 100, weight: 2 },
    'Family Room/Lounge': { count: 0, percentage: 100, weight: 1.5 },
    'Dining Room': { count: 0, percentage: 100, weight: 1 },
    'Kitchen': { count: 0, percentage: 100, weight: 0.5 },
    'Master Bedroom': { count: 1, percentage: 100, weight: 1.5 },
    'Master Wardrobe': { count: 0, percentage: 100, weight: 0.5 },
    'Standard Bedroom': { count: 0, percentage: 100, weight: 1 },
    'Standard Bathroom': { count: 0, percentage: 100, weight: 0.25 },
    'Hallway': { count: 0, percentage: 100, weight: 0.5 },
    'Pantry': { count: 0, percentage: 100, weight: 0.25 },
    'Laundry': { count: 0, percentage: 100, weight: 0.25 },
    'Office': { count: 0, percentage: 100, weight: 1 },
    'Study': { count: 0, percentage: 100, weight: 1 },
    'Outdoor (large)': { count: 0, percentage: 100, weight: 1.5 },
    'Outdoor (small)': { count: 0, percentage: 100, weight: 0.5 },
  };

  const [formData, setFormData] = useState<QuoteFormData>({
    client: '',
    contactPerson: '',
    email: '',
    propertyType: '',
    styling: 'Full',
    propertyAddress: '',
    distanceFromWarehouse: 0,
    listingPrice: 0,
    accessDifficulty: '',
    roomRate: 400,
    rooms: defaultRooms,
  });

  const [calculations, setCalculations] = useState({
    equivalentRooms: 0,
    baseQuote: 0,
    variation: 0,
    finalQuote: 0,
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchSettings();
    fetchClients();
  }, []);

  // Load editing quote data
  useEffect(() => {
    if (editingQuote) {
      setFormData({
        client: editingQuote.clients?.name || '',
        contactPerson: editingQuote.clients?.contact_person || '',
        email: editingQuote.clients?.email || '',
        propertyType: editingQuote.property_type || '',
        styling: editingQuote.styling_type || '',
        propertyAddress: editingQuote.property_address || '',
        distanceFromWarehouse: editingQuote.distance_from_warehouse || 0,
        listingPrice: editingQuote.listing_price || 0,
        accessDifficulty: editingQuote.access_difficulty || '',
        roomRate: editingQuote.room_rate || 400,
        rooms: editingQuote.room_data || defaultRooms,
      });
    }
  }, [editingQuote]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      // Fetch rate settings
      const { data: rateData } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', 'rate_configuration')
        .single();

      if (rateData && typeof rateData.setting_value === 'object' && rateData.setting_value !== null) {
        setRateSettings(rateData.setting_value as unknown as RateSettings);
      }

      // Fetch room settings
      const { data: roomData } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', 'room_types')
        .single();

      if (roomData) {
        setRoomSettings(roomData.setting_value);
        // Update room weights and default counts from settings
        const updatedRooms = { ...formData.rooms };
        Object.entries(roomData.setting_value as any).forEach(([roomType, config]: [string, any]) => {
          if (updatedRooms[roomType]) {
            updatedRooms[roomType].weight = config.weight;
            updatedRooms[roomType].count = config.default_count;
          }
        });
        setFormData(prev => ({ ...prev, rooms: updatedRooms }));
      }

      // Fetch property types
      const { data: propertyData } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', 'property_types')
        .single();

      if (propertyData && propertyData.setting_value) {
        const settings = propertyData.setting_value as any;
        if (settings.property_types) setPropertyTypes(settings.property_types);
        if (settings.styling_options) setStylingTypes(settings.styling_options);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Set default access difficulty based on property type
  useEffect(() => {
    if (formData.propertyType === 'Apartment' && !formData.accessDifficulty) {
      setFormData(prev => ({ ...prev, accessDifficulty: 'Difficult' }));
    } else if (formData.propertyType === 'House' && !formData.accessDifficulty) {
      setFormData(prev => ({ ...prev, accessDifficulty: 'Easy' }));
    }
  }, [formData.propertyType]);

  // Calculate quote whenever relevant fields change
  useEffect(() => {
    calculateQuote();
  }, [formData.rooms, formData.roomRate, formData.listingPrice, formData.distanceFromWarehouse, formData.accessDifficulty, formData.propertyType, rateSettings]);

  const handleClientSearch = (value: string) => {
    setFormData(prev => ({ ...prev, client: value }));
    
    if (value.length > 0) {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(value.toLowerCase()) ||
        client.email.toLowerCase().includes(value.toLowerCase())
      );
      setClientSuggestions(filtered);
      setShowQuoteSuggestions(true);
    } else {
      setShowQuoteSuggestions(false);
    }
  };

  const selectClient = (client: any) => {
    setFormData(prev => ({
      ...prev,
      client: client.name,
      email: client.email,
      contactPerson: client.contact_person || ''
    }));
    setShowQuoteSuggestions(false);
  };

  const calculateQuote = () => {
    // Calculate equivalent room count
    const equivalentRooms = Object.values(formData.rooms).reduce((total, room) => {
      return total + (room.count * (room.percentage / 100) * room.weight);
    }, 0);

    // Calculate base quote
    const baseQuote = equivalentRooms * formData.roomRate;

    // Calculate penalty/reward rates using flexible rate settings
    let totalRate = 0;
    
    if (rateSettings) {
      // Check if we have the new flexible rate structure
      const flexibleRates = rateSettings as any;
      
      if (flexibleRates.apartment_ranges || flexibleRates.house_ranges) {
        // Use new flexible rate system
        const propertyRanges = formData.propertyType === 'Apartment' 
          ? flexibleRates.apartment_ranges 
          : flexibleRates.house_ranges;
        
        if (propertyRanges) {
          for (const range of propertyRanges) {
            if (formData.listingPrice >= range.min && formData.listingPrice < range.max) {
              totalRate += range.rate;
              break;
            }
          }
        }

        // Distance rates
        if (flexibleRates.distance_ranges) {
          for (const range of flexibleRates.distance_ranges) {
            if (formData.distanceFromWarehouse >= range.min && formData.distanceFromWarehouse < range.max) {
              totalRate += range.rate;
              break;
            }
          }
        }

        // Access difficulty rates
        if (flexibleRates.access_difficulty_rates && formData.accessDifficulty) {
          const difficultyRate = flexibleRates.access_difficulty_rates[formData.accessDifficulty];
          if (difficultyRate !== undefined) {
            totalRate += difficultyRate;
          }
        }
      } else {
        // Fallback to old rate system for backward compatibility
        const settings = rateSettings as RateSettings;
        
        // Listing price rates
        if (formData.propertyType === 'Apartment') {
          if (formData.listingPrice < settings.apartment_low_threshold) totalRate -= settings.penalty_discount;
          else if (formData.listingPrice > settings.apartment_high_threshold) totalRate += settings.reward_bonus;
        } else if (formData.propertyType === 'House') {
          if (formData.listingPrice < settings.house_low_threshold) totalRate -= settings.penalty_discount;
          else if (formData.listingPrice > settings.house_high_threshold) totalRate += settings.reward_bonus;
        }

        // Distance rates
        if (formData.distanceFromWarehouse < settings.distance_close_threshold) {
          totalRate -= settings.distance_close_discount;
        } else if (formData.distanceFromWarehouse >= settings.distance_medium_min && formData.distanceFromWarehouse < settings.distance_medium_max) {
          totalRate += settings.distance_medium_fee;
        } else if (formData.distanceFromWarehouse >= settings.distance_far_min) {
          totalRate += settings.distance_far_fee;
        }

        // Access difficulty rates
        switch (formData.accessDifficulty) {
          case 'Standard': totalRate += settings.access_standard_fee; break;
          case 'Difficult': totalRate += settings.access_difficult_fee; break;
          case 'Very Difficult': totalRate += settings.access_very_difficult_fee; break;
        }
      }
    }

    // Calculate variation and final quote
    const variation = totalRate * baseQuote;
    const finalQuote = baseQuote + variation;

    setCalculations({
      equivalentRooms: Math.round(equivalentRooms * 100) / 100,
      baseQuote: Math.round(baseQuote),
      variation: Math.round(variation),
      finalQuote: Math.round(finalQuote),
    });
  };

  const updateRoomData = (roomType: string, field: 'count' | 'percentage', value: number) => {
    setFormData(prev => ({
      ...prev,
      rooms: {
        ...prev.rooms,
        [roomType]: {
          ...prev.rooms[roomType],
          [field]: value,
        },
      },
    }));
  };

  // Enhanced quote number generation with retry logic
  const generateQuoteNumberWithRetry = async (maxRetries = 3): Promise<string> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to generate quote number, attempt ${attempt}/${maxRetries}`);
        
        const { data: quoteNumber, error } = await supabase
          .rpc('generate_quote_number');

        if (error) {
          console.error(`Quote number generation error (attempt ${attempt}):`, error);
          if (attempt === maxRetries) throw error;
        } else {
          console.log(`Quote number generated successfully: ${quoteNumber}`);
          return quoteNumber;
        }
      } catch (error) {
        console.error(`Quote number generation failed (attempt ${attempt}):`, error);
        if (attempt === maxRetries) throw error;
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
    
    throw new Error('Failed to generate quote number after maximum retries');
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create a quote",
        variant: "destructive",
      });
      return;
    }

    if (!formData.client || !formData.email || !formData.propertyAddress) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // First, check if client exists or create new one
      let clientId;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingClient) {
        clientId = existingClient.id;
        // Update client info if needed
        await supabase
          .from('clients')
          .update({
            name: formData.client,
            contact_person: formData.contactPerson,
          })
          .eq('id', clientId);
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: formData.client,
            email: formData.email,
            contact_person: formData.contactPerson,
          })
          .select('id')
          .single();

        if (clientError) {
          console.error('Error creating client:', clientError);
          toast({
            title: "Error",
            description: "Failed to create client record",
            variant: "destructive",
          });
          return;
        }
        clientId = newClient.id;
      }

      const isAdmin = currentUser?.role === 'admin';

      // For regular users, set default values for hidden fields
      const quoteData = {
        user_id: currentUser.id,
        client_id: clientId,
        property_type: formData.propertyType,
        styling_type: formData.styling,
        property_address: formData.propertyAddress,
        distance_from_warehouse: isAdmin ? formData.distanceFromWarehouse : 0,
        listing_price: isAdmin ? formData.listingPrice : 0,
        access_difficulty: formData.accessDifficulty,
        room_rate: isAdmin ? formData.roomRate : 400,
        room_data: formData.rooms,
        equivalent_room_count: calculations.equivalentRooms,
        base_quote: calculations.baseQuote,
        variation: calculations.variation,
        final_quote: calculations.finalQuote,
        status: 'pending',
      };

      if (editingQuote) {
        // Update existing quote
        const { error: quoteError } = await supabase
          .from('quotes')
          .update({
            ...quoteData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingQuote.id);

        if (quoteError) {
          console.error('Error updating quote:', quoteError);
          toast({
            title: "Error",
            description: "Failed to update quote",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: `Quote ${editingQuote.quote_number} updated successfully!`,
        });
      } else {
        // Generate quote number with retry logic
        let quoteNumber;
        try {
          quoteNumber = await generateQuoteNumberWithRetry();
        } catch (error) {
          console.error('Failed to generate quote number:', error);
          toast({
            title: "Error",
            description: "Failed to generate quote number. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Create new quote record with retry logic for duplicate prevention
        let success = false;
        for (let attempt = 1; attempt <= 3 && !success; attempt++) {
          try {
            console.log(`Attempting to create quote, attempt ${attempt}/3`);
            
            const { error: quoteError } = await supabase
              .from('quotes')
              .insert({
                quote_number: quoteNumber,
                ...quoteData
              });

            if (quoteError) {
              if (quoteError.code === '23505' && quoteError.message.includes('quotes_quote_number_key')) {
                console.log(`Quote number ${quoteNumber} already exists, regenerating...`);
                // Generate a new quote number and try again
                quoteNumber = await generateQuoteNumberWithRetry();
              } else {
                throw quoteError;
              }
            } else {
              success = true;
              console.log(`Quote created successfully with number: ${quoteNumber}`);
            }
          } catch (error) {
            console.error(`Quote creation error (attempt ${attempt}):`, error);
            if (attempt === 3) throw error;
          }
        }

        if (!success) {
          toast({
            title: "Error",
            description: "Failed to save quote after multiple attempts. Please try again.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: `Quote ${quoteNumber} created successfully!`,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Client Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Label htmlFor="client">Client Name *</Label>
              <Input
                id="client"
                placeholder="Search or enter client name..."
                value={formData.client}
                onChange={(e) => handleClientSearch(e.target.value)}
                onFocus={() => {
                  if (formData.client.length > 0) setShowQuoteSuggestions(true);
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow clicking
                  setTimeout(() => setShowQuoteSuggestions(false), 200);
                }}
              />
              {showClientSuggestions && clientSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {clientSuggestions.map((client) => (
                    <div
                      key={client.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => selectClient(client)}
                    >
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-gray-500">{client.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="contact">Contact Person</Label>
              <Input
                id="contact"
                placeholder="Contact person name"
                value={formData.contactPerson}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Property Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            Property Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select value={formData.propertyType} onValueChange={(value) => setFormData(prev => ({ ...prev, propertyType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="styling">Styling Type</Label>
              <Select value={formData.styling} onValueChange={(value) => setFormData(prev => ({ ...prev, styling: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stylingTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="address">Property Address *</Label>
            <Input
              id="address"
              placeholder="123 Main Street, City, State"
              value={formData.propertyAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, propertyAddress: e.target.value }))}
            />
          </div>
          {isAdmin && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="distance">Distance from Warehouse (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    min="0"
                    value={formData.distanceFromWarehouse}
                    onChange={(e) => setFormData(prev => ({ ...prev, distanceFromWarehouse: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="listingPrice">Listing Price ($)</Label>
                  <Input
                    id="listingPrice"
                    type="number"
                    min="0"
                    value={formData.listingPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, listingPrice: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </>
          )}
          <div>
            <Label htmlFor="accessDifficulty">Access Difficulty</Label>
            <Select value={formData.accessDifficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, accessDifficulty: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select access difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Difficult">Difficult</SelectItem>
                <SelectItem value="Very Difficult">Very Difficult</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Room Configuration */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Room Configuration
          </CardTitle>
          {isAdmin && (
            <div className="mt-4">
              <Label htmlFor="roomRate">Room Rate ($)</Label>
              <Input
                id="roomRate"
                type="number"
                min="0"
                value={formData.roomRate}
                onChange={(e) => setFormData(prev => ({ ...prev, roomRate: Number(e.target.value) }))}
                className="w-48"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(formData.rooms).map(([roomType, roomData]) => (
              <div key={roomType} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center">
                  <span className="font-medium text-sm">{roomType}</span>
                  <span className="ml-2 text-xs text-slate-500">(Weight: {roomData.weight})</span>
                </div>
                <div>
                  <Label htmlFor={`${roomType}-count`} className="text-xs">Count</Label>
                  <Input
                    id={`${roomType}-count`}
                    type="number"
                    min="0"
                    value={roomData.count}
                    onChange={(e) => updateRoomData(roomType, 'count', Number(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor={`${roomType}-percentage`} className="text-xs">Percentage (%)</Label>
                  <Input
                    id={`${roomType}-percentage`}
                    type="number"
                    min="0"
                    max="100"
                    value={roomData.percentage}
                    onChange={(e) => updateRoomData(roomType, 'percentage', Number(e.target.value))}
                    className="h-8"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quote Summary - Only show final quote for admin users */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Quote Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Equivalent Room Count</div>
              <div className="text-2xl font-bold text-blue-700">{calculations.equivalentRooms}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Base Quote</div>
              <div className="text-2xl font-bold text-green-700">${calculations.baseQuote.toLocaleString()}</div>
            </div>
          </div>
          {isAdmin && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">Variation</div>
                  <div className="text-2xl font-bold text-orange-700">
                    {calculations.variation >= 0 ? '+' : ''}${calculations.variation.toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Final Quote</div>
                  <div className="text-2xl font-bold text-purple-700">${calculations.finalQuote.toLocaleString()}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {submitting ? 'Saving...' : editingQuote ? 'Update Quote' : 'Generate Quote'}
        </Button>
      </div>
    </div>
  );
};

export default QuoteForm;
