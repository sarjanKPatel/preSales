'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { auth, db } from '@/lib/supabase';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchProfile = async (user: User) => {
    if (!user) return;
    
    try {
      // First try to get profile from database
      const { data: profileData, error } = await db.getMyProfile();
      
      if (profileData && !error) {
        setProfile(profileData);
      } else {
        // Fallback to user metadata if no profile exists yet
        setProfile({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || null,
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to user metadata on error
      setProfile({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || null,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      });
    }
  };

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
        const { data: { session }, error } = await auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          setSession(null);
          setUser(null);
          setProfile(null);
        } else if (session) {
          setSession(session);
          setUser(session.user);
          
          // Get profile data
          await fetchProfile(session.user);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
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
      
      setSession(session);
      
      if (session?.user) {
        setUser(session.user);
        
        // Check for pending full name from signup
        const pendingFullName = sessionStorage.getItem('pendingFullName');
        if (pendingFullName && event === 'SIGNED_IN') {
          try {
            await db.upsertProfile(pendingFullName);
            sessionStorage.removeItem('pendingFullName');
          } catch (profileError) {
            console.error('Error creating profile with full name:', profileError);
          }
        }
        
        await fetchProfile(session.user);
      } else {
        setUser(null);
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
      const { error } = await auth.signUp(email, password);
      
      if (!error && fullName) {
        // Store full name temporarily to use when auth state changes
        sessionStorage.setItem('pendingFullName', fullName);
      }
      
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
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user);
  };

  const value: AuthContextType = {
    user: mounted ? user : null,
    profile: mounted ? profile : null,
    session: mounted ? session : null,
    loading: mounted ? loading : true,
    signIn,
    signUp,
    signOut,
    refreshProfile,
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