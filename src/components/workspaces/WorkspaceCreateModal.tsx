'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/Button';
import { X, Building2, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface WorkspaceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WorkspaceCreateModal({ isOpen, onClose, onSuccess }: WorkspaceCreateModalProps) {
  const { createWorkspace, loading: contextLoading } = useWorkspace();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
      // Focus input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { workspace, error } = await createWorkspace(name.trim());
      
      if (error) {
        setError(error.message || 'Failed to create workspace');
      } else if (workspace) {
        setName('');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Create workspace error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setError('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) {
      handleClose();
    }
  };

  if (!isOpen || !isMounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ 
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px) saturate(180%)',
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div 
        className="w-full max-w-md rounded-2xl border border-white/20"
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10"
            style={{ 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              animation: 'float 6s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-5"
            style={{ 
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              animation: 'float 8s ease-in-out infinite reverse'
            }}
          />
        </div>

        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 text-center">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:scale-105 transition-all duration-300 disabled:opacity-50 group"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-white group-hover:text-gray-100" />
          </button>

          <div className="mb-6">
            <div 
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 hover:scale-105 transition-transform duration-300"
              style={{
                background: 'rgba(99, 102, 241, 0.8)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            
            <h2 id="modal-title" className="text-2xl font-bold text-white mb-2">
              Create Your Workspace
            </h2>
            <p className="text-gray-100 leading-relaxed opacity-90">
              Set up your team's hub for AI-powered proposals and collaboration
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8">
          {error && (
            <div 
              className="flex items-start gap-3 p-4 mb-6 rounded-2xl border border-white/20"
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <label htmlFor="workspace-name" className="block text-sm font-semibold text-white mb-4">
              Workspace Name
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="workspace-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="My Company"
                className="w-full px-4 py-4 text-lg font-medium text-white placeholder-gray-300 rounded-2xl focus:scale-[1.02] transition-all duration-300 outline-none border border-white/20"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
                required
                disabled={isSubmitting}
                maxLength={50}
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Building2 className="w-5 h-5 text-gray-300" />
              </div>
            </div>
            <p className="text-sm text-gray-200 mt-3 leading-relaxed opacity-80">
              Choose a name that represents your team or organization
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-6 rounded-2xl font-semibold border border-white/20 hover:scale-105 transition-all duration-300 disabled:opacity-50"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                color: 'white'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || contextLoading || !name.trim()}
              className="flex-1 py-3 px-6 rounded-2xl font-semibold border border-white/20 hover:scale-105 transition-all duration-300 group disabled:opacity-50 disabled:hover:scale-100"
              style={{
                background: 'rgba(99, 102, 241, 0.8)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                color: 'white'
              }}
            >
              {isSubmitting || contextLoading ? (
                'Creating...'
              ) : (
                <>
                  Create Workspace
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}