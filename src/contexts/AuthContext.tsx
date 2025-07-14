'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { auth } from '@/lib/supabase';
import { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Only run auth logic on the client
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { user: currentUser } = await auth.getCurrentUser();
        if (!mounted) return;
        
        setUser(currentUser);
        
        if (currentUser) {
          // TODO: Fetch user profile from profiles table
          // For now, create a basic profile from auth user
          setProfile({
            id: currentUser.id,
            email: currentUser.email || '',
            full_name: currentUser.user_metadata?.full_name || null,
            role: 'sales_executive',
            created_at: currentUser.created_at,
            updated_at: currentUser.updated_at || currentUser.created_at,
          });
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setUser(session?.user || null);
      
      if (session?.user) {
        // TODO: Fetch user profile from profiles table
        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || null,
          role: 'sales_executive',
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || session.user.created_at,
        });
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (typeof window === 'undefined') {
      return { error: new Error('Auth not available on server') };
    }
    
    setLoading(true);
    try {
      const { error } = await auth.signIn(email, password);
      return { error };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (typeof window === 'undefined') {
      return { error: new Error('Auth not available on server') };
    }
    
    setLoading(true);
    try {
      const { error } = await auth.signUp(email, password, fullName);
      return { error };
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (typeof window === 'undefined') {
      return;
    }
    
    setLoading(true);
    try {
      await auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user: mounted ? user : null,
    profile: mounted ? profile : null,
    loading: mounted ? loading : true,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}