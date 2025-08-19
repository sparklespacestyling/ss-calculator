import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calculator, Home, Printer, Plus, X, MapPin, RefreshCw } from 'lucide-react';
import AddressAutocomplete from '@/components/ui/address-autocomplete-modern';
import logoHeader from '/sparkle-space-logo-header.png';

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

interface PriceRange {
  maxPrice: number;
  rate: number;
}

interface DistanceRange {
  maxDistance: number;
  rate: number;
}

interface RateSettings {
  apartmentPriceRanges: PriceRange[];
  housePriceRanges: PriceRange[];
  distanceRanges: DistanceRange[];
  accessDifficultyRates: {
    [key: string]: number;
  };
}

// Static configuration - no database required
const staticRateSettings: RateSettings = {
  apartmentPriceRanges: [
    { maxPrice: 600000, rate: -0.1 },   // <$600k: -10%
    { maxPrice: 800000, rate: -0.05 },  // <$800k: -5%
    { maxPrice: 1000000, rate: 0 },     // <$1000k: 0%
    { maxPrice: Infinity, rate: 0 },    // $1000k+: 0%
  ],
  housePriceRanges: [
    { maxPrice: 1500000, rate: -0.1 },  // <$1500k: -10%
    { maxPrice: 2000000, rate: -0.05 }, // <$2000k: -5%
    { maxPrice: 3000000, rate: 0 },     // <$3000k: 0%
    { maxPrice: 5000000, rate: 0.05 },  // <$5000k: +5%
    { maxPrice: 7000000, rate: 0.1 },   // <$7000k: +10%
    { maxPrice: 10000000, rate: 0.2 },  // <$10000k: +20%
    { maxPrice: Infinity, rate: 0.2 },  // $10000k+: +20%
  ],
  distanceRanges: [
    { maxDistance: 15, rate: 0 },       // <15km: 0%
    { maxDistance: 30, rate: 0.05 },    // <30km: +5%
    { maxDistance: 50, rate: 0.1 },     // <50km: +10%
    { maxDistance: 80, rate: 0.25 },    // <80km: +25%
    { maxDistance: Infinity, rate: 0.25 }, // 80km+: +25%
  ],
  accessDifficultyRates: {
    'Easy': 0,      // 0%
    'Standard': 0.05, // +5%
    'Difficult': 0.1, // +10%
  },
};

const staticPropertyTypes = ['Apartment', 'House'];
const staticStylingTypes = ['Full', 'Partial'];

