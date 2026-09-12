import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@shared/index';
import { api } from '../api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('agricare_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    async function loadSession() {
      try {
        const storedToken = localStorage.getItem('agricare_token');
        if (storedToken) {
          const res = await api.getMe();
          if (res?.user) {
            setUser(res.user);
            if (res.user.preferredLanguage === 'hi') {
              setLanguage('hi');
            }
          } else {
            setUser(null);
            setToken(null);
            localStorage.removeItem('agricare_token');
          }
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('agricare_token');
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (email: string, password?: string) => {
    const res = await api.login({ email, password });
    setUser(res.user);
    setToken(res.token);
    localStorage.setItem('agricare_token', res.token);
  };

  const signup = async (data: any) => {
    const res = await api.signup(data);
    setUser(res.user);
    setToken(res.token);
    localStorage.setItem('agricare_token', res.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('agricare_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        language,
        setLanguage,
      }}
    >
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
