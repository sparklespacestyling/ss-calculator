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

const QuoteForm = ({ onClose }: QuoteFormProps) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [rateSettings, setRateSettings] = useState<RateSettings | null>(null);
  const [roomSettings, setRoomSettings] = useState<any>(null);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(['Apartment', 'House']);
  const [stylingTypes, setStylingTypes] = useState<string[]>(['Full', 'Partial']);
  const [submitting, setSubmitting] = useState(false);
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
  }, []);

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

      // Generate quote number
      const { data: quoteNumber, error: quoteNumError } = await supabase
        .rpc('generate_quote_number');

      if (quoteNumError) {
        console.error('Error generating quote number:', quoteNumError);
        toast({
          title: "Error",
          description: "Failed to generate quote number",
          variant: "destructive",
        });
        return;
      }

      // Create quote record
      const { error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_number: quoteNumber,
          user_id: currentUser.id,
          client_id: clientId,
          property_type: formData.propertyType,
          styling_type: formData.styling,
          property_address: formData.propertyAddress,
          distance_from_warehouse: formData.distanceFromWarehouse,
          listing_price: formData.listingPrice,
          access_difficulty: formData.accessDifficulty,
          room_rate: formData.roomRate,
          room_data: formData.rooms,
          equivalent_room_count: calculations.equivalentRooms,
          base_quote: calculations.baseQuote,
          variation: calculations.variation,
          final_quote: calculations.finalQuote,
          status: 'pending',
        });

      if (quoteError) {
        console.error('Error creating quote:', quoteError);
        toast({
          title: "Error",
          description: "Failed to save quote",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Quote ${quoteNumber} created successfully!`,
      });

      onClose();
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
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
            <div>
              <Label htmlFor="client">Client Name *</Label>
              <Input
                id="client"
                placeholder="Search or enter client name..."
                value={formData.client}
                onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
              />
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
            Property Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select 
                value={formData.propertyType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, propertyType: value }))}
              >
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
              <Label htmlFor="styling">Styling Type *</Label>
              <Select 
                value={formData.styling} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, styling: value }))}
              >
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
              placeholder="Enter property address"
              value={formData.propertyAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, propertyAddress: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="distance">Distance from Warehouse (km) *</Label>
              <Input
                id="distance"
                type="number"
                min="0"
                step="0.1"
                value={formData.distanceFromWarehouse || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, distanceFromWarehouse: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="listingPrice">Listing Price *</Label>
              <Input
                id="listingPrice"
                type="number"
                min="0"
                placeholder="800000"
                value={formData.listingPrice || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, listingPrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="accessDifficulty">Access Difficulty *</Label>
              <Select 
                value={formData.accessDifficulty} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, accessDifficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Difficult">Difficult</SelectItem>
                  <SelectItem value="Very Difficult">Very Difficult</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="roomRate">Room Rate</Label>
            <Input
              id="roomRate"
              type="number"
              min="0"
              value={formData.roomRate}
              onChange={(e) => setFormData(prev => ({ ...prev, roomRate: parseFloat(e.target.value) || 400 }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Room Configuration */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Room Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-slate-600 pb-2 border-b">
              <div className="col-span-5">Room Type</div>
              <div className="col-span-3 text-center">Count</div>
              <div className="col-span-3 text-center">Item Qty %</div>
              {isAdmin && <div className="col-span-1 text-center">Weight</div>}
            </div>

            {Object.entries(formData.rooms).map(([roomType, room]) => (
              <div key={roomType} className="grid grid-cols-12 gap-2 items-center py-1">
                <div className="col-span-5 text-sm font-medium text-slate-700">
                  {roomType}
                  {roomType === 'Master Bedroom' && <span className="text-red-500 ml-1">*</span>}
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min="0"
                    value={room.count}
                    onChange={(e) => updateRoomData(roomType, 'count', parseInt(e.target.value) || 0)}
                    className="text-center h-8"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={room.percentage}
                    onChange={(e) => updateRoomData(roomType, 'percentage', parseInt(e.target.value) || 100)}
                    className="text-center h-8"
                  />
                </div>
                {isAdmin && (
                  <div className="col-span-1 text-center text-sm text-slate-600">
                    {room.weight}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calculations */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Quote Calculation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAdmin && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Equivalent Room Count:</span>
                <span className="text-sm font-semibold text-slate-900">{calculations.equivalentRooms}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Base Quote:</span>
                <span className="text-sm font-semibold text-slate-900">${calculations.baseQuote.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Variation:</span>
                <span className={`text-sm font-semibold ${calculations.variation >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {calculations.variation >= 0 ? '+' : ''}${calculations.variation.toLocaleString()}
                </span>
              </div>
              <Separator />
            </>
          )}
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-900">Final Quote:</span>
            <span className="text-2xl font-bold text-blue-600">${calculations.finalQuote.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={submitting}>
          {submitting ? 'Saving...' : 'Generate Quote'}
        </Button>
      </div>
    </div>
  );
};

export { QuoteForm };
