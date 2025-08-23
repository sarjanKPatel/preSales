'use client';

import React from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  delay?: number;
  threshold?: number;
  className?: string;
  stagger?: number;
}

export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  threshold = 0.1,
  className,
  stagger,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal({
    threshold,
    delay,
    triggerOnce: true,
  });

  const directionClass = direction === 'fade' ? '' : `scroll-reveal-${direction}`;
  const staggerClass = stagger ? `scroll-stagger-${stagger}` : '';

  return (
    <div
      ref={ref}
      className={cn(
        'scroll-reveal',
        directionClass,
        staggerClass,
        isVisible && 'visible',
        className
      )}
    >
      {children}
    </div>
  );
}