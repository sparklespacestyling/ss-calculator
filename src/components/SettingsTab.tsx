
import { User, Settings as SettingsIcon, LogOut, Database, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const SettingsTab = () => {
  // Mock user data - in real app this would come from authentication
  const currentUser = {
    name: 'John Smith',
    email: 'john.smith@sparkle-space.com',
    role: 'admin', // or 'regular'
  };

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
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{currentUser.name}</h3>
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
            <Button variant="outline" className="w-full justify-start" size="sm">
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
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
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Database className="h-4 w-4 mr-2" />
              Property Types & Styling Options
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Room Types & Weights
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <DollarSign className="h-4 w-4 mr-2" />
              Rate Configuration
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Warehouse Settings
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
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
          <Button variant="outline" className="w-full justify-start" size="sm">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button variant="outline" className="w-full justify-start" size="sm">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Preferences
          </Button>
          <Button variant="outline" className="w-full justify-start" size="sm">
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
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export { SettingsTab };
