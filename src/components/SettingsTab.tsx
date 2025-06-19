
import { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, LogOut, Database, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SettingsManager } from '@/components/SettingsManager';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

const SettingsTab = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSettingsView, setActiveSettingsView] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          toast({
            title: "Error",
            description: "Failed to fetch user profile",
            variant: "destructive",
          });
          return;
        }

        setCurrentUser(profile);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAdminAction = (action: string, settingType?: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    if (settingType) {
      setActiveSettingsView(settingType);
    } else {
      toast({
        title: "Feature Coming Soon",
        description: `${action} functionality will be available soon`,
      });
    }
  };

  if (activeSettingsView) {
    const settingTitles = {
      'rate_configuration': 'Rate Configuration',
      'room_types': 'Room Types & Weights',
      'property_types': 'Property Types & Styling Options',
      'warehouse_settings': 'Warehouse Settings',
    };

    return (
      <SettingsManager
        settingType={activeSettingsView}
        title={settingTitles[activeSettingsView as keyof typeof settingTitles] || activeSettingsView}
        onBack={() => setActiveSettingsView(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-slate-500">Unable to load user profile</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="p-4 space-y-4">
      {/* User Profile Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : currentUser.email[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{currentUser.name || 'User'}</h3>
              <p className="text-sm text-slate-600">{currentUser.email}</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                isAdmin 
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {isAdmin ? 'Admin User' : 'Regular User'}
              </span>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => handleAdminAction('Edit Profile')}
            >
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => handleAdminAction('Account Settings')}
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Account Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Settings - Only visible to admin users */}
      {isAdmin && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-purple-600" />
              Admin Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => handleAdminAction('Property Types & Styling Options', 'property_types')}
            >
              <Database className="h-4 w-4 mr-2" />
              Property Types & Styling Options
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => handleAdminAction('Room Types & Weights', 'room_types')}
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Room Types & Weights
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => handleAdminAction('Rate Configuration', 'rate_configuration')}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Rate Configuration
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => handleAdminAction('Warehouse Settings', 'warehouse_settings')}
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Warehouse Settings
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={() => handleAdminAction('User Management')}
            >
              <User className="h-4 w-4 mr-2" />
              User Management
            </Button>
          </CardContent>
        </Card>
      )}

      {/* App Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">
            App Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => handleAdminAction('Notifications')}
          >
            <SettingsIcon className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => handleAdminAction('Preferences')}
          >
            <SettingsIcon className="h-4 w-4 mr-2" />
            Preferences
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
            onClick={() => handleAdminAction('Help & Support')}
          >
            <SettingsIcon className="h-4 w-4 mr-2" />
            Help & Support
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-slate-900">Sparkle Space Property Styling</h3>
            <p className="text-sm text-slate-600">Version 1.0.0</p>
            <p className="text-xs text-slate-500">
              Professional property styling quote generator
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button 
        variant="outline" 
        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export { SettingsTab };
