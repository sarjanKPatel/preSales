'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  
  // Pages that should NOT show the header
  const noHeaderPages = ['/login', '/signup'];
  const shouldShowHeader = !noHeaderPages.includes(pathname);

  if (!shouldShowHeader) {
    // For auth pages, just return the children without header
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  // For authenticated pages, show header
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}