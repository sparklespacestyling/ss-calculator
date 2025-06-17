
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, FileText, CheckCircle, XCircle, DollarSign, Percent } from 'lucide-react';

const HomeTab = () => {
  // Mock data - in real app this would come from Supabase
  const metrics = [
    {
      title: 'Total Quotes',
      value: '127',
      subtitle: 'This month',
      icon: FileText,
      trend: '+12%',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Accepted',
      value: '89',
      subtitle: '70% conversion',
      icon: CheckCircle,
      trend: '+8%',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Revenue',
      value: '$24,580',
      subtitle: 'From accepted quotes',
      icon: DollarSign,
      trend: '+15%',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Avg Quote',
      value: '$276',
      subtitle: 'Per project',
      icon: TrendingUp,
      trend: '+3%',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const recentQuotes = [
    {
      id: 'Q-2024-001',
      customer: 'Sarah Johnson',
      address: '123 Collins Street, Melbourne',
      amount: '$420',
      status: 'Pending',
      date: '2024-01-15',
    },
    {
      id: 'Q-2024-002',
      customer: 'Michael Chen',
      address: '456 Chapel Street, South Yarra',
      amount: '$650',
      status: 'Accepted',
      date: '2024-01-14',
    },
    {
      id: 'Q-2024-003',
      customer: 'Emma Wilson',
      address: '789 Toorak Road, Toorak',
      amount: '$890',
      status: 'Pending',
      date: '2024-01-14',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

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
        {metrics.map((metric, index) => {
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
                <div className="mt-3 flex items-center">
                  <span className="text-xs font-medium text-green-600">
                    {metric.trend}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">vs last month</span>
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
            {recentQuotes.map((quote, index) => (
              <div
                key={quote.id}
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  index !== recentQuotes.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900">
                        {quote.id}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          quote.status
                        )}`}
                      >
                        {quote.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      {quote.customer}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {quote.address}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-slate-900">
                      {quote.amount}
                    </p>
                    <p className="text-xs text-slate-500">{quote.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { HomeTab };
