'use client';

import React, { useState, useRef, useEffect } from 'react';
 
import ProposalSectionComponent from './ProposalSection';
import Button from '@/components/Button';
import { 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Loader2,
  Sparkles,
  ChevronDown,
  Check
} from 'lucide-react';

interface SectionManagerProps {
  proposalId: string;
  sections: any[];
  onSectionsChange?: (sections: any[]) => void;
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
    type: 'overview',
  });
  const [showCustomTitle, setShowCustomTitle] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLButtonElement>(null);

  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleUpdateSection = async (sectionId: string, updates: any) => {
    try {
      setLoading(true);
      
      // TODO: Replace with new database integration
      const error = null;
      
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
      
      // TODO: Replace with new database integration
      const error = null;
      
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
    // For custom sections, require a title. For predefined sections, use the label as title
    const finalTitle = newSectionData.type === 'custom' 
      ? newSectionData.title.trim()
      : getSectionTypeOptions().find(opt => opt.value === newSectionData.type)?.label || '';
    
    if (!finalTitle) return;

    try {
      setLoading(true);
      
      const maxOrder = Math.max(...sections.map(s => s.order_index), 0);
      
      const sectionData = {
        proposal_id: proposalId,
        section_title: finalTitle,
        section_type: newSectionData.type === 'custom' ? 'generic' : newSectionData.type,
        content: getDefaultContent(newSectionData.type === 'custom' ? 'generic' : newSectionData.type),
        order_index: maxOrder + 1,
      };

      // TODO: Replace with new database integration
      const data = null;
      const error = null;
      
      if (error) throw error;
      
      // Update local state
      const updatedSections = [...sections, data];
      onSectionsChange?.(updatedSections);
      
      // Reset form
      setNewSectionData({ title: '', type: 'overview' });
      setShowCustomTitle(false);
      setShowDropdown(false);
      setShowAddSection(false);
    } catch (err) {
      console.error('Error adding section:', err);
      alert('Failed to add section');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionTypeChange = (type: string) => {
    setNewSectionData(prev => ({ ...prev, type }));
    setShowCustomTitle(type === 'custom');
    setShowDropdown(false);
    if (type !== 'custom') {
      setNewSectionData(prev => ({ ...prev, title: '' }));
    }
  };

  const selectType = (type: string) => {
    handleSectionTypeChange(type);
  };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const handleDropdownKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowDropdown(false);
      selectRef.current?.focus();
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
        // TODO: Replace with new database integration
        Promise.resolve(),
        Promise.resolve()
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
    { value: 'custom', label: 'Custom Section' },
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
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Add New Section</h3>
          
          {/* Desktop Layout */}
          <div className="hidden md:block">
            <div className="grid grid-cols-12 gap-4">
              {/* Section Type Dropdown - Takes more space */}
              <div className="col-span-5">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Section Type
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    ref={selectRef}
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white text-sm text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                    aria-haspopup="listbox"
                    aria-expanded={showDropdown}
                  >
                    <span>{getSectionTypeOptions().find(opt => opt.value === newSectionData.type)?.label}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showDropdown && (
                    <div 
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
                      onKeyDown={handleDropdownKeyDown}
                      role="listbox"
                      aria-label="Section type options"
                    >
                      {getSectionTypeOptions().map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => selectType(option.value)}
                          onKeyDown={(e) => handleKeyDown(e, () => selectType(option.value))}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center justify-between transition-colors ${
                            newSectionData.type === option.value ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                          }`}
                          role="option"
                          aria-selected={newSectionData.type === option.value}
                          tabIndex={0}
                        >
                          <span>{option.label}</span>
                          {newSectionData.type === option.value && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Custom Title Input or Spacer */}
              <div className="col-span-5">
                {showCustomTitle ? (
                  <div>
                    <label htmlFor="custom-title-desktop" className="block text-xs font-medium text-gray-700 mb-1">
                      Custom Title
                    </label>
                    <input
                      id="custom-title-desktop"
                      type="text"
                      placeholder="Enter custom section title..."
                      value={newSectionData.title}
                      onChange={(e) => setNewSectionData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500 text-sm"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-end">
                    <div className="w-full h-[38px]" /> {/* Spacer to align buttons */}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="col-span-2 flex gap-2 items-end">
                <Button
                  onClick={handleAddSection}
                  variant="primary"
                  size="sm"
                  disabled={(showCustomTitle && !newSectionData.title.trim()) || loading}
                  loading={loading}
                  className="flex-1"
                >
                  Add
                </Button>
                <Button
                  onClick={() => {
                    setShowAddSection(false);
                    setShowCustomTitle(false);
                    setShowDropdown(false);
                    setNewSectionData({ title: '', type: 'overview' });
                  }}
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
          
          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            {/* Section Type Dropdown */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Type
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                  aria-haspopup="listbox"
                  aria-expanded={showDropdown}
                >
                  <span>{getSectionTypeOptions().find(opt => opt.value === newSectionData.type)?.label}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showDropdown && (
                  <div 
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
                    onKeyDown={handleDropdownKeyDown}
                    role="listbox"
                    aria-label="Section type options"
                  >
                    {getSectionTypeOptions().map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => selectType(option.value)}
                        onKeyDown={(e) => handleKeyDown(e, () => selectType(option.value))}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center justify-between transition-colors ${
                          newSectionData.type === option.value ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                        }`}
                        role="option"
                        aria-selected={newSectionData.type === option.value}
                        tabIndex={0}
                      >
                        <span>{option.label}</span>
                        {newSectionData.type === option.value && (
                          <Check className="w-4 h-4 text-primary-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Custom Title Input - Only shown when Custom Section is selected */}
            {showCustomTitle && (
              <div className="w-full">
                <label htmlFor="custom-title-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Section Title
                </label>
                <input
                  id="custom-title-mobile"
                  type="text"
                  placeholder="Enter custom section title..."
                  value={newSectionData.title}
                  onChange={(e) => setNewSectionData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                  autoFocus
                />
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddSection}
                variant="primary"
                size="sm"
                disabled={(showCustomTitle && !newSectionData.title.trim()) || loading}
                loading={loading}
                className="flex-1"
              >
                Add Section
              </Button>
              <Button
                onClick={() => {
                  setShowAddSection(false);
                  setShowCustomTitle(false);
                  setShowDropdown(false);
                  setNewSectionData({ title: '', type: 'overview' });
                }}
                variant="outline"
                size="sm"
                className="flex-1"
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