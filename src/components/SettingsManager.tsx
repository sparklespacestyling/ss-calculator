
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

interface SettingsManagerProps {
  settingType: string;
  title: string;
  onBack: () => void;
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

interface RoomTypeSettings {
  [key: string]: {
    weight: number;
    default_count: number;
  };
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
          apartment_low_threshold: 800000,
          apartment_high_threshold: 1000000,
          house_low_threshold: 1000000,
          house_high_threshold: 1500000,
          distance_close_threshold: 10,
          distance_medium_min: 15,
          distance_medium_max: 30,
          distance_far_min: 30,
          penalty_discount: 0.05,
          reward_bonus: 0.05,
          distance_close_discount: 0.05,
          distance_medium_fee: 0.05,
          distance_far_fee: 0.10,
          access_standard_fee: 0.05,
          access_difficult_fee: 0.10,
          access_very_difficult_fee: 0.20,
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

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  const renderRateConfiguration = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Property Price Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="apt_low">Apartment Low Threshold</Label>
              <Input
                id="apt_low"
                type="number"
                value={settings.apartment_low_threshold}
                onChange={(e) => updateSetting('apartment_low_threshold', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="apt_high">Apartment High Threshold</Label>
              <Input
                id="apt_high"
                type="number"
                value={settings.apartment_high_threshold}
                onChange={(e) => updateSetting('apartment_high_threshold', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="house_low">House Low Threshold</Label>
              <Input
                id="house_low"
                type="number"
                value={settings.house_low_threshold}
                onChange={(e) => updateSetting('house_low_threshold', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="house_high">House High Threshold</Label>
              <Input
                id="house_high"
                type="number"
                value={settings.house_high_threshold}
                onChange={(e) => updateSetting('house_high_threshold', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distance Settings (km)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dist_close">Close Distance Threshold</Label>
              <Input
                id="dist_close"
                type="number"
                value={settings.distance_close_threshold}
                onChange={(e) => updateSetting('distance_close_threshold', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="dist_med_min">Medium Distance Min</Label>
              <Input
                id="dist_med_min"
                type="number"
                value={settings.distance_medium_min}
                onChange={(e) => updateSetting('distance_medium_min', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rate Modifiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="penalty">Penalty/Discount Rate</Label>
              <Input
                id="penalty"
                type="number"
                step="0.01"
                value={settings.penalty_discount}
                onChange={(e) => updateSetting('penalty_discount', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="reward">Reward/Bonus Rate</Label>
              <Input
                id="reward"
                type="number"
                step="0.01"
                value={settings.reward_bonus}
                onChange={(e) => updateSetting('reward_bonus', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRoomTypes = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Room Types & Weights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-slate-600 pb-2 border-b">
            <div className="col-span-6">Room Type</div>
            <div className="col-span-3 text-center">Weight</div>
            <div className="col-span-3 text-center">Default Count</div>
          </div>
          {Object.entries(settings as RoomTypeSettings).map(([roomType, config]) => (
            <div key={roomType} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 text-sm font-medium text-slate-700">
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
            </div>
          ))}
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

      {settingType === 'rate_configuration' && renderRateConfiguration()}
      {settingType === 'room_types' && renderRoomTypes()}

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
