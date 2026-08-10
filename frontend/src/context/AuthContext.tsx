import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  openAccess: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openAccess, setOpenAccess] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const session = await api.getSession();
        if (cancelled) return;
        setOpenAccess(!!session.openAccess);
        setUser(session.user);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.setItem('user', JSON.stringify(session.user));
      } catch {
        // Fallback: try legacy token session
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (savedToken && savedUser) {
          try {
            const profile = await api.getProfile();
            if (cancelled) return;
            setToken(savedToken);
            setUser(profile);
            setOpenAccess(false);
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user);
    setOpenAccess(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    // Open access: stay signed in as operator
    api.getSession()
      .then((session) => {
        setUser(session.user);
        setToken(null);
        setOpenAccess(true);
        localStorage.setItem('user', JSON.stringify(session.user));
      })
      .catch(() => {
        setUser(null);
        setToken(null);
      });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        openAccess,
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
