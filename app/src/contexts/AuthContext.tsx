import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { pb, signIn, signUp, signOut, getCurrentUser, isAuthenticated } from '../services/pocketbase';
import type { RecordModel } from 'pocketbase';

interface AuthContextType {
  user: RecordModel | null;
  loading: boolean;
  authenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RecordModel | null>(getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if existing auth is still valid
    if (pb.authStore.isValid) {
      setUser(pb.authStore.record);
    }
    setLoading(false);

    // Listen for auth changes
    const unsub = pb.authStore.onChange((_token, record) => {
      setUser(record);
    });
    return () => { unsub(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signIn(email, password);
    setUser(getCurrentUser());
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    await signUp(email, password, displayName);
    setUser(getCurrentUser());
  }, []);

  const logout = useCallback(() => {
    signOut();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const fresh = await pb.collection('users').getOne(pb.authStore.record.id);
      setUser(fresh);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authenticated: isAuthenticated() && !!user,
      login, register, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
