'use client';

import React, { useState } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import { X, Building2, DollarSign, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (proposalId: string) => void;
}

export default function CreateProposalModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProposalModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    description: '',
    amount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please sign in to create a proposal');
      return;
    }

    if (!formData.title.trim() || !formData.company_name.trim()) {
      setError('Title and company name are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const proposalData = {
        title: formData.title.trim(),
        company_name: formData.company_name.trim(),
        description: formData.description.trim() || undefined,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
      };

      const { data, error: createError } = await db.createProposal(proposalData);
      
      if (createError) {
        throw createError;
      }

      if (!data) {
        throw new Error('Failed to create proposal');
      }

      // Create default sections
      const defaultSections = [
        {
          proposal_id: data.id,
          section_title: 'Company Overview',
          section_type: 'overview',
          content: { text: '' },
          order_index: 1,
        },
        {
          proposal_id: data.id,
          section_title: 'Stakeholder Mapping',
          section_type: 'stakeholders',
          content: { stakeholders: [] },
          order_index: 2,
        },
        {
          proposal_id: data.id,
          section_title: 'Challenges & Pain Points',
          section_type: 'challenges',
          content: { challenges: [] },
          order_index: 3,
        },
        {
          proposal_id: data.id,
          section_title: 'Proposed Solution',
          section_type: 'solution',
          content: { solutions: [] },
          order_index: 4,
        },
        {
          proposal_id: data.id,
          section_title: 'Expected ROI',
          section_type: 'roi',
          content: { metrics: [] },
          order_index: 5,
        },
      ];

      // Create sections
      for (const section of defaultSections) {
        await db.addSection(section);
      }

      // Reset form
      setFormData({
        title: '',
        company_name: '',
        description: '',
        amount: '',
      });

      onSuccess?.(data.id);
      onClose();
    } catch (err) {
      console.error('Error creating proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Proposal
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposal Title *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Q1 2024 Digital Transformation"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Acme Corporation"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the proposal..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-500"
              disabled={loading}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Value
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="100000"
                min="0"
                step="1000"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Proposal'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}