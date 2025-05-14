'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../app/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import dayjs from 'dayjs'; // npm install dayjs

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let logoutTimeout: NodeJS.Timeout | null = null;

    const setAutoLogout = (expiresAt: number | undefined) => {
      if (logoutTimeout) clearTimeout(logoutTimeout);
      if (!expiresAt) return;
      const msUntilExpiry = expiresAt * 1000 - Date.now();
      if (msUntilExpiry > 0) {
        logoutTimeout = setTimeout(() => {
          // Optionally, show a warning before logout
          // alert('Session expired. You will be logged out.');
          signOut();
        }, msUntilExpiry);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setAutoLogout(session?.expires_at);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      setAutoLogout(data.session?.expires_at);
    });

    return () => {
      listener?.subscription.unsubscribe();
      if (logoutTimeout) clearTimeout(logoutTimeout);
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
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
} 