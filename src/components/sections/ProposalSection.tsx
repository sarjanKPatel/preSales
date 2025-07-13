'use client';

import React, { useState } from 'react';
import { ProposalSection } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Edit3, 
  Save, 
  X, 
  Bot, 
  Trash2, 
  GripVertical,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import Button from '@/components/Button';

interface ProposalSectionProps {
  section: ProposalSection;
  onUpdate?: (sectionId: string, updates: Partial<ProposalSection>) => void;
  onDelete?: (sectionId: string) => void;
  editable?: boolean;
  collapsible?: boolean;
  dragHandle?: boolean;
}

export default function ProposalSectionComponent({ 
  section, 
  onUpdate, 
  onDelete,
  editable = true,
  collapsible = true,
  dragHandle = false
}: ProposalSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editedTitle, setEditedTitle] = useState(section.section_title);
  const [editedContent, setEditedContent] = useState(section.content);

  const handleSave = () => {
    if (!onUpdate) return;
    
    onUpdate(section.id, {
      section_title: editedTitle,
      content: editedContent,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(section.section_title);
    setEditedContent(section.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (confirm(`Are you sure you want to delete "${section.section_title}"?`)) {
      onDelete(section.id);
    }
  };

  const renderContent = () => {
    const content = isEditing ? editedContent : section.content;
    
    switch (section.section_type) {
      case 'overview':
        return (
          <OverviewContent 
            content={content} 
            isEditing={isEditing}
            onChange={setEditedContent}
          />
        );
      case 'stakeholders':
        return (
          <StakeholdersContent 
            content={content} 
            isEditing={isEditing}
            onChange={setEditedContent}
          />
        );
      case 'challenges':
        return (
          <ChallengesContent 
            content={content} 
            isEditing={isEditing}
            onChange={setEditedContent}
          />
        );
      case 'solution':
        return (
          <SolutionContent 
            content={content} 
            isEditing={isEditing}
            onChange={setEditedContent}
          />
        );
      case 'roi':
        return (
          <ROIContent 
            content={content} 
            isEditing={isEditing}
            onChange={setEditedContent}
          />
        );
      default:
        return (
          <GenericContent 
            content={content} 
            isEditing={isEditing}
            onChange={setEditedContent}
          />
        );
    }
  };

  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-lg',
      section.is_ai_generated && 'ring-2 ring-primary-100 border-primary-200'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {dragHandle && (
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
          )}
          
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-gray-100"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}

          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">
                {section.section_title}
              </h3>
            )}
          </div>

          {section.is_ai_generated && (
            <div className="flex items-center px-2 py-1 bg-primary-50 text-primary-600 rounded text-xs font-medium">
              <Bot className="w-3 h-3 mr-1" />
              AI Generated
            </div>
          )}
        </div>

        {/* Actions */}
        {editable && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSave}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4">
          {renderContent()}
        </div>
      )}
    </div>
  );
}

// Content Components for different section types

function OverviewContent({ content, isEditing, onChange }: any) {
  if (isEditing) {
    return (
      <textarea
        value={content.text || ''}
        onChange={(e) => onChange({ ...content, text: e.target.value })}
        placeholder="Enter company overview..."
        rows={4}
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-500"
      />
    );
  }

  return (
    <div className="text-gray-700">
      {content.text || (
        <p className="text-gray-400 italic">No overview content yet.</p>
      )}
    </div>
  );
}

