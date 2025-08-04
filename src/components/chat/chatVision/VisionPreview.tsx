'use client';

import React from 'react';
import { 
  FileText, 
  Target, 
  Lightbulb, 
  TrendingUp, 
  Users,
  Save
} from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';

export interface DraftVision {
  mission?: string;
  values?: string;
  goals?: string;
  uniqueValue?: string;
  companyName?: string;
}

interface VisionPreviewProps {
  draftVision: DraftVision;
  onSave: (vision: DraftVision) => void;
  isSaving?: boolean;
}

export default function VisionPreview({
  draftVision,
  onSave,
  isSaving = false
}: VisionPreviewProps) {
  const hasContent = draftVision.mission || draftVision.values || 
                    draftVision.goals || draftVision.uniqueValue;

  return (
    <div className="w-full h-full glass-heavy border-l border-white/20 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/20">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Vision Preview</h2>
        {draftVision.companyName && (
          <p className="text-sm text-gray-600">For: {draftVision.companyName}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasContent ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 glass bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">No vision content yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Start chatting to build your vision
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {draftVision.mission && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 glass bg-primary/20 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Mission Statement</h3>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {draftVision.mission}
                </p>
              </Card>
            )}

            {draftVision.values && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 glass bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Core Values</h3>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {draftVision.values}
                </p>
              </Card>
            )}

            {draftVision.goals && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 glass bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Strategic Goals</h3>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {draftVision.goals}
                </p>
              </Card>
            )}

            {draftVision.uniqueValue && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 glass bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Unique Value Proposition</h3>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {draftVision.uniqueValue}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasContent && (
        <div className="p-4 border-t border-white/20">
          <Button
            variant="primary"
            className="w-full"
            icon={<Save className="w-4 h-4" />}
            onClick={() => onSave(draftVision)}
            loading={isSaving}
            disabled={isSaving}
          >
            Save Vision
          </Button>
        </div>
      )}
    </div>
  );
}