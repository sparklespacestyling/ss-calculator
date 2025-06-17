
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, FileText, CheckCircle, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Quote {
  id: string;
  quote_number: string;
  final_quote: number;
  status: string;
  created_at: string;
  clients: {
    name: string;
  };
  property_address: string;
}

const HomeTab = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    accepted: 0,
    revenue: 0,
    avgQuote: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data: quotesData, error } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          final_quote,
          status,
          created_at,
          property_address,
          clients (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch quotes",
          variant: "destructive",
        });
        return;
      }

      setQuotes(quotesData || []);

      // Calculate metrics
      const { data: allQuotes, error: metricsError } = await supabase
        .from('quotes')
        .select('final_quote, status');

      if (!metricsError && allQuotes) {
        const total = allQuotes.length;
        const accepted = allQuotes.filter(q => q.status === 'accepted').length;
        const acceptedQuotes = allQuotes.filter(q => q.status === 'accepted');
        const revenue = acceptedQuotes.reduce((sum, q) => sum + q.final_quote, 0);
        const avgQuote = total > 0 ? allQuotes.reduce((sum, q) => sum + q.final_quote, 0) / total : 0;

        setMetrics({
          total,
          accepted,
          revenue,
          avgQuote
        });
      }
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
    console.log('Quote clicked:', quoteId);
    // TODO: Navigate to quote detail view
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
      <div className="p-4 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
          <p className="text-blue-100 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const metricsCards = [
    {
      title: 'Total Quotes',
      value: metrics.total.toString(),
      subtitle: 'All time',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Accepted',
      value: metrics.accepted.toString(),
      subtitle: `${metrics.total > 0 ? Math.round((metrics.accepted / metrics.total) * 100) : 0}% conversion`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Revenue',
      value: `$${metrics.revenue.toLocaleString()}`,
      subtitle: 'From accepted quotes',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Avg Quote',
      value: `$${Math.round(metrics.avgQuote).toLocaleString()}`,
      subtitle: 'Per project',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
        <p className="text-blue-100 text-sm">
          Here's what's happening with your property styling quotes today.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {metricsCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mb-1">
                      {metric.value}
                    </p>
                    <p className="text-xs text-slate-500">
                      {metric.subtitle}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Quotes */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Recent Quotes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {quotes.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                No quotes found. Create your first quote using the + button!
              </div>
            ) : (
              quotes.map((quote, index) => (
                <div
                  key={quote.id}
                  onClick={() => handleQuoteClick(quote.id)}
                  className={`p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer ${
                    index !== quotes.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">
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
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        {quote.clients?.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {quote.property_address}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-slate-900">
                        ${quote.final_quote.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { HomeTab };
