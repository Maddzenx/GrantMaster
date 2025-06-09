"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  showLogoutWarning: boolean;
  dismissLogoutWarning: () => void;
  logOutEverywhere: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const logoutTimeout = useRef<NodeJS.Timeout | null>(null);
  const warningTimeout = useRef<NodeJS.Timeout | null>(null);
  const initialSessionChecked = useRef(false);

  // Helper to set auto-logout timer and warning
  const setAutoLogout = (expiresAt: number | undefined) => {
    if (logoutTimeout.current) clearTimeout(logoutTimeout.current);
    if (warningTimeout.current) clearTimeout(warningTimeout.current);
    setShowLogoutWarning(false);
    if (!expiresAt) return;
    const msUntilExpiry = expiresAt * 1000 - Date.now();
    const msUntilWarning = msUntilExpiry - 60_000; // 1 minute before expiry
    if (msUntilWarning > 0) {
      warningTimeout.current = setTimeout(() => {
        setShowLogoutWarning(true);
      }, msUntilWarning);
    } else if (msUntilExpiry > 0) {
      setShowLogoutWarning(true);
    }
    if (msUntilExpiry > 0) {
      logoutTimeout.current = setTimeout(() => {
        signOut();
      }, msUntilExpiry);
    }
  };

  const dismissLogoutWarning = () => setShowLogoutWarning(false);

  useEffect(() => {
    console.log('AuthContext useEffect running');
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSession(session);
      setAutoLogout(session?.expires_at);
      initialSessionChecked.current = true;
      setLoading(false);
      console.log('AuthContext getSession: user =', session?.user);
      console.log('AuthContext getSession: setLoading(false) called');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
      setAutoLogout(session?.expires_at);
      console.log('AuthContext onAuthStateChange: user =', session?.user);
      // Only set loading to false if initial session check is done
      if (initialSessionChecked.current) {
        setLoading(false);
        console.log('AuthContext onAuthStateChange: setLoading(false) called');
      }
    });

    return () => {
      subscription.unsubscribe();
      if (logoutTimeout.current) clearTimeout(logoutTimeout.current);
      if (warningTimeout.current) clearTimeout(warningTimeout.current);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) throw new Error(error.message);
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    setLoading(true);
    if (logoutTimeout.current) clearTimeout(logoutTimeout.current);
    if (warningTimeout.current) clearTimeout(warningTimeout.current);
    setShowLogoutWarning(false);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) throw new Error(error.message);
  };

  // Log out everywhere (all devices/sessions)
  const logOutEverywhere = async () => {
    setLoading(true);
    if (logoutTimeout.current) clearTimeout(logoutTimeout.current);
    if (warningTimeout.current) clearTimeout(warningTimeout.current);
    setShowLogoutWarning(false);
    // @ts-ignore: signOut({ scope: 'global' }) is supported in Supabase JS v2+
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setLoading(false);
    if (error) throw new Error(error.message);
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword, showLogoutWarning, dismissLogoutWarning, logOutEverywhere }}>
      {loading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext }; 