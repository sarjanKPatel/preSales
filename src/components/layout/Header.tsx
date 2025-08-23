'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Button from '@/components/Button';
import WorkspaceSwitcher from '@/components/workspaces/WorkspaceSwitcher';
import { 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X
} from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isUserMenuClosing, setIsUserMenuClosing] = useState(false);
  const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Functions to handle animated closing
  const closeUserMenu = () => {
    setIsUserMenuClosing(true);
    setTimeout(() => {
      setShowUserMenu(false);
      setIsUserMenuClosing(false);
    }, 150);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuClosing(true);
    setTimeout(() => {
      setShowMobileMenu(false);
      setIsMobileMenuClosing(false);
    }, 150);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        closeUserMenu();
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        closeMobileMenu();
      }
    }

    if (showUserMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showMobileMenu]);

  const handleSignOut = async () => {
    await signOut();
    closeUserMenu();
    router.push('/login');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  const handleCreateWorkspace = () => {
    router.push('/workspace-setup');
  };

  // Removed handleWorkspaceCreated as we no longer use modal

  return (
    <>
    <header className="fixed top-4 left-4 right-4 z-50 rounded-2xl">
      <div className="glass-floating glass-floating-scroll px-4 sm:px-6 lg:px-8 rounded-2xl">
        <div className="flex items-center justify-between h-16 gap-5">
          {/* Left: Logo and Workspace Switcher */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="flex items-center space-x-2">
              {/* Icon - links to landing page */}
              <Link 
                href="/" 
                className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
              >
                <svg 
                  className="w-5 h-5 text-white" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Rocket body */}
                  <path 
                    d="M12 2L14 8H10L12 2Z" 
                    fill="currentColor" 
                    opacity="0.9"
                  />
                  {/* Rocket fins */}
                  <path 
                    d="M8 8L6 12L10 10L8 8Z" 
                    fill="currentColor" 
                    opacity="0.7"
                  />
                  <path 
                    d="M16 8L18 12L14 10L16 8Z" 
                    fill="currentColor" 
                    opacity="0.7"
                  />
                  {/* Central propulsion */}
                  <circle 
                    cx="12" 
                    cy="10" 
                    r="2" 
                    fill="currentColor"
                  />
                  {/* Data streams */}
                  <path 
                    d="M6 14L12 16L18 14" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.8"
                  />
                  <path 
                    d="M7 17L12 18.5L17 17" 
                    stroke="currentColor" 
                    strokeWidth="1.2" 
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.6"
                  />
                  {/* Propulsion flames */}
                  <path 
                    d="M10 16L11 20L12 18L13 20L14 16" 
                    stroke="currentColor" 
                    strokeWidth="1" 
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.5"
                  />
                </svg>
              </Link>
              
              {/* Brand text - links to current destination */}
              <Link 
                href="/" 
                className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer"
                style={{textDecoration: 'none'}}
              >
                <span className="text-lg sm:text-xl font-bold text-gray-600">PropelIQ</span>
                <span className="text-xs text-gray-400 -mt-1 hidden sm:block">AI Pre-Sales</span>
              </Link>
            </div>
            
            {/* Desktop Workspace Switcher - hidden when space is limited */}
            <div className="hidden lg:block">
              {authLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded-lg animate-pulse w-32 h-10">
                  <div className="w-4 h-4 bg-gray-300 rounded" />
                  <div className="flex-1 h-4 bg-gray-300 rounded" />
                  <div className="w-4 h-4 bg-gray-300 rounded" />
                </div>
              ) : user ? (
                <WorkspaceSwitcher 
                  onCreateWorkspace={handleCreateWorkspace}
                  compact={true}
                  useFixedDropdown={true}
                />
              ) : null}
            </div>
          </div>

          {/* Center: Desktop Navigation - hidden when space is limited */}
          <nav className="hidden lg:flex items-center justify-center space-x-6 flex-shrink-0">
            <Link 
              href="/workspace" 
              className="text-gray-500 hover:text-gray-700 transition-colors font-medium whitespace-nowrap"
            >
              Home
            </Link>
            <Link 
              href="/vision" 
              className="text-gray-500 hover:text-gray-700 transition-colors font-medium whitespace-nowrap"
            >
              Vision
            </Link>
            <Link 
              href="/leads" 
              className="text-gray-500 hover:text-gray-700 transition-colors font-medium whitespace-nowrap"
            >
              Leads
            </Link>
            <Link 
              href="/proposals" 
              className="text-gray-500 hover:text-gray-700 transition-colors font-medium whitespace-nowrap"
            >
              Proposals
            </Link>
            <Link 
              href="/chat" 
              className="text-gray-500 hover:text-gray-700 transition-colors font-medium whitespace-nowrap"
            >
              AI Assistant
            </Link>
          </nav>

          {/* Right: User Menu */}
          <div className="flex items-center justify-end space-x-2 flex-shrink-0">
            {authLoading ? (
              // Show skeleton while auth is loading
              <div className="flex items-center space-x-2 sm:space-x-3 p-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="hidden sm:block">
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse hidden sm:block" />
              </div>
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => showUserMenu ? closeUserMenu() : setShowUserMenu(true)}
                  className="flex items-center space-x-2 sm:space-x-3 p-1 sm:p-2 rounded-lg glass hover:bg-white/20 transition-all"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-600">
                      {profile?.full_name ? profile.full_name.split(' ')[0] : user.email?.split('@')[0]}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                </button>

              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" onClick={handleSignIn}>
                  Sign In
                </Button>
                <Button variant="primary" size="sm" onClick={handleSignUp}>
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile Menu Button - shows when navigation is hidden */}
            <button
              onClick={() => showMobileMenu ? closeMobileMenu() : setShowMobileMenu(true)}
              className="lg:hidden p-2 rounded-lg glass hover:bg-white/20 transition-all"
            >
              {showMobileMenu ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu - shows when navigation is hidden */}
        {showMobileMenu && (
          <div className={`lg:hidden border-t border-white/20 py-4 glass transform transition-all duration-150 ease-out z-[60] ${
            isMobileMenuClosing ? 'animate-slide-up' : 'animate-slide-down'
          }`} ref={mobileMenuRef}>
            {/* Mobile Workspace Switcher - shows when hidden from main header */}
            {user && (
              <div className="lg:hidden px-2 pb-4 border-b border-white/20 mb-4">
                <WorkspaceSwitcher 
                  onCreateWorkspace={() => {
                    closeMobileMenu();
                    handleCreateWorkspace();
                  }}
                  compact={false}
                  useFixedDropdown={false}
                />
              </div>
            )}
            
            <nav className="flex flex-col space-y-1">
              <Link 
                href="/workspace"
                onClick={closeMobileMenu} 
                className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
              >
                Home
              </Link>
              <Link 
                href="/vision"
                onClick={closeMobileMenu} 
                className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
              >
                Vision
              </Link>
              <Link 
                href="/leads"
                onClick={closeMobileMenu} 
                className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
              >
                Leads
              </Link>
              <Link 
                href="/proposals"
                onClick={closeMobileMenu} 
                className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
              >
                Proposals
              </Link>
              <Link 
                href="/chat"
                onClick={closeMobileMenu} 
                className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm font-medium text-gray-900"
              >
                AI Assistant
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>

    {/* User Dropdown - Outside header container */}
    {showUserMenu && user && (
      <div 
        className={`fixed top-20 right-8 w-48 glass-heavy rounded-lg shadow-lg py-1 z-[60] transform transition-all duration-150 ease-out ${
          isUserMenuClosing ? 'animate-dropdown-out' : 'animate-dropdown-in'
        }`}
        ref={userMenuRef}
      >
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-900">
            {profile?.full_name ? profile.full_name.split(' ')[0] : 'User'}
          </div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
        <button
          onClick={() => {
            closeUserMenu();
            router.push('/settings');
          }}
          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-white/20 transition-all"
        >
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50/50 transition-all"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </button>
      </div>
    )}

    </>
  );
}