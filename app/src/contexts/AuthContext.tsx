import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  pb, signIn, signUp, signOut, getCurrentUser, isAuthenticated,
  pedirArmazenamentoPersistente,
} from '../services/pocketbase';
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
  // A sessão do PocketBase já está no localStorage quando o app monta, então
  // dá para resolver o estado inicial de forma síncrona — chamar setState
  // dentro do efeito só provocava um render em cascata.
  const [user, setUser] = useState<RecordModel | null>(
    () => (pb.authStore.isValid ? pb.authStore.record : null),
  );
  const loading = false; // resolvido de forma síncrona no estado inicial

  useEffect(() => {
    const unsub = pb.authStore.onChange((_token, record) => { setUser(record); });
    return () => { unsub(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signIn(email, password);
    setUser(getCurrentUser());
    // Depois de entrar o navegador leva o pedido mais a sério
    pedirArmazenamentoPersistente();
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    await signUp(email, password, displayName);
    setUser(getCurrentUser());
    pedirArmazenamentoPersistente();
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
