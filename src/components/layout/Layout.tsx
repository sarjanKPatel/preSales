'use client';

import React from 'react';
import Header from './Header';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
  padding?: boolean;
}

export default function Layout({ 
  children, 
  className,
  maxWidth = '7xl',
  padding = true 
}: LayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className={cn(
        'flex-1',
        maxWidth !== 'full' ? `mx-auto ${maxWidthClasses[maxWidth]}` : 'w-full',
        padding && 'px-4 sm:px-6 lg:px-8 py-6',
        className
      )}>
        {children}
      </main>
    </div>
  );
}