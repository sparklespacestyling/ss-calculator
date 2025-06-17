
import { useState } from 'react';
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

const QuotesTab = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock quotes data - in real app this would come from Supabase
  const quotes = [
    {
      id: 'Q-2024-001',
      customer: 'Sarah Johnson',
      contact: 'sarah.j@email.com',
      address: '123 Collins Street, Melbourne VIC 3000',
      amount: 420,
      status: 'Pending',
      date: '2024-01-15',
      propertyType: 'Apartment',
      styling: 'Full',
    },
    {
      id: 'Q-2024-002',
      customer: 'Michael Chen',
      contact: 'mchen@email.com',
      address: '456 Chapel Street, South Yarra VIC 3141',
      amount: 650,
      status: 'Accepted',
      date: '2024-01-14',
      propertyType: 'House',
      styling: 'Partial',
    },
    {
      id: 'Q-2024-003',
      customer: 'Emma Wilson',
      contact: 'emma.wilson@email.com',
      address: '789 Toorak Road, Toorak VIC 3142',
      amount: 890,
      status: 'Pending',
      date: '2024-01-14',
      propertyType: 'House',
      styling: 'Full',
    },
    {
      id: 'Q-2024-004',
      customer: 'David Lee',
      contact: 'david.lee@email.com',
      address: '321 Flinders Lane, Melbourne VIC 3000',
      amount: 320,
      status: 'Rejected',
      date: '2024-01-13',
      propertyType: 'Apartment',
      styling: 'Partial',
    },
    {
      id: 'Q-2024-005',
      customer: 'Lisa Thompson',
      contact: 'lisa.t@email.com',
      address: '654 Burke Road, Camberwell VIC 3124',
      amount: 780,
      status: 'Accepted',
      date: '2024-01-12',
      propertyType: 'House',
      styling: 'Full',
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
      case 'Voided':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Button variant="outline" size="icon" className="border-slate-200">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{quotes.length}</p>
          <p className="text-xs text-blue-600">Total</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-yellow-700">
            {quotes.filter(q => q.status === 'Pending').length}
          </p>
          <p className="text-xs text-yellow-600">Pending</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-green-700">
            {quotes.filter(q => q.status === 'Accepted').length}
          </p>
          <p className="text-xs text-green-600">Accepted</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-red-700">
            {quotes.filter(q => q.status === 'Rejected').length}
          </p>
          <p className="text-xs text-red-600">Rejected</p>
        </div>
      </div>

      {/* Quotes List */}
      <div className="space-y-3">
        {filteredQuotes.map((quote) => (
          <Card key={quote.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900">
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
                  <p className="text-base font-medium text-slate-800 mb-1">
                    {quote.customer}
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-1">
                    {quote.address}
                  </p>
                </div>
                <div className="flex items-start gap-2 ml-4">
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">
                      ${quote.amount}
                    </p>
                    <p className="text-xs text-slate-500">{quote.date}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Quote</DropdownMenuItem>
                      <DropdownMenuItem>Accept</DropdownMenuItem>
                      <DropdownMenuItem>Reject</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Void</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{quote.propertyType} • {quote.styling} Styling</span>
                <span>{quote.contact}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredQuotes.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-slate-500">No quotes found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export { QuotesTab };
