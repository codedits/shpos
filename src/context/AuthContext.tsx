'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  loading: boolean;
  login: (user: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'veyro_pos_auth_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check stored session on initial mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.authenticated) {
          setIsAuthenticated(true);
          setUsername(session.username || 'admin');
        }
      }
    } catch (e) {
      console.warn('Auth session read error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Guard routes: redirect unauthenticated users to /login
  useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === '/login';

    if (!isAuthenticated && !isLoginPage) {
      router.push('/login');
    } else if (isAuthenticated && isLoginPage) {
      router.push('/');
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = (userInput: string, passInput: string): boolean => {
    const validUsername = (process.env.NEXT_PUBLIC_VEYRO_USERNAME || 'admin').trim();
    const validPassword = (process.env.NEXT_PUBLIC_VEYRO_PASSWORD || 'veyro123').trim();

    if (
      userInput.trim().toLowerCase() === validUsername.toLowerCase() &&
      passInput.trim() === validPassword
    ) {
      const session = {
        authenticated: true,
        username: userInput.trim(),
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      setIsAuthenticated(true);
      setUsername(userInput.trim());
      return true;
    }
    return false;
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {}
    setIsAuthenticated(false);
    setUsername(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
