'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { 
  Plus, 
  Search, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  DollarSign,
  Filter,
  ChevronRight,
  Tag,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useLeads, useLeadStats } from '@/database/leads/hooks';
import type { Lead } from '@/database/shared/types';


const statusColors = {
  new: 'glass bg-blue-500/20 text-blue-700 border border-blue-500/30',
  contacted: 'glass bg-yellow-500/20 text-yellow-700 border border-yellow-500/30',
  qualified: 'glass bg-purple-500/20 text-purple-700 border border-purple-500/30',
  proposal_sent: 'glass bg-indigo-500/20 text-indigo-700 border border-indigo-500/30',
  won: 'glass bg-green-500/20 text-green-700 border border-green-500/30',
  lost: 'glass bg-red-500/20 text-red-700 border border-red-500/30'
};

export default function LeadsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Fetch leads using database hooks
  const { leads, loading, error, refresh } = useLeads({
    search: searchQuery || undefined,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    limit: 50
  });
  
  const { stats, loading: statsLoading } = useLeadStats();

  const handleAddNewLead = () => {
    router.push('/chat?type=lead');
  };

  // Leads are already filtered by the hook based on search and status
  const filteredLeads = leads || [];

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Layout maxWidth="7xl" padding>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lead Information</h1>
            <p className="text-gray-600 mt-2">
              Manage and track your sales leads and opportunities
            </p>
          </div>
          {user && (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleAddNewLead}
            >
              Add New Lead
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    stats.total
                  )}
                </p>
              </div>
              <div className="w-10 h-10 glass bg-blue-500/20 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Qualified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    stats.qualified
                  )}
                </p>
              </div>
              <div className="w-10 h-10 glass bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pipeline</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    formatCurrency(stats.totalPipeline)
                  )}
                </p>
              </div>
              <div className="w-10 h-10 glass bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    `${stats.conversionRate}%`
                  )}
                </p>
              </div>
              <div className="w-10 h-10 glass bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 glass border border-white/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 glass border border-white/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal_sent">Proposal Sent</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
              <Button variant="ghost" icon={<Filter className="w-4 h-4" />}>
                More Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-gray-600">Loading leads...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="text-red-800">
              <p className="font-medium">Error loading leads</p>
              <p className="text-sm mt-1">{error}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refresh}
                className="mt-2 text-red-700 hover:text-red-800"
              >
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Leads List */}
        {!loading && !error && (
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className="p-6 hover:shadow-2xl transition-all cursor-pointer hover:scale-[1.01]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 glass bg-gray-500/20 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{lead.company_name}</h3>
                        <p className="text-sm text-gray-600">{lead.metadata?.industry || 'No industry specified'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{lead.contact_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{lead.contact_email}</span>
                      </div>
                      {lead.metadata?.contact_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{lead.metadata.contact_phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Created: {formatDate(lead.created_at)}</span>
                      </div>
                      {lead.metadata?.last_contact && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Last Contact: {formatDate(lead.metadata.last_contact)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium capitalize",
                      statusColors[lead.metadata?.status as keyof typeof statusColors || 'new']
                    )}>
                      {(lead.metadata?.status || 'new').replace('_', ' ')}
                    </span>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(parseFloat(lead.metadata?.deal_size) || 0)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && filteredLeads.length === 0 && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 glass bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600">
              {searchQuery || selectedStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first lead'}
            </p>
            {!searchQuery && selectedStatus === 'all' && (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleAddNewLead}
                className="mt-4"
              >
                Add New Lead
              </Button>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}