
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calculator, User, MapPin, DollarSign, Home } from 'lucide-react';

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

const QuoteForm = ({ onClose }: QuoteFormProps) => {
  const [isAdmin] = useState(true); // Mock - in real app this would come from auth context
  
  // Default room types with weights
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
  }, [formData.rooms, formData.roomRate, formData.listingPrice, formData.distanceFromWarehouse, formData.accessDifficulty, formData.propertyType]);

  const calculateQuote = () => {
    // Calculate equivalent room count
    const equivalentRooms = Object.values(formData.rooms).reduce((total, room) => {
      return total + (room.count * (room.percentage / 100) * room.weight);
    }, 0);

    // Calculate base quote
    const baseQuote = equivalentRooms * formData.roomRate;

    // Calculate penalty/reward rates
    let totalRate = 0;

    // Listing price rates (simplified - in real app this would be configurable)
    if (formData.propertyType === 'Apartment') {
      if (formData.listingPrice < 800000) totalRate -= 0.05;
      else if (formData.listingPrice > 1000000) totalRate += 0.05;
    } else if (formData.propertyType === 'House') {
      if (formData.listingPrice < 1000000) totalRate -= 0.05;
      else if (formData.listingPrice > 1500000) totalRate += 0.05;
    }

    // Distance rates
    if (formData.distanceFromWarehouse < 10) totalRate -= 0.05;
    else if (formData.distanceFromWarehouse >= 15 && formData.distanceFromWarehouse < 30) totalRate += 0.05;
    else if (formData.distanceFromWarehouse >= 30) totalRate += 0.10;

    // Access difficulty rates
    switch (formData.accessDifficulty) {
      case 'Standard': totalRate += 0.05; break;
      case 'Difficult': totalRate += 0.10; break;
      case 'Very Difficult': totalRate += 0.20; break;
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

  const handleSubmit = () => {
    console.log('Quote submitted:', { formData, calculations });
    // In real app, this would save to Supabase
    onClose();
  };

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
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="House">House</SelectItem>
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
                  <SelectItem value="Full">Full</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
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
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-slate-600 pb-2 border-b">
              <div className="col-span-5">Room Type</div>
              <div className="col-span-3 text-center">Count</div>
              <div className="col-span-3 text-center">Item Qty %</div>
              {isAdmin && <div className="col-span-1 text-center">Weight</div>}
            </div>

            {/* Room Rows */}
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
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">
          Generate Quote
        </Button>
      </div>
    </div>
  );
};

export { QuoteForm };