function StakeholdersContent({ content, isEditing, onChange }: any) {
  const stakeholders = content.stakeholders || [];

  if (isEditing) {
    const addStakeholder = () => {
      const newStakeholders = [...stakeholders, {
        name: '',
        role: '',
        influence: 'medium',
        notes: ''
      }];
      onChange({ ...content, stakeholders: newStakeholders });
    };

    const updateStakeholder = (index: number, field: string, value: string) => {
      const newStakeholders = [...stakeholders];
      newStakeholders[index] = { ...newStakeholders[index], [field]: value };
      onChange({ ...content, stakeholders: newStakeholders });
    };

    const removeStakeholder = (index: number) => {
      const newStakeholders = stakeholders.filter((_: any, i: number) => i !== index);
      onChange({ ...content, stakeholders: newStakeholders });
    };

    return (
      <div className="space-y-3">
        {stakeholders.map((stakeholder: any, index: number) => (
          <div key={index} className="p-3 border border-gray-200 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <input
                type="text"
                placeholder="Name"
                value={stakeholder.name}
                onChange={(e) => updateStakeholder(index, 'name', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="Role"
                value={stakeholder.role}
                onChange={(e) => updateStakeholder(index, 'role', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
              />
              <select
                value={stakeholder.influence}
                onChange={(e) => updateStakeholder(index, 'influence', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
              >
                <option value="low">Low Influence</option>
                <option value="medium">Medium Influence</option>
                <option value="high">High Influence</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Notes"
                value={stakeholder.notes}
                onChange={(e) => updateStakeholder(index, 'notes', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeStakeholder(index)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          onClick={addStakeholder}
          variant="outline"
          size="sm"
        >
          Add Stakeholder
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stakeholders.length === 0 ? (
        <p className="text-gray-400 italic">No stakeholders added yet.</p>
      ) : (
        stakeholders.map((stakeholder: any, index: number) => (
          <div key={index} className="p-3 bg-gray-50 rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900">{stakeholder.name}</span>
              <span className={cn(
                'px-2 py-1 text-xs rounded-full',
                stakeholder.influence === 'high' && 'bg-red-100 text-red-700',
                stakeholder.influence === 'medium' && 'bg-yellow-100 text-yellow-700',
                stakeholder.influence === 'low' && 'bg-green-100 text-green-700'
              )}>
                {stakeholder.influence} influence
              </span>
            </div>
            <p className="text-sm text-gray-600">{stakeholder.role}</p>
            {stakeholder.notes && (
              <p className="text-sm text-gray-500 mt-1">{stakeholder.notes}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ChallengesContent({ content, isEditing, onChange }: any) {
  // Similar pattern to stakeholders but for challenges
  const challenges = content.challenges || [];

  if (isEditing) {
    // Edit mode implementation
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Edit challenges implementation coming soon...</p>
        <textarea
          value={JSON.stringify(content, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {}
          }}
          rows={6}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm text-gray-900 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.length === 0 ? (
        <p className="text-gray-400 italic">No challenges identified yet.</p>
      ) : (
        challenges.map((challenge: any, index: number) => (
          <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium text-gray-900 mb-1">{challenge.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{challenge.description}</p>
            <div className="flex gap-2">
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                {challenge.impact} impact
              </span>
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                {challenge.urgency} urgency
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SolutionContent({ content, isEditing, onChange }: any) {
  const solutions = content.solutions || [];

  if (isEditing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Edit solutions implementation coming soon...</p>
        <textarea
          value={JSON.stringify(content, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {}
          }}
          rows={6}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm text-gray-900 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {solutions.length === 0 ? (
        <p className="text-gray-400 italic">No solutions proposed yet.</p>
      ) : (
        solutions.map((solution: any, index: number) => (
          <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-gray-900 mb-1">{solution.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{solution.description}</p>
            {solution.benefits && solution.benefits.length > 0 && (
              <ul className="text-sm text-green-700 list-disc list-inside">
                {solution.benefits.map((benefit: string, idx: number) => (
                  <li key={idx}>{benefit}</li>
                ))}
              </ul>
            )}
            {solution.implementation_timeline && (
              <p className="text-xs text-gray-500 mt-2">
                Timeline: {solution.implementation_timeline}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ROIContent({ content, isEditing, onChange }: any) {
  const metrics = content.metrics || [];

  if (isEditing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Edit ROI metrics implementation coming soon...</p>
        <textarea
          value={JSON.stringify(content, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {}
          }}
          rows={6}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm text-gray-900 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {metrics.length === 0 ? (
        <p className="text-gray-400 italic">No ROI metrics defined yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">Metric</th>
                <th className="text-left py-2">Current</th>
                <th className="text-left py-2">Projected</th>
                <th className="text-left py-2">Improvement</th>
                <th className="text-left py-2">Timeframe</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric: any, index: number) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2 font-medium">{metric.metric}</td>
                  <td className="py-2 text-gray-600">{metric.current_value}</td>
                  <td className="py-2 text-green-600">{metric.projected_value}</td>
                  <td className="py-2 text-primary-600">{metric.improvement}</td>
                  <td className="py-2 text-gray-500">{metric.timeframe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GenericContent({ content, isEditing, onChange }: any) {
  if (isEditing) {
    return (
      <textarea
        value={JSON.stringify(content, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {}
        }}
        rows={6}
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm text-gray-900 bg-white"
      />
    );
  }

  return (
    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}