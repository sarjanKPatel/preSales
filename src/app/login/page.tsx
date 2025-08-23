'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import ScrollReveal from '@/components/ScrollReveal';
import { Mail, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading, user, profile } = useAuth();
  const { workspaces, workspaceLoading } = useWorkspace();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smart redirect function based on waitlist status and workspace availability
  const handlePostLoginRedirect = () => {
    if (!user || loading || workspaceLoading) return;

    // If user is on waitlist, redirect to waitlist page
    if (profile?.waitlist_status === 'pending') {
      router.push('/waitlist');
      return;
    }

    // If user is approved, redirect to workspace dashboard
    // WorkspaceGate will handle workspace creation if needed
    if (profile?.waitlist_status === 'approved') {
      router.push('/vision');
      return;
    }

    // Default fallback - go to landing page
    router.push('/');
  };

  // Redirect if already logged in
  useEffect(() => {
    handlePostLoginRedirect();
  }, [user, profile, workspaces, loading, workspaceLoading]);

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password');
        } else if (error.message?.includes('invalid email')) {
          setError('Please enter a valid email address');
        } else {
          setError(error.message || 'An error occurred during login');
        }
      } else {
        // Success - redirect will be handled by useEffect when user state changes
        // No immediate redirect needed here
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again');
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      {/* Full-width dot pattern background */}
      <div 
        className="absolute inset-0 w-full h-full dot-grid-bg"
        style={{
          width: '100vw',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      ></div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <ScrollReveal direction="down">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-white" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2L14 8H10L12 2Z" fill="currentColor" opacity="0.9" />
                  <path d="M8 8L6 12L10 10L8 8Z" fill="currentColor" opacity="0.7" />
                  <path d="M16 8L18 12L14 10L16 8Z" fill="currentColor" opacity="0.7" />
                  <circle cx="12" cy="10" r="2" fill="currentColor" />
                  <path d="M6 14L12 16L18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
                  <path d="M7 17L12 18.5L17 17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
                  <path d="M10 16L11 20L12 18L13 20L14 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-600">PropelIQ</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-700 mb-2">Welcome back</h1>
            <p className="text-gray-500">Sign in to your account to continue</p>
          </div>
        </ScrollReveal>

        {/* Form Card */}
        <ScrollReveal direction="up" delay={200}>
          <div className="glass-floating rounded-3xl p-8 border-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50/90 backdrop-blur-sm border border-red-200/50 text-red-700 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center z-10 border border-white/40">
                    <Mail className="w-4 h-4 text-gray-900" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-11 pr-4 py-3 border-0 rounded-xl focus:ring-2 focus:ring-gray-400 focus:outline-none transition-all text-gray-900 placeholder-gray-500"
                    required
                    disabled={isSubmitting}
                    aria-describedby={error ? 'error-message' : undefined}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center z-10 border border-white/40">
                    <Lock className="w-4 h-4 text-gray-900" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Your password"
                    className="w-full pl-11 pr-4 py-3 border-0 rounded-xl focus:ring-2 focus:ring-gray-400 focus:outline-none transition-all text-gray-900 placeholder-gray-500"
                    required
                    disabled={isSubmitting}
                    aria-describedby={error ? 'error-message' : undefined}
                  />
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={isSubmitting}
                >
                  Forgot your password?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-gray-600 hover:bg-gray-700 text-white border-0 rounded-xl"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Sign in
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center pt-6 border-t border-white/30">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link 
                  href="/signup" 
                  className="text-gray-700 hover:text-gray-800 font-medium transition-colors"
                >
                  Sign up for free
                </Link>
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Back to Home */}
        <ScrollReveal direction="up" delay={400}>
          <div className="text-center mt-6">
            <Link 
              href="/" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}