
import { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuoteDetailViewProps {
  quoteId: string;
  onBack: () => void;
  onQuoteUpdated: () => void;
}

interface QuoteData {
  id: string;
  quote_number: string;
  final_quote: number;
  status: string;
  created_at: string;
  updated_at: string;
  property_type: string;
  styling_type: string;
  property_address: string;
  distance_from_warehouse: number;
  listing_price: number;
  access_difficulty: string;
  room_rate: number;
  room_data: any;
  equivalent_room_count: number;
  base_quote: number;
  variation: number;
  user_id: string;
  clients: {
    id: string;
    name: string;
    email: string;
    contact_person: string;
  };
}

const QuoteDetailView = ({ quoteId, onBack, onQuoteUpdated }: QuoteDetailViewProps) => {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editedQuote, setEditedQuote] = useState<Partial<QuoteData>>({});
  const [rateSettings, setRateSettings] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchRateSettings();
  }, []);

  useEffect(() => {
    if (currentUser !== null) {
      fetchQuote();
    }
  }, [quoteId, currentUser]);

  // Recalculate quote when relevant fields change during editing
  useEffect(() => {
    if (editing && editedQuote && rateSettings) {
      calculateQuoteVariation();
    }
  }, [editedQuote.distance_from_warehouse, editedQuote.listing_price, editedQuote.access_difficulty, editedQuote.room_data, editedQuote.room_rate, editing, rateSettings]);

  const fetchRateSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', 'rate_configuration')
        .single();

      if (data && data.setting_value) {
        setRateSettings(data.setting_value);
      }
    } catch (error) {
      console.error('Error fetching rate settings:', error);
    }
  };

  const calculateQuoteVariation = () => {
    if (!editedQuote || !rateSettings) return;

    // Calculate equivalent room count with proper type checking
    const equivalentRooms = Number(Object.values(editedQuote.room_data || {}).reduce((total: number, room: any) => {
      const count = Number(room.count) || 0;
      const percentage = Number(room.percentage) || 0;
      const weight = Number(room.weight) || 0;
      return total + (count * (percentage / 100) * weight);
    }, 0));

    // Calculate base quote with proper type conversion
    const roomRate = Number(editedQuote.room_rate) || 400;
    const baseQuote = Number(equivalentRooms * roomRate);

    // Calculate penalty/reward rates using flexible rate settings
    let totalRate = 0;
    
    const flexibleRates = rateSettings as any;
    
    if (flexibleRates.apartment_ranges || flexibleRates.house_ranges) {
      // Use new flexible rate system
      const propertyRanges = editedQuote.property_type === 'Apartment' 
        ? flexibleRates.apartment_ranges 
        : flexibleRates.house_ranges;
      
      if (propertyRanges && editedQuote.listing_price) {
        const listingPrice = Number(editedQuote.listing_price) || 0;
        for (const range of propertyRanges) {
          if (listingPrice >= range.min && listingPrice < range.max) {
            totalRate += Number(range.rate) / 100 || 0; // Convert percentage to decimal
            break;
          }
        }
      }

      // Distance rates with proper type conversion
      if (flexibleRates.distance_ranges && editedQuote.distance_from_warehouse !== undefined) {
        const distance = Number(editedQuote.distance_from_warehouse) || 0;
        for (const range of flexibleRates.distance_ranges) {
          if (distance >= range.min && distance < range.max) {
            totalRate += Number(range.rate) / 100 || 0; // Convert percentage to decimal
            break;
          }
        }
      }

      // Access difficulty rates
      if (flexibleRates.access_difficulty_rates && editedQuote.access_difficulty) {
        const difficultyRate = flexibleRates.access_difficulty_rates[editedQuote.access_difficulty];
        if (difficultyRate !== undefined) {
          totalRate += Number(difficultyRate) / 100 || 0; // Convert percentage to decimal
        }
      }
    }

    // Calculate variation and final quote with explicit number conversion
    const variation = Number(Number(totalRate) * baseQuote);
    const finalQuote = Number(baseQuote + variation);

    setEditedQuote(prev => ({
      ...prev,
      equivalent_room_count: Math.round(equivalentRooms * 100) / 100,
      base_quote: Math.round(baseQuote),
      variation: Math.round(variation),
      final_quote: Math.round(finalQuote),
    }));
  };

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('QuoteDetailView - Current auth user:', user);
      
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('QuoteDetailView - User profile:', profile, 'Error:', error);
        
        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setCurrentUser(profile);
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchQuote = async () => {
    try {
      console.log('Fetching quote with ID:', quoteId);
      console.log('Current user for quote fetch:', currentUser);
      
      let query = supabase
        .from('quotes')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            contact_person
          )
        `)
        .eq('id', quoteId);

      const { data, error } = await query.single();

      console.log('Quote fetch result:', data, 'Error:', error);

      if (error) {
        console.error('Error fetching quote:', error);
        toast({
          title: "Error",
          description: "Failed to fetch quote details",
          variant: "destructive",
        });
        return;
      }

      // Check if user has access to this quote
      const { data: { user } } = await supabase.auth.getUser();
      const isAdmin = currentUser?.role === 'admin';
      const isOwner = user && data.user_id === user.id;

      if (!isAdmin && !isOwner) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this quote",
          variant: "destructive",
        });
        onBack();
        return;
      }

      setQuote(data);
      setEditedQuote(data);
    } catch (error) {
      console.error('Error fetching quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!quote || !editedQuote) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          final_quote: editedQuote.final_quote,
          status: editedQuote.status,
          property_address: editedQuote.property_address,
          access_difficulty: editedQuote.access_difficulty,
          distance_from_warehouse: editedQuote.distance_from_warehouse,
          listing_price: editedQuote.listing_price,
          room_data: editedQuote.room_data,
          equivalent_room_count: editedQuote.equivalent_room_count,
          base_quote: editedQuote.base_quote,
          variation: editedQuote.variation,
          room_rate: editedQuote.room_rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update quote",
          variant: "destructive",
        });
        return;
      }

      // Update client information if changed
      if (editedQuote.clients) {
        const { error: clientError } = await supabase
          .from('clients')
          .update({
            name: editedQuote.clients.name,
            email: editedQuote.clients.email,
            contact_person: editedQuote.clients.contact_person
          })
          .eq('id', quote.clients.id);

        if (clientError) {
          console.error('Error updating client:', clientError);
        }
      }

      toast({
        title: "Success",
        description: "Quote updated successfully",
      });

      setEditing(false);
      fetchQuote(); // Refresh the data
      onQuoteUpdated();
    } catch (error) {
      console.error('Error updating quote:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRoomDataChange = (roomType: string, field: string, value: number) => {
    setEditedQuote(prev => ({
      ...prev,
      room_data: {
        ...prev.room_data,
        [roomType]: {
          ...prev.room_data?.[roomType],
          [field]: value
        }
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'voided':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-slate-500">Loading quote details...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-slate-500">Quote not found</p>
          <Button onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const shouldShowAmount = isAdmin || quote.updated_at !== quote.created_at;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{quote.quote_number}</h1>
            <p className="text-sm text-slate-600">Quote Details</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setEditing(true)}>
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Quote Status */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Status</p>
              {editing && isAdmin ? (
                <Select 
                  value={editedQuote.status} 
                  onValueChange={(value) => setEditedQuote(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-48 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border mt-1 ${getStatusColor(quote.status)}`}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </span>
              )}
            </div>
            {shouldShowAmount && (
              <div className="text-right">
                <p className="text-sm text-slate-600">Final Quote</p>
                {editing && isAdmin ? (
                  <Input
                    type="number"
                    value={editedQuote.final_quote || ''}
                    onChange={(e) => setEditedQuote(prev => ({ ...prev, final_quote: parseFloat(e.target.value) || 0 }))}
                    className="text-right text-2xl font-bold text-blue-600 w-48 mt-1"
                  />
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    ${(editedQuote.final_quote || quote.final_quote).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Client Name</Label>
              {editing && isAdmin ? (
                <Input
                  value={editedQuote.clients?.name || ''}
                  onChange={(e) => setEditedQuote(prev => ({ 
                    ...prev, 
                    clients: { ...prev.clients!, name: e.target.value }
                  }))}
                />
              ) : (
                <p className="text-slate-900 font-medium">{quote.clients.name}</p>
              )}
            </div>
            <div>
              <Label>Contact Person</Label>
              {editing && isAdmin ? (
                <Input
                  value={editedQuote.clients?.contact_person || ''}
                  onChange={(e) => setEditedQuote(prev => ({ 
                    ...prev, 
                    clients: { ...prev.clients!, contact_person: e.target.value }
                  }))}
                />
              ) : (
                <p className="text-slate-900 font-medium">{quote.clients.contact_person || 'N/A'}</p>
              )}
            </div>
          </div>
          <div>
            <Label>Email</Label>
            {editing && isAdmin ? (
              <Input
                type="email"
                value={editedQuote.clients?.email || ''}
                onChange={(e) => setEditedQuote(prev => ({ 
                  ...prev, 
                  clients: { ...prev.clients!, email: e.target.value }
                }))}
              />
            ) : (
              <p className="text-slate-900 font-medium">{quote.clients.email}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Property Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Property Type</Label>
              <p className="text-slate-900 font-medium">{quote.property_type}</p>
            </div>
            <div>
              <Label>Styling Type</Label>
              <p className="text-slate-900 font-medium">{quote.styling_type}</p>
            </div>
          </div>
          <div>
            <Label>Property Address</Label>
            {editing && isAdmin ? (
              <Input
                value={editedQuote.property_address || ''}
                onChange={(e) => setEditedQuote(prev => ({ ...prev, property_address: e.target.value }))}
              />
            ) : (
              <p className="text-slate-900 font-medium">{quote.property_address}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Distance from Warehouse</Label>
              {editing && isAdmin ? (
                <Input
                  type="number"
                  value={editedQuote.distance_from_warehouse || ''}
                  onChange={(e) => setEditedQuote(prev => ({ ...prev, distance_from_warehouse: parseFloat(e.target.value) || 0 }))}
                />
              ) : (
                <p className="text-slate-900 font-medium">{quote.distance_from_warehouse} km</p>
              )}
            </div>
            <div>
              <Label>Listing Price</Label>
              {editing && isAdmin ? (
                <Input
                  type="number"
                  value={editedQuote.listing_price || ''}
                  onChange={(e) => setEditedQuote(prev => ({ ...prev, listing_price: parseFloat(e.target.value) || 0 }))}
                />
              ) : (
                <p className="text-slate-900 font-medium">${quote.listing_price?.toLocaleString()}</p>
              )}
            </div>
            <div>
              <Label>Access Difficulty</Label>
              {editing && isAdmin ? (
                <Select 
                  value={editedQuote.access_difficulty} 
                  onValueChange={(value) => setEditedQuote(prev => ({ ...prev, access_difficulty: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Difficult">Difficult</SelectItem>
                    <SelectItem value="Very Difficult">Very Difficult</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-slate-900 font-medium">{quote.access_difficulty}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Configuration */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
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

            {Object.entries(quote.room_data).map(([roomType, room]: [string, any]) => (
              <div key={roomType} className="grid grid-cols-12 gap-2 items-center py-1">
                <div className="col-span-5 text-sm font-medium text-slate-700">
                  {roomType}
                </div>
                <div className="col-span-3 text-center">
                  {editing && isAdmin ? (
                    <Input
                      type="number"
                      value={editedQuote.room_data?.[roomType]?.count || room.count}
                      onChange={(e) => handleRoomDataChange(roomType, 'count', parseInt(e.target.value) || 0)}
                      className="text-center text-sm"
                      min="0"
                    />
                  ) : (
                    <span className="text-sm text-slate-900">{room.count}</span>
                  )}
                </div>
                <div className="col-span-3 text-center">
                  {editing && isAdmin ? (
                    <Input
                      type="number"
                      value={editedQuote.room_data?.[roomType]?.percentage || room.percentage}
                      onChange={(e) => handleRoomDataChange(roomType, 'percentage', parseInt(e.target.value) || 0)}
                      className="text-center text-sm"
                      min="0"
                      max="100"
                    />
                  ) : (
                    <span className="text-sm text-slate-900">{room.percentage}%</span>
                  )}
                </div>
                <div className="col-span-1 text-center text-sm text-slate-600">
                  {room.weight}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quote Calculations - Admin Only */}
      {isAdmin && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Quote Calculation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Equivalent Room Count:</span>
              <span className="text-sm font-semibold text-slate-900">{editedQuote.equivalent_room_count || quote.equivalent_room_count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Room Rate:</span>
              {editing && isAdmin ? (
                <Input
                  type="number"
                  value={editedQuote.room_rate || ''}
                  onChange={(e) => setEditedQuote(prev => ({ ...prev, room_rate: parseFloat(e.target.value) || 400 }))}
                  className="text-right text-sm font-semibold text-slate-900 w-24"
                />
              ) : (
                <span className="text-sm font-semibold text-slate-900">${quote.room_rate}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Base Quote:</span>
              <span className="text-sm font-semibold text-slate-900">${(editedQuote.base_quote || quote.base_quote).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Variation:</span>
              <span className={`text-sm font-semibold ${(editedQuote.variation || quote.variation) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {(editedQuote.variation || quote.variation) >= 0 ? '+' : ''}${(editedQuote.variation || quote.variation).toLocaleString()}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-slate-900">Final Quote:</span>
              <span className="text-2xl font-bold text-blue-600">${(editedQuote.final_quote || quote.final_quote).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quote Metadata */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600">Created:</p>
              <p className="font-medium">{new Date(quote.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-600">Last Updated:</p>
              <p className="font-medium">{new Date(quote.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { QuoteDetailView };
