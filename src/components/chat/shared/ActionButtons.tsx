'use client';

import React from 'react';
import Button from '@/components/Button';

export interface ActionButton {
  id: string;
  label: string;
  action_type: 'skip' | 'approve' | 'add_more';
  field_name?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface UIActions {
  type: 'buttons';
  context?: string;
  actions: ActionButton[];
}

interface ActionButtonsProps {
  ui_actions: UIActions;
  onAction: (actionButton: ActionButton) => void;
  disabled?: boolean;
  className?: string;
}

export default function ActionButtons({ 
  ui_actions, 
  onAction, 
  disabled = false,
  className = '' 
}: ActionButtonsProps) {
  if (!ui_actions || ui_actions.actions.length === 0) {
    return null;
  }

  const handleButtonClick = (actionButton: ActionButton) => {
    if (disabled) return;
    onAction(actionButton);
  };

  const getButtonVariant = (actionType: string): 'primary' | 'secondary' | 'outline' => {
    switch (actionType) {
      case 'approve':
        return 'primary';
      case 'skip':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 mt-3 ${className}`}>
      {ui_actions.actions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant || getButtonVariant(action.action_type)}
          size="sm"
          onClick={() => handleButtonClick(action)}
          disabled={disabled}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}