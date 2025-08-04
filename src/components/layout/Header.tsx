'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Button from '@/components/Button';
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
  const { user, profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
    router.push('/');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  return (
    <header className="glass-heavy sticky top-0 z-50 border-b border-white/20">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">PropelIQ</span>
              <span className="text-xs text-gray-500 -mt-1">AI Pre-Sales</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a 
              href="/vision" 
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Company Vision
            </a>
            <a 
              href="/leads" 
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Lead Information
            </a>
            <a 
              href="/proposals" 
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              Proposals
            </a>
            <a 
              href="/chat" 
              className="text-gray-600 hover:text-primary transition-colors font-medium"
            >
              AI Chat
            </a>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 rounded-lg glass hover:bg-white/20 transition-all"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {profile?.full_name || user.email}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {profile?.role?.replace('_', ' ')}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 glass-heavy rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">
                        {profile?.full_name || 'User'}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <a
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-white/20 transition-all"
                    >
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </a>
                    <a
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-white/20 transition-all"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </a>
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
              onClick={() => setShowMobileMenu(!showMobileMenu)}
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
          <div className="md:hidden border-t border-white/20 py-4 glass">
            <nav className="flex flex-col space-y-3">
              <a 
                href="/vision" 
                className="text-gray-600 hover:text-primary transition-colors font-medium px-2 py-1"
              >
                Company Vision
              </a>
              <a 
                href="/leads" 
                className="text-gray-600 hover:text-primary transition-colors font-medium px-2 py-1"
              >
                Lead Information
              </a>
              <a 
                href="/proposals" 
                className="text-gray-600 hover:text-primary transition-colors font-medium px-2 py-1"
              >
                Proposals
              </a>
              <a 
                href="/chat" 
                className="text-gray-600 hover:text-primary transition-colors font-medium px-2 py-1"
              >
                AI Chat
              </a>
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showMobileMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowUserMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}
    </header>
  );
}