const QuoteCalculator = () => {
  // Use static configuration instead of database state
  const propertyTypes = staticPropertyTypes;
  const stylingTypes = staticStylingTypes;

  // Core room types (always visible)
  const coreRooms = {
    'Living Room': { count: 1, percentage: 100, weight: 2 },
    'Dining Room': { count: 1, percentage: 100, weight: 1 },
    'Kitchen': { count: 1, percentage: 100, weight: 0.5 },
    'Master Bedroom': { count: 1, percentage: 100, weight: 1.5 },
    'Master Wardrobe': { count: 0, percentage: 100, weight: 0.5 },
    'Standard Bedroom': { count: 0, percentage: 100, weight: 1 },
    'Standard Bathroom': { count: 0, percentage: 100, weight: 0.25 },
    'Outdoor (large)': { count: 0, percentage: 100, weight: 1.5 },
    'Outdoor (small)': { count: 0, percentage: 100, weight: 0.5 },
  };

  // Optional room types (hidden by default)
  const optionalRooms = {
    'Foyer/Entry': { count: 0, percentage: 100, weight: 0.5 },
    'Family Room/Lounge': { count: 0, percentage: 100, weight: 1.5 },
    'Hallway': { count: 0, percentage: 100, weight: 0.5 },
    'Pantry': { count: 0, percentage: 100, weight: 0.25 },
    'Laundry': { count: 0, percentage: 100, weight: 0.25 },
    'Office': { count: 0, percentage: 100, weight: 1 },
    'Study': { count: 0, percentage: 100, weight: 1 },
  };

  // Combine all rooms
  const allRooms = { ...coreRooms, ...optionalRooms };

  const [formData, setFormData] = useState<CalculatorFormData>({
    propertyType: '',
    styling: 'Full',
    propertyAddress: '',
    distanceFromWarehouse: 0,
    listingPrice: 0,
    accessDifficulty: '',
    roomRate: 400,
    rooms: allRooms,
  });

  const [calculations, setCalculations] = useState({
    equivalentRooms: 0,
    baseQuote: 0,
    variation: 0,
    finalQuote: 0,
  });

  const [isRoomRateCustomized, setIsRoomRateCustomized] = useState(false);
  const [isAccessDifficultyCustomized, setIsAccessDifficultyCustomized] = useState(false);
  const [hiddenRooms, setHiddenRooms] = useState<Set<string>>(new Set(Object.keys(optionalRooms)));
  const [isDistanceLoading, setIsDistanceLoading] = useState(false);
  const [isDistanceAutoCalculated, setIsDistanceAutoCalculated] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [lastCalculatedAddress, setLastCalculatedAddress] = useState<string>('');
  const [isListingPriceCustomized, setIsListingPriceCustomized] = useState(false);


  // Auto-adjust access difficulty, listing price, and Master Wardrobe based on property type
  useEffect(() => {
    if (!isAccessDifficultyCustomized && formData.propertyType) {
      const newAccessDifficulty = formData.propertyType === 'Apartment' ? 'Difficult' : 'Standard';
      if (formData.accessDifficulty !== newAccessDifficulty) {
        setFormData(prev => ({ ...prev, accessDifficulty: newAccessDifficulty }));
      }
    }
    
    // Auto-adjust listing price based on property type
    if (!isListingPriceCustomized && formData.propertyType) {
      const newListingPrice = formData.propertyType === 'Apartment' ? 800000 : 2000000;
      if (formData.listingPrice !== newListingPrice) {
        setFormData(prev => ({ ...prev, listingPrice: newListingPrice }));
      }
    }
    
    // Reset Master Wardrobe count when switching to Apartment
    if (formData.propertyType === 'Apartment' && formData.rooms['Master Wardrobe']?.count > 0) {
      setFormData(prev => ({
        ...prev,
        rooms: {
          ...prev.rooms,
          'Master Wardrobe': { ...prev.rooms['Master Wardrobe'], count: 0 }
        }
      }));
    }
  }, [formData.propertyType, isAccessDifficultyCustomized, formData.accessDifficulty, formData.rooms, isListingPriceCustomized, formData.listingPrice]);

  // Auto-adjust room rate based on property type
  useEffect(() => {
    if (!isRoomRateCustomized && formData.propertyType) {
      const newRoomRate = formData.propertyType === 'Apartment' ? 350 : 400;
      if (formData.roomRate !== newRoomRate) {
        setFormData(prev => ({ ...prev, roomRate: newRoomRate }));
      }
    }
  }, [formData.propertyType, isRoomRateCustomized, formData.roomRate]);

  // Calculate distance between warehouse and property address
  const calculateDistance = useCallback(async (propertyAddress: string) => {
    if (!propertyAddress || propertyAddress.length < 10) {
      return;
    }

    // Don't recalculate if it's the same address
    if (propertyAddress === lastCalculatedAddress) {
      return;
    }

    const warehouseAddress = "2/67 Mons Street, Lidcombe NSW 2141 Australia";
    
    try {
      setIsDistanceLoading(true);
      setDistanceError(null);

      // Wait for Google Maps to be loaded (should already be loaded by address autocomplete)
      if (!window.google?.maps?.DistanceMatrixService) {
        // Wait for the address autocomplete component to load Google Maps
        let attempts = 0;
        const maxAttempts = 50; // Wait up to 5 seconds
        
        while (!window.google?.maps?.DistanceMatrixService && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.google?.maps?.DistanceMatrixService) {
          throw new Error('Google Maps Distance Matrix service not available - address autocomplete may not be ready');
        }
      }

      const service = new window.google.maps.DistanceMatrixService();
      
      return new Promise<void>((resolve, reject) => {
        service.getDistanceMatrix(
          {
            origins: [warehouseAddress],
            destinations: [propertyAddress],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false,
          },
          (response, status) => {
            setIsDistanceLoading(false);
            
            if (status === window.google.maps.DistanceMatrixStatus.OK && response) {
              const element = response.rows[0]?.elements[0];
              
              if (element?.status === 'OK' && element.distance) {
                // Convert meters to kilometers and round to 2 decimal places
                const distanceKm = Math.round((element.distance.value / 1000) * 100) / 100;
                
                setFormData(prev => ({ ...prev, distanceFromWarehouse: distanceKm }));
                setIsDistanceAutoCalculated(true);
                setDistanceError(null);
                setLastCalculatedAddress(propertyAddress);
                resolve();
              } else {
                throw new Error('Could not calculate distance for this address');
              }
            } else {
              throw new Error(`Distance calculation failed: ${status}`);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error calculating distance:', error);
      setIsDistanceLoading(false);
      setDistanceError(error instanceof Error ? error.message : 'Failed to calculate distance');
      // Don't reset the distance field, let user enter manually
    }
  }, [lastCalculatedAddress]);

  // Auto-calculate distance when property address changes
  useEffect(() => {
    if (formData.propertyAddress && !isDistanceLoading) {
      // More lenient validation - just check for some basic address characteristics
      const looksLikeAddress = formData.propertyAddress.length > 15 && 
                              (/\d/.test(formData.propertyAddress) || formData.propertyAddress.includes(','));
      
      if (looksLikeAddress && formData.propertyAddress !== lastCalculatedAddress) {
        // Debounce the calculation
        const timeoutId = setTimeout(() => {
          calculateDistance(formData.propertyAddress);
        }, 1500); // Wait 1.5 seconds after user stops typing

        return () => clearTimeout(timeoutId);
      }
    }
  }, [formData.propertyAddress, calculateDistance, isDistanceLoading, lastCalculatedAddress]);

  const calculateQuote = useCallback(() => {
    // Calculate equivalent room count
    const equivalentRooms = Object.values(formData.rooms).reduce((total, room) => {
      return total + (room.count * (room.percentage / 100) * room.weight);
    }, 0);

    // Calculate base quote
    const baseQuote = equivalentRooms * formData.roomRate;

    // Calculate penalty/reward rates using static configuration
    let totalRate = 0;
    const settings = staticRateSettings;
    
    // Listing price rates
    if (formData.propertyType === 'Apartment') {
      const priceRange = settings.apartmentPriceRanges.find(range => formData.listingPrice < range.maxPrice);
      if (priceRange) totalRate += priceRange.rate;
    } else if (formData.propertyType === 'House') {
      const priceRange = settings.housePriceRanges.find(range => formData.listingPrice < range.maxPrice);
      if (priceRange) totalRate += priceRange.rate;
    }

    // Distance rates
    const distanceRange = settings.distanceRanges.find(range => formData.distanceFromWarehouse < range.maxDistance);
    if (distanceRange) totalRate += distanceRange.rate;

    // Access difficulty rates
    const accessRate = settings.accessDifficultyRates[formData.accessDifficulty];
    if (accessRate !== undefined) totalRate += accessRate;

    // Calculate variation and final quote
    const variation = totalRate * baseQuote;
    const finalQuote = baseQuote + variation;

    setCalculations({
      equivalentRooms: Math.round(equivalentRooms * 100) / 100,
      baseQuote: Math.round(baseQuote * 100) / 100,
      variation: Math.round(variation * 100) / 100,
      finalQuote: Math.round(finalQuote * 100) / 100,
    });
  }, [formData.rooms, formData.roomRate, formData.listingPrice, formData.distanceFromWarehouse, formData.accessDifficulty, formData.propertyType]);

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

  const toggleOptionalRoom = (roomType: string) => {
    setHiddenRooms(prev => {
      const newHiddenRooms = new Set(prev);
      if (newHiddenRooms.has(roomType)) {
        // Show the room
        newHiddenRooms.delete(roomType);
      } else {
        // Hide the room and reset its values to defaults
        newHiddenRooms.add(roomType);
        setFormData(prevData => ({
          ...prevData,
          rooms: {
            ...prevData.rooms,
            [roomType]: optionalRooms[roomType], // Reset to default values
          },
        }));
      }
      return newHiddenRooms;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 0.4in;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .calculator-inputs {
            display: none !important;
          }
          .space-y-6 {
            gap: 0 !important;
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
            max-height: 9in;
            overflow: hidden;
            font-size: 11pt;
            page-break-after: avoid;
          }
          .print-header {
            text-align: center;
            margin-bottom: 16px;
          }
          .print-section {
            margin-bottom: 12px;
          }
          .print-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px;
            margin-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
            font-size: inherit;
            align-items: center;
          }
          .print-total {
            font-weight: bold;
            font-size: 12pt;
            border-top: 2px solid #334155;
            padding-top: 6px;
            margin-top: 12px;
          }
          .print-final-quote {
            color: #16a34a !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          h1, h2, h3 {
            margin-top: 0;
            margin-bottom: 6px;
          }
        }
        @media print and (max-width: 768px) {
          body {
            min-height: auto !important;
          }
          .print-container {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
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
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px'}}>
            <img 
              src={logoHeader} 
              alt="Sparkle Space Logo" 
              style={{width: '300px', height: 'auto', objectFit: 'contain'}}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <h2 style={{fontSize: '24pt', fontWeight: 'bold', margin: '0', marginRight: '40px', color: '#b8860b'}}>Quote</h2>
          </div>
        </div>
        
        <div className="print-section">
          <h3 style={{fontSize: '11pt', fontWeight: 'bold', marginBottom: '8px'}}>Property Details</h3>
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
              <span style={{color: '#2563eb', fontWeight: 'bold'}}>{formData.propertyAddress}</span>
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
            <span style={{color: '#2563eb', fontWeight: 'bold'}}>${formData.roomRate}</span>
          </div>
        </div>

        <div className="print-section">
          <h3 style={{fontSize: '11pt', fontWeight: 'bold', marginBottom: '8px'}}>Room Breakdown</h3>
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
          <h3 style={{fontSize: '11pt', fontWeight: 'bold', marginBottom: '8px'}}>Quote Summary</h3>
          <div className="print-row">
            <span>Equivalent Room Count:</span>
            <span>{calculations.equivalentRooms}</span>
          </div>
          <div className="print-row">
            <span>Base Quote:</span>
            <span>${calculations.baseQuote.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="print-row">
            <span>Variation:</span>
            <span style={{color: calculations.variation >= 0 ? '#16a34a' : '#dc2626'}}>
              {calculations.variation >= 0 ? '+' : ''}${calculations.variation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="print-total print-row">
            <span>Final Quote:</span>
            <span className="print-final-quote" style={{color: '#16a34a', fontWeight: 'bold'}}>${calculations.finalQuote.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                  setIsListingPriceCustomized(false);
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
            <AddressAutocomplete
              id="address"
              placeholder="Enter property address"
              value={formData.propertyAddress}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, propertyAddress: value }));
                // Reset auto-calculated status and clear last calculated address when user changes address
                if (value !== lastCalculatedAddress) {
                  setIsDistanceAutoCalculated(false);
                  setDistanceError(null);
                  // Clear the last calculated address so it can be recalculated
                  if (value.length === 0) {
                    setLastCalculatedAddress('');
                  }
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="distance">Distance from Warehouse (km)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="distance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.distanceFromWarehouse || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, distanceFromWarehouse: parseFloat(e.target.value) || 0 }));
                      setIsDistanceAutoCalculated(false); // Mark as manually entered
                      setDistanceError(null);
                    }}
                    disabled={isDistanceLoading}
                    className={isDistanceAutoCalculated ? "bg-green-50 border-green-200" : ""}
                  />
                  
                  {/* Loading indicator */}
                  {isDistanceLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                    </div>
                  )}
                  
                  {/* Auto-calculated indicator */}
                  {isDistanceAutoCalculated && !isDistanceLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <MapPin className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                </div>
                
                {/* Manual recalculate button */}
                {formData.propertyAddress && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLastCalculatedAddress(''); // Clear to allow recalculation
                      calculateDistance(formData.propertyAddress);
                    }}
                    disabled={isDistanceLoading}
                    className="px-3"
                    title="Recalculate distance"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Status messages */}
              {isDistanceLoading && (
                <div className="text-xs text-blue-600 mt-1">
                  Calculating distance...
                </div>
              )}
              
              {isDistanceAutoCalculated && !isDistanceLoading && (
                <div className="text-xs text-green-600 mt-1">
                  Auto-calculated from address
                </div>
              )}
              
              {distanceError && (
                <div className="text-xs text-red-600 mt-1">
                  {distanceError}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="listingPrice">Listing Price</Label>
              <Input
                id="listingPrice"
                type="number"
                min="0"
                placeholder={formData.propertyType === 'Apartment' ? '800000' : '2000000'}
                value={formData.listingPrice || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, listingPrice: parseFloat(e.target.value) || 0 }));
                  setIsListingPriceCustomized(true);
                }}
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
            <div className="grid grid-cols-11 gap-2 text-sm font-medium text-slate-600 pb-2 border-b">
              <div className="col-span-5">Room Type</div>
              <div className="col-span-3 text-center">Count</div>
              <div className="col-span-3 text-center">Item Qty %</div>
            </div>

            {Object.entries(formData.rooms)
              .filter(([roomType]) => {
                // Hide rooms that are in hiddenRooms set
                if (hiddenRooms.has(roomType)) return false;
                // Hide Master Wardrobe if property type is Apartment
                if (roomType === 'Master Wardrobe' && formData.propertyType === 'Apartment') return false;
                return true;
              })
              .map(([roomType, room]) => (
              <div key={roomType} className="grid grid-cols-11 gap-2 items-center py-1">
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optional Rooms */}
      <Card className="border-0 shadow-sm calculator-inputs">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Optional Rooms
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Click to add/remove optional room types from your quote
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.keys(optionalRooms).map((roomType) => {
              const isHidden = hiddenRooms.has(roomType);
              return (
                <Button
                  key={roomType}
                  variant={isHidden ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleOptionalRoom(roomType)}
                  className={`justify-start h-auto py-2 px-3 ${
                    isHidden 
                      ? "text-slate-600 border-slate-200 hover:bg-slate-50" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    {isHidden ? (
                      <Plus className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium truncate">{roomType}</span>
                  </div>
                </Button>
              );
            })}
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
            <span className="text-sm font-semibold text-slate-900">${calculations.baseQuote.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">Variation:</span>
            <span className={`text-sm font-semibold ${calculations.variation >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {calculations.variation >= 0 ? '+' : ''}${calculations.variation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-900">Final Quote:</span>
            <span className="text-2xl font-bold text-blue-600">${calculations.finalQuote.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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