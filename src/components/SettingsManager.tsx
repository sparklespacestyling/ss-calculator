
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

interface SettingsManagerProps {
  settingType: string;
  title: string;
  onBack: () => void;
}

interface RateRange {
  min: number;
  max: number;
  rate: number;
}

interface FlexibleRateSettings {
  apartment_ranges: RateRange[];
  house_ranges: RateRange[];
  distance_ranges: RateRange[];
  access_difficulty_rates: {
    [key: string]: number;
  };
}

interface RoomTypeSettings {
  [key: string]: {
    weight: number;
    default_count: number;
  };
}

interface PropertyTypesSettings {
  property_types: string[];
  styling_options: string[];
}

interface WarehouseSettings {
  address: string;
}

const SettingsManager = ({ settingType, title, onBack }: SettingsManagerProps) => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, [settingType]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('setting_key', settingType)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        toast({
          title: "Error",
          description: "Failed to fetch settings",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setSettings(data.setting_value);
      } else {
        // Create default settings
        const defaultSettings = getDefaultSettings(settingType);
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettings = (type: string) => {
    switch (type) {
      case 'rate_configuration':
        return {
          apartment_ranges: [
            { min: 0, max: 800000, rate: -0.05 },
            { min: 800000, max: 1000000, rate: 0 },
            { min: 1000000, max: 999999999, rate: 0.05 }
          ],
          house_ranges: [
            { min: 0, max: 1000000, rate: -0.05 },
            { min: 1000000, max: 1500000, rate: 0 },
            { min: 1500000, max: 999999999, rate: 0.05 }
          ],
          distance_ranges: [
            { min: 0, max: 10, rate: -0.05 },
            { min: 10, max: 30, rate: 0.05 },
            { min: 30, max: 999, rate: 0.10 }
          ],
          access_difficulty_rates: {
            'Easy': 0,
            'Standard': 0.05,
            'Difficult': 0.10,
            'Very Difficult': 0.20
          }
        };
      case 'room_types':
        return {
          'Foyer/Entry': { weight: 0.5, default_count: 0 },
          'Living Room': { weight: 2, default_count: 0 },
          'Family Room/Lounge': { weight: 1.5, default_count: 0 },
          'Dining Room': { weight: 1, default_count: 0 },
          'Kitchen': { weight: 0.5, default_count: 0 },
          'Master Bedroom': { weight: 1.5, default_count: 1 },
          'Master Wardrobe': { weight: 0.5, default_count: 0 },
          'Standard Bedroom': { weight: 1, default_count: 0 },
          'Standard Bathroom': { weight: 0.25, default_count: 0 },
          'Hallway': { weight: 0.5, default_count: 0 },
          'Pantry': { weight: 0.25, default_count: 0 },
          'Laundry': { weight: 0.25, default_count: 0 },
          'Office': { weight: 1, default_count: 0 },
          'Study': { weight: 1, default_count: 0 },
          'Outdoor (large)': { weight: 1.5, default_count: 0 },
          'Outdoor (small)': { weight: 0.5, default_count: 0 },
        };
      case 'property_types':
        return {
          property_types: ['Apartment', 'House'],
          styling_options: ['Full', 'Partial']
        };
      case 'warehouse_settings':
        return {
          address: ''
        };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          setting_key: settingType,
          setting_type: 'json',
          setting_value: settings,
        });

      if (error) {
        console.error('Error saving settings:', error);
        toast({
          title: "Error",
          description: "Failed to save settings",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateRoomSetting = (roomType: string, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [roomType]: {
        ...prev[roomType],
        [field]: value,
      },
    }));
  };

  const addRoomType = () => {
    const newRoomName = prompt('Enter new room type name:');
    if (newRoomName && !settings[newRoomName]) {
      setSettings((prev: any) => ({
        ...prev,
        [newRoomName]: { weight: 1, default_count: 0 }
      }));
    }
  };

  const deleteRoomType = (roomType: string) => {
    if (confirm(`Are you sure you want to delete "${roomType}"?`)) {
      setSettings((prev: any) => {
        const newSettings = { ...prev };
        delete newSettings[roomType];
        return newSettings;
      });
    }
  };

  const addRange = (rangeType: string) => {
    const newRange = { min: 0, max: 100000, rate: 0 };
    setSettings((prev: any) => ({
      ...prev,
      [rangeType]: [...(prev[rangeType] || []), newRange]
    }));
  };

  const updateRange = (rangeType: string, index: number, field: string, value: number) => {
    setSettings((prev: any) => ({
      ...prev,
      [rangeType]: prev[rangeType].map((range: any, i: number) => 
        i === index ? { ...range, [field]: value } : range
      )
    }));
  };

  const deleteRange = (rangeType: string, index: number) => {
    setSettings((prev: any) => ({
      ...prev,
      [rangeType]: prev[rangeType].filter((_: any, i: number) => i !== index)
    }));
  };

  const addPropertyType = () => {
    const newType = prompt('Enter new property type:');
    if (newType && !settings.property_types.includes(newType)) {
      setSettings((prev: any) => ({
        ...prev,
        property_types: [...prev.property_types, newType]
      }));
    }
  };

  const addStylingOption = () => {
    const newOption = prompt('Enter new styling option:');
    if (newOption && !settings.styling_options.includes(newOption)) {
      setSettings((prev: any) => ({
        ...prev,
        styling_options: [...prev.styling_options, newOption]
      }));
    }
  };

  const removePropertyType = (index: number) => {
    setSettings((prev: any) => ({
      ...prev,
      property_types: prev.property_types.filter((_: string, i: number) => i !== index)
    }));
  };

  const removeStylingOption = (index: number) => {
    setSettings((prev: any) => ({
      ...prev,
      styling_options: prev.styling_options.filter((_: string, i: number) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  const renderFlexibleRateConfiguration = () => (
    <div className="space-y-6">
      {/* Apartment Price Ranges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Apartment Price Ranges
            <Button size="sm" onClick={() => addRange('apartment_ranges')}>
              <Plus className="h-4 w-4 mr-1" />
              Add Range
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {settings.apartment_ranges?.map((range: RateRange, index: number) => (
              <div key={index} className="grid grid-cols-4 gap-3 items-center">
                <div>
                  <Label>Min Price</Label>
                  <Input
                    type="number"
                    value={range.min}
                    onChange={(e) => updateRange('apartment_ranges', index, 'min', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Max Price</Label>
                  <Input
                    type="number"
                    value={range.max}
                    onChange={(e) => updateRange('apartment_ranges', index, 'max', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={range.rate * 100}
                    onChange={(e) => updateRange('apartment_ranges', index, 'rate', parseFloat(e.target.value) / 100)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteRange('apartment_ranges', index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* House Price Ranges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            House Price Ranges
            <Button size="sm" onClick={() => addRange('house_ranges')}>
              <Plus className="h-4 w-4 mr-1" />
              Add Range
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {settings.house_ranges?.map((range: RateRange, index: number) => (
              <div key={index} className="grid grid-cols-4 gap-3 items-center">
                <div>
                  <Label>Min Price</Label>
                  <Input
                    type="number"
                    value={range.min}
                    onChange={(e) => updateRange('house_ranges', index, 'min', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Max Price</Label>
                  <Input
                    type="number"
                    value={range.max}
                    onChange={(e) => updateRange('house_ranges', index, 'max', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={range.rate * 100}
                    onChange={(e) => updateRange('house_ranges', index, 'rate', parseFloat(e.target.value) / 100)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteRange('house_ranges', index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distance Ranges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Distance Ranges (km)
            <Button size="sm" onClick={() => addRange('distance_ranges')}>
              <Plus className="h-4 w-4 mr-1" />
              Add Range
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {settings.distance_ranges?.map((range: RateRange, index: number) => (
              <div key={index} className="grid grid-cols-4 gap-3 items-center">
                <div>
                  <Label>Min Distance</Label>
                  <Input
                    type="number"
                    value={range.min}
                    onChange={(e) => updateRange('distance_ranges', index, 'min', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Max Distance</Label>
                  <Input
                    type="number"
                    value={range.max}
                    onChange={(e) => updateRange('distance_ranges', index, 'max', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={range.rate * 100}
                    onChange={(e) => updateRange('distance_ranges', index, 'rate', parseFloat(e.target.value) / 100)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteRange('distance_ranges', index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Access Difficulty Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Access Difficulty Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(settings.access_difficulty_rates || {}).map(([difficulty, rate]) => (
              <div key={difficulty} className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <Label>{difficulty}</Label>
                </div>
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    value={(rate as number) * 100}
                    onChange={(e) => setSettings((prev: any) => ({
                      ...prev,
                      access_difficulty_rates: {
                        ...prev.access_difficulty_rates,
                        [difficulty]: parseFloat(e.target.value) / 100
                      }
                    }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRoomTypes = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Room Types & Weights
          <Button size="sm" onClick={addRoomType}>
            <Plus className="h-4 w-4 mr-1" />
            Add Room Type
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-slate-600 pb-2 border-b">
            <div className="col-span-5">Room Type</div>
            <div className="col-span-3 text-center">Weight</div>
            <div className="col-span-3 text-center">Default Count</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>
          {Object.entries(settings as RoomTypeSettings).map(([roomType, config]) => (
            <div key={roomType} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5 text-sm font-medium text-slate-700">
                {roomType}
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.25"
                  value={config.weight}
                  onChange={(e) => updateRoomSetting(roomType, 'weight', parseFloat(e.target.value))}
                  className="text-center h-8"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={config.default_count}
                  onChange={(e) => updateRoomSetting(roomType, 'default_count', parseInt(e.target.value))}
                  className="text-center h-8"
                />
              </div>
              <div className="col-span-1 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteRoomType(roomType)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderPropertyTypes = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Property Types
            <Button size="sm" onClick={addPropertyType}>
              <Plus className="h-4 w-4 mr-1" />
              Add Type
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {settings.property_types?.map((type: string, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span>{type}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removePropertyType(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Styling Options
            <Button size="sm" onClick={addStylingOption}>
              <Plus className="h-4 w-4 mr-1" />
              Add Option
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {settings.styling_options?.map((option: string, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span>{option}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeStylingOption(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderWarehouseSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Warehouse Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <Label htmlFor="warehouse_address">Warehouse Address</Label>
          <Input
            id="warehouse_address"
            value={settings.address || ''}
            onChange={(e) => updateSetting('address', e.target.value)}
            placeholder="Enter warehouse address"
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>

      {settingType === 'rate_configuration' && renderFlexibleRateConfiguration()}
      {settingType === 'room_types' && renderRoomTypes()}
      {settingType === 'property_types' && renderPropertyTypes()}
      {settingType === 'warehouse_settings' && renderWarehouseSettings()}

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export { SettingsManager };
