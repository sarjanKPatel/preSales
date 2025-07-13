'use client';

import React, { useState } from 'react';
import { ProposalSection } from '@/types';
import { db } from '@/lib/supabase';
import ProposalSectionComponent from './ProposalSection';
import Button from '@/components/Button';
import { 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Loader2,
  Sparkles
} from 'lucide-react';

interface SectionManagerProps {
  proposalId: string;
  sections: ProposalSection[];
  onSectionsChange?: (sections: ProposalSection[]) => void;
  editable?: boolean;
}

export default function SectionManager({
  proposalId,
  sections,
  onSectionsChange,
  editable = true,
}: SectionManagerProps) {
  const [loading, setLoading] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionData, setNewSectionData] = useState({
    title: '',
    type: 'generic',
  });

  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);

  const handleUpdateSection = async (sectionId: string, updates: Partial<ProposalSection>) => {
    try {
      setLoading(true);
      
      const { data, error } = await db.updateSection(sectionId, updates);
      
      if (error) throw error;
      
      // Update local state
      const updatedSections = sections.map(section => 
        section.id === sectionId ? { ...section, ...updates } : section
      );
      onSectionsChange?.(updatedSections);
    } catch (err) {
      console.error('Error updating section:', err);
      alert('Failed to update section');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      setLoading(true);
      
      const { error } = await db.deleteSection(sectionId);
      
      if (error) throw error;
      
      // Update local state
      const updatedSections = sections.filter(section => section.id !== sectionId);
      onSectionsChange?.(updatedSections);
    } catch (err) {
      console.error('Error deleting section:', err);
      alert('Failed to delete section');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async () => {
    if (!newSectionData.title.trim()) return;

    try {
      setLoading(true);
      
      const maxOrder = Math.max(...sections.map(s => s.order_index), 0);
      
      const sectionData = {
        proposal_id: proposalId,
        section_title: newSectionData.title.trim(),
        section_type: newSectionData.type,
        content: getDefaultContent(newSectionData.type),
        order_index: maxOrder + 1,
      };

      const { data, error } = await db.addSection(sectionData);
      
      if (error) throw error;
      
      // Update local state
      const updatedSections = [...sections, data];
      onSectionsChange?.(updatedSections);
      
      // Reset form
      setNewSectionData({ title: '', type: 'generic' });
      setShowAddSection(false);
    } catch (err) {
      console.error('Error adding section:', err);
      alert('Failed to add section');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    const sectionIndex = sortedSections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedSections.length) return;

    try {
      setLoading(true);

      const section = sortedSections[sectionIndex];
      const targetSection = sortedSections[targetIndex];

      // Swap order indexes
      await Promise.all([
        db.updateSection(section.id, { order_index: targetSection.order_index }),
        db.updateSection(targetSection.id, { order_index: section.order_index }),
      ]);

      // Update local state
      const updatedSections = sections.map(s => {
        if (s.id === section.id) return { ...s, order_index: targetSection.order_index };
        if (s.id === targetSection.id) return { ...s, order_index: section.order_index };
        return s;
      });
      onSectionsChange?.(updatedSections);
    } catch (err) {
      console.error('Error moving section:', err);
      alert('Failed to move section');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'overview':
        return { text: '' };
      case 'stakeholders':
        return { stakeholders: [] };
      case 'challenges':
        return { challenges: [] };
      case 'solution':
        return { solutions: [] };
      case 'roi':
        return { metrics: [] };
      default:
        return { text: '' };
    }
  };

  const getSectionTypeOptions = () => [
    { value: 'overview', label: 'Overview' },
    { value: 'stakeholders', label: 'Stakeholders' },
    { value: 'challenges', label: 'Challenges' },
    { value: 'solution', label: 'Solution' },
    { value: 'roi', label: 'ROI Analysis' },
    { value: 'analysis', label: 'Market Analysis' },
    { value: 'competitive', label: 'Competitive Analysis' },
    { value: 'timeline', label: 'Implementation Timeline' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'generic', label: 'Custom Section' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Proposal Sections</h2>
          <p className="text-sm text-gray-600 mt-1">
            {sections.length} sections • {sections.filter(s => s.is_ai_generated).length} AI generated
          </p>
        </div>
        
        {editable && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAddSection(!showAddSection)}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Enhance
            </Button>
          </div>
        )}
      </div>

      {/* Add Section Form */}
      {showAddSection && editable && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Section title"
              value={newSectionData.title}
              onChange={(e) => setNewSectionData(prev => ({ ...prev, title: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
            />
            <select
              value={newSectionData.type}
              onChange={(e) => setNewSectionData(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
            >
              {getSectionTypeOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                onClick={handleAddSection}
                variant="primary"
                size="sm"
                disabled={!newSectionData.title.trim() || loading}
                loading={loading}
              >
                Add
              </Button>
              <Button
                onClick={() => setShowAddSection(false)}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className="space-y-4">
        {sortedSections.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No sections yet. Add your first section to get started.</p>
          </div>
        ) : (
          sortedSections.map((section, index) => (
            <div key={section.id} className="relative">
              {/* Section Order Controls */}
              {editable && (
                <div className="absolute -left-12 top-4 flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveSection(section.id, 'up')}
                    disabled={index === 0 || loading}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-3 h-3 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleMoveSection(section.id, 'down')}
                    disabled={index === sortedSections.length - 1 || loading}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              )}

              <ProposalSectionComponent
                section={section}
                onUpdate={handleUpdateSection}
                onDelete={editable ? handleDeleteSection : undefined}
                editable={editable}
                collapsible={true}
              />
            </div>
          ))
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Updating sections...</span>
          </div>
        </div>
      )}
    </div>
  );
}