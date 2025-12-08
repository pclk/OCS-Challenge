'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  name: string;
  wing: string | null;
  approved: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (name: string, wing: string, password: string) => Promise<{ success: boolean; message?: string; shouldRegister?: boolean }>;
  register: (name: string, wing: string, password: string) => Promise<{ success: boolean; message?: string; pendingApproval?: boolean; shouldLogin?: boolean }>;
  logout: () => void;
  verifyToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'ocs_auth_token';
const AUTH_USER_KEY = 'ocs_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        
        // Verify token with server
        verifyTokenWithServer(storedToken).then((isValid) => {
          if (!isValid) {
            // Token invalid, clear auth
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setToken(null);
            setUser(null);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error('Error loading auth state:', error);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const verifyTokenWithServer = async (tokenToVerify: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user) {
          setUser(data.user);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  };

  const verifyToken = async (): Promise<boolean> => {
    if (!token) return false;
    return await verifyTokenWithServer(token);
  };

  const login = async (name: string, wing: string, password: string): Promise<{ success: boolean; message?: string; shouldRegister?: boolean }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, wing, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        return { success: true };
      } else {
        return { 
          success: false, 
          message: data.message || data.error || 'Login failed',
          shouldRegister: data.shouldRegister || false,
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const register = async (name: string, wing: string, password: string): Promise<{ success: boolean; message?: string; pendingApproval?: boolean; shouldLogin?: boolean }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, wing, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.user.approved) {
          // Auto-login if approved
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
          return { success: true, message: data.message };
        } else {
          // Pending approval
          return { success: true, message: data.message, pendingApproval: true };
        }
      } else {
        return { 
          success: false, 
          message: data.message || data.error || 'Registration failed',
          shouldLogin: data.shouldLogin || false,
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, verifyToken }}>
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

