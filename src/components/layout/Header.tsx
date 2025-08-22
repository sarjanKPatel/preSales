'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Button from '@/components/Button';
import WorkspaceSwitcher from '@/components/workspaces/WorkspaceSwitcher';
import WorkspaceCreateModal from '@/components/workspaces/WorkspaceCreateModal';
import { 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Brain
} from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    setShowCreateModal(true);
  };

  const handleWorkspaceCreated = () => {
    // The WorkspaceContext will handle refreshing automatically
    setShowCreateModal(false);
  };

  return (
    <header className="glass-heavy sticky top-0 z-50 border-b border-white/20">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center h-16 relative">
          {/* Left: Logo and Workspace Switcher */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Icon - links to landing page */}
              <Link 
                href="/" 
                className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
              >
                <Brain className="w-5 h-5 text-white" />
              </Link>
              
              {/* Brand text - links to current destination */}
              <Link 
                href="/" 
                className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer no-underline"
              >
                <span className="text-lg sm:text-xl font-bold text-gray-900">PropelIQ</span>
                <span className="text-xs text-gray-500 -mt-1 hidden sm:block">AI Pre-Sales</span>
              </Link>
            </div>
            
            {/* Desktop Workspace Switcher - always reserve space to prevent layout shift */}
            <div className="hidden md:block min-w-[128px]">
              {authLoading ? (
                // Show skeleton while auth is loading
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded-lg animate-pulse max-w-32 h-10">
                  <div className="w-4 h-4 bg-gray-300 rounded" />
                  <div className="flex-1 h-4 bg-gray-300 rounded" />
                  <div className="w-4 h-4 bg-gray-300 rounded" />
                </div>
              ) : user ? (
                // Show workspace switcher when authenticated
                <WorkspaceSwitcher 
                  onCreateWorkspace={handleCreateWorkspace}
                  compact={true}
                />
              ) : (
                // Empty space when not authenticated
                <div className="h-10" />
              )}
            </div>
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center space-x-6">
            <Link 
              href="/vision" 
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Company Vision
            </Link>
            <Link 
              href="/leads" 
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Lead Information
            </Link>
            <Link 
              href="/proposals" 
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Proposals
            </Link>
            <Link 
              href="/chat" 
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              AI Chat
            </Link>
          </nav>

          {/* Right: User Menu */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-4">
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
                    <div className="text-sm font-medium text-gray-900">
                      {profile?.full_name ? profile.full_name.split(' ')[0] : user.email?.split('@')[0]}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className={`absolute right-0 mt-2 w-48 glass-heavy rounded-lg shadow-lg py-1 z-50 transform transition-all duration-150 ease-out ${
                    isUserMenuClosing ? 'animate-dropdown-out' : 'animate-dropdown-in'
                  }`}>
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

            {/* Mobile Menu Button */}
            <button
              onClick={() => showMobileMenu ? closeMobileMenu() : setShowMobileMenu(true)}
              className="md:hidden p-2 rounded-lg glass hover:bg-white/20 transition-all"
            >
              {showMobileMenu ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className={`md:hidden border-t border-white/20 py-4 glass transform transition-all duration-150 ease-out ${
            isMobileMenuClosing ? 'animate-slide-up' : 'animate-slide-down'
          }`} ref={mobileMenuRef}>
            {/* Mobile Workspace Switcher */}
            {user && (
              <div className="px-2 pb-4 border-b border-white/20 mb-4">
                <WorkspaceSwitcher 
                  onCreateWorkspace={() => {
                    handleCreateWorkspace();
                    closeMobileMenu();
                  }}
                  compact={false}
                />
              </div>
            )}
            
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/vision"
                onClick={closeMobileMenu} 
                className="text-gray-600 hover:text-primary transition-colors font-medium px-2 py-1"
              >
                Company Vision
              </Link>
              <Link 
                href="/leads"
                onClick={closeMobileMenu} 
                className="text-gray-600 hover:text-primary transition-colors font-medium px-2 py-1"
              >
                Lead Information
              </Link>
              <Link 
                href="/proposals"
                onClick={closeMobileMenu} 
                className="text-gray-600 hover:text-primary transition-colors font-medium px-2 py-1"
              >
                Proposals
              </Link>
              <Link 
                href="/chat"
                onClick={closeMobileMenu} 
                className="text-gray-600 hover:text-primary transition-colors font-medium px-2 py-1"
              >
                AI Chat
              </Link>
            </nav>
          </div>
        )}
      </div>


      {/* Workspace Create Modal */}
      <WorkspaceCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleWorkspaceCreated}
      />
    </header>
  );
}