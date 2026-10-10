'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, ROLES } from '../types';
import { getStoredToken, getStoredUser, setStoredToken, setStoredUser, removeStoredToken } from '../lib/auth';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = getStoredToken();
    const savedUser = getStoredUser();

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        setUser(savedUser);
      }
      // Verify token with backend
      api
        .get('/auth/me')
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.data);
            setStoredUser(res.data.data);
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setStoredToken(newToken);
    setStoredUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    removeStoredToken();
  };

  const refetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data);
        setStoredUser(res.data.data);
      }
    } catch (error) {
      console.error('Failed to refetch user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
