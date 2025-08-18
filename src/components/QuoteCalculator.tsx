import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calculator, Home, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RoomData {
  [key: string]: {
    count: number;
    percentage: number;
    weight: number;
  };
}

interface CalculatorFormData {
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

const QuoteCalculator = () => {
  const [currentUser, setCurrentUser] = useState<{role?: string} | null>(null);
  const [rateSettings, setRateSettings] = useState<RateSettings | null>(null);
  const [roomSettings, setRoomSettings] = useState<Record<string, {weight: number; default_count: number}> | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(['Apartment', 'House']);
  const [stylingTypes, setStylingTypes] = useState<string[]>(['Full', 'Partial']);

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

  const [formData, setFormData] = useState<CalculatorFormData>({
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

  const [isRoomRateCustomized, setIsRoomRateCustomized] = useState(false);
  const [isAccessDifficultyCustomized, setIsAccessDifficultyCustomized] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
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
        Object.entries(roomData.setting_value as Record<string, {weight: number; default_count: number}>).forEach(([roomType, config]) => {
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
        const settings = propertyData.setting_value as {property_types?: string[]; styling_options?: string[]};
        if (settings.property_types) setPropertyTypes(settings.property_types);
        if (settings.styling_options) setStylingTypes(settings.styling_options);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchSettings();
  }, [fetchCurrentUser, fetchSettings]);

  // Auto-adjust access difficulty based on property type
  useEffect(() => {
    if (!isAccessDifficultyCustomized && formData.propertyType) {
      const newAccessDifficulty = formData.propertyType === 'Apartment' ? 'Difficult' : 'Easy';
      if (formData.accessDifficulty !== newAccessDifficulty) {
        setFormData(prev => ({ ...prev, accessDifficulty: newAccessDifficulty }));
      }
    }
  }, [formData.propertyType, isAccessDifficultyCustomized, formData.accessDifficulty]);

  // Auto-adjust room rate based on property type
  useEffect(() => {
    if (!isRoomRateCustomized && formData.propertyType) {
      const newRoomRate = formData.propertyType === 'Apartment' ? 350 : 400;
      if (formData.roomRate !== newRoomRate) {
        setFormData(prev => ({ ...prev, roomRate: newRoomRate }));
      }
    }
  }, [formData.propertyType, isRoomRateCustomized, formData.roomRate]);

  const calculateQuote = useCallback(() => {
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
      const flexibleRates = rateSettings as RateSettings & {
        apartment_ranges?: Array<{min: number; max: number; rate: number}>;
        house_ranges?: Array<{min: number; max: number; rate: number}>;
        distance_ranges?: Array<{min: number; max: number; rate: number}>;
        access_difficulty_rates?: Record<string, number>;
      };
      
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
  }, [formData.rooms, formData.roomRate, formData.listingPrice, formData.distanceFromWarehouse, formData.accessDifficulty, formData.propertyType, rateSettings]);

  // Calculate quote whenever relevant fields change
  useEffect(() => {
    calculateQuote();
  }, [calculateQuote]);

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 0.5in;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .calculator-inputs {
            display: none !important;
          }
          header {
            display: none !important;
          }
          main > div > div:first-child {
            display: none !important;
          }
          body {
            font-size: 10pt;
            line-height: 1.2;
            overflow: hidden;
          }
          .print-container {
            max-height: 9.5in;
            overflow: hidden;
            font-size: clamp(10pt, 2vw, 14pt);
          }
          .print-header {
            text-align: center;
            margin-bottom: 20px;
          }
          .print-section {
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .print-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 20px;
            margin-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            font-size: inherit;
            align-items: center;
          }
          .print-total {
            font-weight: bold;
            font-size: calc(1em + 2pt);
            border-top: 2px solid #334155;
            padding-top: 8px;
            margin-top: 15px;
          }
          h1, h2, h3 {
            margin-top: 0;
            margin-bottom: 8px;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
      <div className="space-y-6">
      {/* Print Header - only visible when printing */}
      <div className="print-only print-container">
        <div className="print-header">
          <h1 style={{fontSize: 'calc(1em + 4pt)', fontWeight: 'bold', marginBottom: '8px'}}>Sparkle Space</h1>
          <h2 style={{fontSize: 'calc(1em + 2pt)', marginBottom: '15px'}}>Property Styling Quote</h2>
        </div>
        
        <div className="print-section">
          <h3 style={{fontSize: 'calc(1em + 1pt)', fontWeight: 'bold', marginBottom: '8px'}}>Property Details</h3>
          <div className="print-row">
            <span>Property Type:</span>
            <span>{formData.propertyType}</span>
          </div>
          <div className="print-row">
            <span>Styling Type:</span>
            <span>{formData.styling}</span>
          </div>
          {formData.propertyAddress && (
            <div className="print-row">
              <span>Property Address:</span>
              <span>{formData.propertyAddress}</span>
            </div>
          )}
          <div className="print-row">
            <span>Distance from Warehouse:</span>
            <span>{formData.distanceFromWarehouse} km</span>
          </div>
          <div className="print-row">
            <span>Listing Price:</span>
            <span>${formData.listingPrice.toLocaleString()}</span>
          </div>
          <div className="print-row">
            <span>Access Difficulty:</span>
            <span>{formData.accessDifficulty}</span>
          </div>
          <div className="print-row">
            <span>Room Rate:</span>
            <span>${formData.roomRate}</span>
          </div>
        </div>

        <div className="print-section">
          <h3 style={{fontSize: 'calc(1em + 1pt)', fontWeight: 'bold', marginBottom: '8px'}}>Room Breakdown</h3>
          {Object.entries(formData.rooms)
            .filter(([, room]) => room.count > 0)
            .map(([roomType, room]) => {
              const roomTotal = room.count * (room.percentage / 100) * room.weight * formData.roomRate;
              return (
                <div key={roomType} className="print-row">
                  <span>{roomType} ({room.count} × {room.percentage}%)</span>
                  <span>${Math.round(roomTotal).toLocaleString()}</span>
                </div>
              );
            })}
        </div>

        <div className="print-section">
          <h3 style={{fontSize: 'calc(1em + 1pt)', fontWeight: 'bold', marginBottom: '8px'}}>Quote Summary</h3>
          <div className="print-row">
            <span>Equivalent Room Count:</span>
            <span>{calculations.equivalentRooms}</span>
          </div>
          <div className="print-row">
            <span>Base Quote:</span>
            <span>${calculations.baseQuote.toLocaleString()}</span>
          </div>
          <div className="print-row">
            <span>Variation:</span>
            <span style={{color: calculations.variation >= 0 ? '#dc2626' : '#16a34a'}}>
              {calculations.variation >= 0 ? '+' : ''}${calculations.variation.toLocaleString()}
            </span>
          </div>
          <div className="print-total print-row">
            <span>Final Quote:</span>
            <span>${calculations.finalQuote.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Property Information */}
      <Card className="border-0 shadow-sm calculator-inputs">
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
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, propertyType: value }));
                  setIsRoomRateCustomized(false);
                  setIsAccessDifficultyCustomized(false);
                }}
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
            <Label htmlFor="address">Property Address</Label>
            <Input
              id="address"
              placeholder="Enter property address"
              value={formData.propertyAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, propertyAddress: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="distance">Distance from Warehouse (km)</Label>
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
              <Label htmlFor="listingPrice">Listing Price</Label>
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
              <Label htmlFor="accessDifficulty">Access Difficulty</Label>
              <Select 
                value={formData.accessDifficulty} 
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, accessDifficulty: value }));
                  setIsAccessDifficultyCustomized(true);
                }}
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
              onChange={(e) => {
                setFormData(prev => ({ ...prev, roomRate: parseFloat(e.target.value) || 400 }));
                setIsRoomRateCustomized(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Room Configuration */}
      <Card className="border-0 shadow-sm calculator-inputs">
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
              <div className="col-span-1 text-center">Weight</div>
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
                <div className="col-span-1 text-center text-sm text-slate-600">
                  {room.weight}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calculations */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 calculator-inputs">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Quote Calculation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-900">Final Quote:</span>
            <span className="text-2xl font-bold text-blue-600">${calculations.finalQuote.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Print Button */}
      <div className="text-center no-print">
        <Button 
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Quote
        </Button>
      </div>
      </div>
    </>
  );
};

export default QuoteCalculator;