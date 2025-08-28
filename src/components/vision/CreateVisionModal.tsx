'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import type { CreateVisionInput } from '@/types';

interface CreateVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateVisionInput) => Promise<void>;
  loading?: boolean;
}


export default function CreateVisionModal({ isOpen, onClose, onSubmit, loading }: CreateVisionModalProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Submit with default values
    await onSubmit({
      title: title.trim(),
      category: 'strategy',
      impact: 'medium',
      timeframe: 'medium-term',
      tags: []
    });
    
    // Reset form
    setTitle('');
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Create New Vision</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vision Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g., Q1 2025 Product Vision"
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Vision
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}