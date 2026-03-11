import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import api from '../api';
import type { User } from '../types';

interface AuthContextShape {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as Partial<User>;
      if (!parsed.id || !parsed.name || !parsed.username) return null;
      return {
        id: parsed.id,
        name: parsed.name,
        username: parsed.username,
        role: parsed.role === 'ADMIN' ? 'ADMIN' : 'ANALYST',
      };
    } catch (_error) {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user: authUser } = response.data as { token: string; user: User };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(authUser));
      setUser(authUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const message = String(error?.response?.data?.message || '').toLowerCase();

        if (status === 401 && (message.includes('invalid token') || message.includes('unauthorized'))) {
          logout();
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
