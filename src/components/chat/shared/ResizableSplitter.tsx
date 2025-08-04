'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResizableSplitterProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number; // percentage (0-100)
  minLeftWidth?: number; // percentage
  maxLeftWidth?: number; // percentage
  className?: string;
  onResize?: (leftWidth: number) => void;
}

export default function ResizableSplitter({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 66, // 2/3 default
  minLeftWidth = 30,
  maxLeftWidth = 80,
  className,
  onResize
}: ResizableSplitterProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = leftWidth;
    
    // Add cursor style to body
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - startXRef.current;
    const deltaPercentage = (deltaX / containerRect.width) * 100;
    
    const newLeftWidth = Math.min(
      Math.max(startWidthRef.current + deltaPercentage, minLeftWidth),
      maxLeftWidth
    );
    
    setLeftWidth(newLeftWidth);
    onResize?.(newLeftWidth);
  }, [isDragging, minLeftWidth, maxLeftWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // Remove cursor style from body
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const rightWidth = 100 - leftWidth;

  return (
    <div 
      ref={containerRef}
      className={cn("flex h-full", className)}
    >
      {/* Left Panel */}
      <div 
        style={{ width: `${leftWidth}%` }}
        className={cn(
          "flex-shrink-0",
          !isDragging && "transition-all duration-100 ease-out"
        )}
      >
        {leftPanel}
      </div>

      {/* Splitter Handle */}
      <div
        className={cn(
          "relative w-1 bg-white/20 hover:bg-white/30 cursor-col-resize",
          "transition-colors duration-200 group flex-shrink-0",
          isDragging && "bg-primary/50"
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Visual indicator */}
        <div className={cn(
          "absolute inset-y-0 left-1/2 transform -translate-x-1/2",
          "w-1 bg-white/40 opacity-0 group-hover:opacity-100",
          "transition-opacity duration-200",
          isDragging && "opacity-100 bg-primary"
        )} />
        
        {/* Expanded hover area */}
        <div className="absolute inset-y-0 -left-2 -right-2" />
        
        {/* Grip dots */}
        <div className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "flex flex-col gap-1 opacity-0 group-hover:opacity-100",
          "transition-opacity duration-200",
          isDragging && "opacity-100"
        )}>
          <div className="w-1 h-1 bg-white/60 rounded-full" />
          <div className="w-1 h-1 bg-white/60 rounded-full" />
          <div className="w-1 h-1 bg-white/60 rounded-full" />
        </div>
      </div>

      {/* Right Panel */}
      <div 
        style={{ width: `${rightWidth}%` }}
        className={cn(
          "flex-shrink-0",
          !isDragging && "transition-all duration-100 ease-out"
        )}
      >
        {rightPanel}
      </div>
    </div>
  );
}