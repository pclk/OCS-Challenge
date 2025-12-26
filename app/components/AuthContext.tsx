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
  login: (name: string, wing: string, password: string, rememberMe?: '7days' | '30days' | 'forever') => Promise<{ success: boolean; message?: string; shouldRegister?: boolean }>;
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
    const loadAuthState = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = localStorage.getItem(AUTH_USER_KEY);

      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(userData);
          
          // Verify token with server
          try {
            const response = await fetch('/api/auth/verify', {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              if (data.valid && data.user) {
                // Token is valid, update user data
                setUser(data.user);
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
              } else {
                // Token invalid
                console.log('[Auth] Token invalid, clearing localStorage');
                localStorage.removeItem(AUTH_TOKEN_KEY);
                localStorage.removeItem(AUTH_USER_KEY);
                setToken(null);
                setUser(null);
              }
            } else if (response.status === 401) {
              // Token is definitely invalid (401 Unauthorized)
              console.log('[Auth] Token invalid (401), clearing localStorage');
              localStorage.removeItem(AUTH_TOKEN_KEY);
              localStorage.removeItem(AUTH_USER_KEY);
              setToken(null);
              setUser(null);
            } else {
              // Server error (500, etc.) - don't clear token, might be temporary
              console.warn('[Auth] Server error during verification, keeping token. Status:', response.status);
            }
          } catch (networkError) {
            // Network error - don't clear localStorage, user might be offline
            console.warn('[Auth] Network error during token verification, keeping token. User might be offline.');
          }
          setLoading(false);
        } catch (error) {
          console.error('[Auth] Error loading auth state:', error);
          // Only clear on parse errors (corrupted data)
          if (error instanceof SyntaxError) {
            console.error('[Auth] Corrupted user data in localStorage, clearing');
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setToken(null);
            setUser(null);
          }
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadAuthState();
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
      console.error('[Auth] Error verifying token:', error);
      return false;
    }
  };

  const verifyToken = async (): Promise<boolean> => {
    if (!token) return false;
    return await verifyTokenWithServer(token);
  };

  const login = async (name: string, wing: string, password: string, rememberMe: '7days' | '30days' | 'forever' = '30days'): Promise<{ success: boolean; message?: string; shouldRegister?: boolean }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, wing, password, rememberMe }),
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

