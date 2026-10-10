'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, ApiResponse } from '../types';
import { getStoredToken, getStoredUser, setStoredToken, setStoredUser, removeStoredToken } from '../lib/auth';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    removeStoredToken();
    setUser(null);
  }, []);

  const login = useCallback((token: string, newUser: User) => {
    setStoredToken(token);
    setStoredUser(newUser);
    setUser(newUser);
  }, []);

  // Restore the session on load, then confirm it with the server (role may have changed,
  // account may be deactivated, token may have expired).
  useEffect(() => {
    if (!getStoredToken()) {
      setIsLoading(false);
      return;
    }
    setUser(getStoredUser());

    let cancelled = false;
    api
      .get<ApiResponse<User>>('/auth/me')
      .then((res) => {
        if (cancelled || !res.data.data) return;
        setUser(res.data.data);
        setStoredUser(res.data.data);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
