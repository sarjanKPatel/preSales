'use client';

import React from 'react';
import { X, FileText, Calendar, Target, TrendingUp, Users, Building2, Lightbulb } from 'lucide-react';
import { VisionState } from '@/types';
import { cn } from '@/lib/utils';

interface VisionPreviewProps {
  visionState: VisionState;
  onClose: () => void;
  className?: string;
}

export default function VisionPreview({ visionState, onClose, className }: VisionPreviewProps) {
  const formatArray = (items?: string[]) => {
    if (!items || items.length === 0) return 'Not specified';
    return items.join(', ');
  };

  const renderSection = (title: string, content: string | number | undefined, icon: React.ReactNode) => {
    if (!content) return null;
    
    return (
      <div className="glass rounded-xl p-6 border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-700 leading-relaxed">{content}</p>
      </div>
    );
  };

  const renderArraySection = (title: string, items: string[] | undefined, icon: React.ReactNode) => {
    if (!items || items.length === 0) return null;
    
    return (
      <div className="glass rounded-xl p-6 border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <div className="h-full w-full dot-grid-bg overflow-hidden">
        {/* Content */}
        <div className="p-6 pt-8 overflow-y-auto h-full pb-32">
          {/* Header Card - Same style as other cards */}
          <div className="glass rounded-xl p-8 border border-white/20 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Vision Preview</h1>
                  <p className="text-gray-600">
                    {visionState.company_name ? `${visionState.company_name} Strategic Vision` : 'Strategic Vision Overview'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/60 hover:bg-white/80 rounded-xl flex items-center justify-center transition-colors border border-white/30"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="space-y-6">
            {/* Company Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSection(
                "Company Name",
                visionState.company_name,
                <Building2 className="w-5 h-5 text-primary" />
              )}
              {renderSection(
                "Industry",
                visionState.industry,
                <TrendingUp className="w-5 h-5 text-primary" />
              )}
            </div>

            {/* Vision Statement */}
            {visionState.vision_statement && (
              <div className="glass rounded-xl p-8 border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Vision Statement</h2>
                </div>
                <blockquote className="text-lg text-gray-800 leading-relaxed italic border-l-4 border-primary pl-6">
                  "{visionState.vision_statement}"
                </blockquote>
              </div>
            )}

            {/* Key Themes */}
            {renderArraySection(
              "Key Themes",
              visionState.key_themes,
              <Target className="w-5 h-5 text-primary" />
            )}

            {/* Strategic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSection(
                "Market Size",
                visionState.market_size,
                <TrendingUp className="w-5 h-5 text-primary" />
              )}
              {renderSection(
                "Company Size",
                visionState.company_size ? `${visionState.company_size} employees` : undefined,
                <Users className="w-5 h-5 text-primary" />
              )}
            </div>

            {/* Timeline and Strategy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSection(
                "Timeline",
                visionState.timeline,
                <Calendar className="w-5 h-5 text-primary" />
              )}
              {renderSection(
                "Current Strategy",
                visionState.current_strategy,
                <Target className="w-5 h-5 text-primary" />
              )}
            </div>

            {/* Strategic Priorities */}
            {renderArraySection(
              "Strategic Priorities",
              visionState.strategic_priorities,
              <Target className="w-5 h-5 text-primary" />
            )}

            {/* Success Metrics */}
            {renderArraySection(
              "Success Metrics",
              visionState.success_metrics,
              <TrendingUp className="w-5 h-5 text-primary" />
            )}

            {/* Target Outcomes */}
            {renderArraySection(
              "Target Outcomes",
              visionState.target_outcomes,
              <Target className="w-5 h-5 text-primary" />
            )}

            {/* Business Context */}
            <div className="space-y-6">
              {renderSection(
                "Competitive Landscape",
                visionState.competitive_landscape,
                <TrendingUp className="w-5 h-5 text-primary" />
              )}

              {renderArraySection(
                "Constraints",
                visionState.constraints,
                <Target className="w-5 h-5 text-primary" />
              )}

              {renderArraySection(
                "Assumptions",
                visionState.assumptions,
                <Lightbulb className="w-5 h-5 text-primary" />
              )}
            </div>

            {/* Custom Fields */}
            {visionState.custom_fields && Object.keys(visionState.custom_fields).length > 0 && (
              <div className="glass rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(visionState.custom_fields).map(([key, value]) => (
                    <div key={key} className="bg-white/50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 capitalize mb-1">
                        {key.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-gray-700 text-sm">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {visionState.metadata && (
              <div className="glass rounded-xl p-6 border border-white/20 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vision Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {visionState.metadata.status && (
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={cn(
                        "ml-2 px-2 py-1 rounded-full text-xs font-medium capitalize",
                        visionState.metadata.status === 'completed' ? "bg-green-100 text-green-700" :
                        visionState.metadata.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      )}>
                        {visionState.metadata.status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  {visionState.metadata.validation_score !== undefined && (
                    <div>
                      <span className="font-medium text-gray-700">Completeness:</span>
                      <span className="ml-2">{visionState.metadata.validation_score}%</span>
                    </div>
                  )}
                  {visionState.metadata.created_at && (
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <span className="ml-2">{new Date(visionState.metadata.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}