
import { useState, useEffect } from 'react';
import { Home, FileText, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { HomeTab } from '@/components/HomeTab';
import { QuotesTab } from '@/components/QuotesTab';
import { SettingsTab } from '@/components/SettingsTab';
import { QuoteForm } from '@/components/QuoteForm';
import { QuoteDetailView } from '@/components/QuoteDetailView';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

type TabType = 'home' | 'quotes' | 'settings';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('quotes');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(profile);
        
        // Set default tab based on user role
        if (profile?.role !== 'admin') {
          setActiveTab('quotes');
        } else {
          setActiveTab('home');
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  const tabs = [
    ...(isAdmin ? [{ id: 'home' as TabType, label: 'Home', icon: Home }] : []),
    { id: 'quotes' as TabType, label: 'Quotes', icon: FileText },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    if (selectedQuoteId) {
      return (
        <QuoteDetailView 
          quoteId={selectedQuoteId} 
          onBack={() => setSelectedQuoteId(null)}
          onQuoteUpdated={() => {
            // Refresh the quotes list if needed
            setSelectedQuoteId(null);
          }}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return isAdmin ? <HomeTab /> : <QuotesTab onViewQuote={setSelectedQuoteId} />;
      case 'quotes':
        return <QuotesTab onViewQuote={setSelectedQuoteId} />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <QuotesTab onViewQuote={setSelectedQuoteId} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Sparkle Space</h1>
              <p className="text-sm text-slate-600">Property Styling</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">SS</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full pb-20">
          {renderContent()}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          onClick={() => setShowQuoteForm(true)}
          size="lg"
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 group"
        >
          <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </Button>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 mb-1 transition-all",
                    isActive && "scale-110"
                  )} 
                />
                <span className={cn(
                  "text-xs font-medium",
                  isActive && "font-semibold"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quote Form Modal */}
      <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Generate New Quote
            </DialogTitle>
          </DialogHeader>
          <QuoteForm onClose={() => setShowQuoteForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
