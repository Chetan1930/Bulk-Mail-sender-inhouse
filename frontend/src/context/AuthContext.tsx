import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** Returns a tempToken when 2FA is required; otherwise completes login. */
  login: (email: string, password: string) => Promise<{ requires2fa: true; tempToken: string } | void>;
  completeLogin2fa: (tempToken: string, code: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistSession(user: User, token: string) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (!savedToken || !savedUser) {
      setLoading(false);
      return;
    }

    setToken(savedToken);
    setUser(JSON.parse(savedUser));
    api.getProfile()
      .then((profile) => {
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applySession = useCallback((sessionUser: User, sessionToken: string) => {
    persistSession(sessionUser, sessionToken);
    setToken(sessionToken);
    setUser(sessionUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    if (result.requires2fa) {
      return { requires2fa: true as const, tempToken: result.tempToken };
    }
    applySession(result.user, result.token);
  }, [applySession]);

  const completeLogin2fa = useCallback(async (tempToken: string, code: string) => {
    const result = await api.verifyLogin2fa(tempToken, code);
    applySession(result.user, result.token);
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    const profile = await api.getProfile();
    setUser(profile);
    localStorage.setItem('user', JSON.stringify(profile));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        completeLogin2fa,
        refreshProfile,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
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
