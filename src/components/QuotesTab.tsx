import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Quote {
  id: string;
  quote_number: string;
  final_quote: number;
  status: string;
  created_at: string;
  property_type: string;
  styling_type: string;
  property_address: string;
  updated_at: string;
  clients: {
    name: string;
    email: string;
  };
}

interface QuotesTabProps {
  onViewQuote: (quoteId: string) => void;
}

const QuotesTab = ({ onViewQuote }: QuotesTabProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser !== null) {
      fetchQuotes();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current auth user:', user);
      
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('User profile:', profile, 'Error:', error);
        
        if (error) {
          console.error('Error fetching profile:', error);
          // Create profile if it doesn't exist
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || '',
              role: 'regular'
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            setCurrentUser(newProfile);
          }
        } else {
          setCurrentUser(profile);
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchQuotes = async () => {
    try {
      console.log('Fetching quotes for user:', currentUser);
      
      let query = supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          final_quote,
          status,
          created_at,
          updated_at,
          property_type,
          styling_type,
          property_address,
          user_id,
          clients (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // If not admin, only show user's own quotes
      if (currentUser?.role !== 'admin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('user_id', user.id);
        }
      }

      const { data, error } = await query;

      console.log('Quotes query result:', data, 'Error:', error);

      if (error) {
        console.error('Error fetching quotes:', error);
        toast({
          title: "Error",
          description: "Failed to fetch quotes",
          variant: "destructive",
        });
        return;
      }

      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteClick = (quoteId: string) => {
    // Add haptic feedback for mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    onViewQuote(quoteId);
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update quote status",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Quote ${newStatus} successfully`,
      });

      // Refresh quotes
      fetchQuotes();
    } catch (error) {
      console.error('Error updating quote status:', error);
    }
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

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.property_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(quote.status);
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setStatusFilters(prev => {
      if (checked) {
        return [...prev, status];
      } else {
        return prev.filter(s => s !== status);
      }
    });
  };

  const clearFilters = () => {
    setStatusFilters([]);
  };

  const isAdmin = currentUser?.role === 'admin';

  // For regular users, only show quote amount if quote has been updated by admin
  const shouldShowAmount = (quote: Quote) => {
    if (isAdmin) return true;
    return quote.updated_at !== quote.created_at; // Quote has been edited
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-slate-500">Loading quotes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search quotes, customers, addresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="border-slate-200 relative">
              <Filter className="h-4 w-4" />
              {statusFilters.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {statusFilters.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filter by Status</h4>
                {statusFilters.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-xs h-auto p-1"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {['pending', 'accepted', 'rejected', 'voided'].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-${status}`}
                      checked={statusFilters.includes(status)}
                      onCheckedChange={(checked) => handleStatusFilterChange(status, checked as boolean)}
                    />
                    <label
                      htmlFor={`filter-${status}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{filteredQuotes.length}</p>
          <p className="text-xs text-blue-600">Total</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-yellow-700">
            {filteredQuotes.filter(q => q.status === 'pending').length}
          </p>
          <p className="text-xs text-yellow-600">Pending</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-green-700">
            {filteredQuotes.filter(q => q.status === 'accepted').length}
          </p>
          <p className="text-xs text-green-600">Accepted</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-red-700">
            {filteredQuotes.filter(q => q.status === 'rejected').length}
          </p>
          <p className="text-xs text-red-600">Rejected</p>
        </div>
      </div>

      {/* Quotes List */}
      <div className="space-y-3">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery || statusFilters.length > 0 ? (
              <p className="text-slate-500">No quotes found matching your filters</p>
            ) : (
              <p className="text-slate-500">No quotes found. Create your first quote using the + button!</p>
            )}
          </div>
        ) : (
          filteredQuotes.map((quote) => (
            <Card key={quote.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div
                  onClick={() => handleQuoteClick(quote.id)}
                  className="cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors -m-4 p-4 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-900">
                          {quote.quote_number}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            quote.status
                          )}`}
                        >
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-base font-medium text-slate-800 mb-1">
                        {quote.clients?.name}
                      </p>
                      <p className="text-sm text-slate-600 line-clamp-1">
                        {quote.property_address}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 ml-4">
                      <div className="text-right">
                        {shouldShowAmount(quote) ? (
                          <p className="text-xl font-bold text-slate-900">
                            ${quote.final_quote.toLocaleString()}
                          </p>
                        ) : (
                          <p className="text-lg font-medium text-slate-500">
                            Pending Review
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {new Date(quote.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleQuoteClick(quote.id)}>
                            View Details
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => handleQuoteClick(quote.id)}>
                              Edit Quote
                            </DropdownMenuItem>
                          )}
                          {isAdmin && quote.status !== 'accepted' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'accepted')}>
                              Accept
                            </DropdownMenuItem>
                          )}
                          {isAdmin && quote.status !== 'rejected' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'rejected')}>
                              Reject
                            </DropdownMenuItem>
                          )}
                          {isAdmin && quote.status !== 'voided' && (
                            <DropdownMenuItem 
                              className="text-red-600" 
                              onClick={() => handleStatusChange(quote.id, 'voided')}
                            >
                              Void
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{quote.property_type} • {quote.styling_type} Styling</span>
                    <span>{quote.clients?.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export { QuotesTab };
