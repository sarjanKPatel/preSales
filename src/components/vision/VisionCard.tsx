'use client';

import React, { memo, useState } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { 
  Trash2,
  Edit2,
  Check,
  X
} from 'lucide-react';
import type { Vision } from '@/types';

interface VisionCardProps {
  vision: Vision;
  onChat?: (vision: Vision) => void;
  onView?: (vision: Vision) => void;
  onEdit?: (vision: Vision) => void;
  onDelete?: (vision: Vision) => void;
  onRename?: (vision: Vision, newTitle: string) => void;
}

const VisionCard = memo(function VisionCard({ vision, onChat, onView, onEdit, onDelete, onRename }: VisionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(vision.title);

  const handleChat = () => {
    if (onView) {
      onView(vision);
    } else if (onChat) {
      onChat(vision);
    }
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this vision?')) {
      onDelete?.(vision);
    }
  };
  
  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(vision);
    } else {
      setIsEditing(true);
      setEditTitle(vision.title);
    }
  };
  
  const handleEditSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim() && editTitle.trim() !== vision.title) {
      onRename?.(vision, editTitle.trim());
    }
    setIsEditing(false);
  };
  
  const handleEditCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditTitle(vision.title);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="group p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.01] max-w-sm w-full" onClick={handleChat}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <div className="mb-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-lg font-semibold mb-2"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center justify-around gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    icon={<Check className="w-4 h-4" />}
                    onClick={handleEditSave}
                    className="flex-1"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    icon={<X className="w-4 h-4" />}
                    onClick={handleEditCancel}
                    className="flex-1"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-gray-900">{vision.title}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    icon={<Edit2 className="w-4 h-4" />}
                    onClick={handleEditStart}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-semibold text-gray-900">{vision.completeness_score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${vision.completeness_score}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-gray-600">
            {formatDate(vision.updated_at)}
          </div>
        </div>
      </div>
    </Card>
  );
});

export default VisionCard;