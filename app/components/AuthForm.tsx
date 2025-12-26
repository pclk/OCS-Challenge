'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import SearchableDropdown from './SearchableDropdown';
import ReportModal from './ReportModal';
import PasswordCreationModal from './PasswordCreationModal';
import RegistrationConfirmationModal from './RegistrationConfirmationModal';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [wing, setWing] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState<'7days' | '30days' | 'forever'>('30days');
  const [wings, setWings] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [loadingWings, setLoadingWings] = useState(false);
  const [loadingNames, setLoadingNames] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isAccountConflictReport, setIsAccountConflictReport] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [userNeedsPassword, setUserNeedsPassword] = useState<{
    id: number;
    name: string;
    wing: string | null;
  } | null>(null);
  const { login, register } = useAuth();
  
  // Refs for focusing next fields
  const wingRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWings();
    fetchNames(); // Always fetch names for login dropdown
  }, []);

  const fetchWings = async () => {
    setLoadingWings(true);
    try {
      const response = await fetch('/api/wings');
      if (response.ok) {
        const data = await response.json();
        setWings(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch wings' }));
        toast.error(errorData.error || 'Failed to fetch wings');
      }
    } catch (error) {
      console.error('Error fetching wings:', error);
      toast.error('Network error: Unable to fetch wings. Please check your connection.');
    } finally {
      setLoadingWings(false);
    }
  };

  const fetchNames = async () => {
    setLoadingNames(true);
    try {
      const response = await fetch('/api/names');
      if (response.ok) {
        const data = await response.json();
        setNames(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch names' }));
        toast.error(errorData.error || 'Failed to fetch names');
      }
    } catch (error) {
      console.error('Error fetching names:', error);
      toast.error('Network error: Unable to fetch names. Please check your connection.');
    } finally {
      setLoadingNames(false);
    }
  };

  // Check password status when name or wing changes
  useEffect(() => {
    if (!isLogin || !name.trim() || !wing.trim() || password.trim()) {
      setUserNeedsPassword(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const checkResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: name.trim(), wing: wing.trim() }),
        });

        const checkData = await checkResponse.json();
        if (checkData.needsPassword && checkData.user) {
          setUserNeedsPassword(checkData.user);
        } else {
          setUserNeedsPassword(null);
        }
      } catch (error) {
        // Silently fail - this is just a check
        console.error('Error checking password status:', error);
        setUserNeedsPassword(null);
      }
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [name, wing, password, isLogin]);

  // Focus password field when it becomes visible (login mode)
  useEffect(() => {
    if (isLogin && !userNeedsPassword && name.trim() && wing.trim() && passwordRef.current) {
      // Small delay to ensure the field is rendered
      const timeoutId = setTimeout(() => {
        passwordRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isLogin, userNeedsPassword, name, wing]);

  // Focus password field when wing is selected (registration mode)
  useEffect(() => {
    if (!isLogin && wing.trim() && name.trim() && passwordRef.current) {
      // Small delay to ensure the field is rendered
      const timeoutId = setTimeout(() => {
        passwordRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isLogin, wing, name]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!name.trim() || !wing.trim()) {
      toast.error('Please fill in name and wing');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isLogin) {
        // If user needs password and no password provided, show modal
        if (userNeedsPassword && !password.trim()) {
          setShowPasswordModal(true);
          setIsSubmitting(false);
          return;
        }

        // If password is required but not provided
        if (!userNeedsPassword && !password.trim()) {
          toast.error('Password required');
          setIsSubmitting(false);
          return;
        }

        if (password.length < 4) {
          toast.error('Password must be at least 4 characters long');
          setIsSubmitting(false);
          return;
        }

        const result = await login(name.trim(), wing.trim(), password, rememberMe);
        if (result.success) {
          toast.success('Login successful!');
        } else {
          // Check if we should switch to register mode
          if (result.shouldRegister) {
            toast.error(result.message || 'User not found. Please register.', {
              duration: 5000,
            });
            // Switch to register mode and keep name/wing filled
            setIsLogin(false);
            setPassword(''); // Clear password field
          } else {
            toast.error(result.message || 'Login failed');
          }
        }
      } else {
        // First check for account conflicts before showing confirmation
        // Check if user exists with password
        try {
          const checkResponse = await fetch('/api/auth/check-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: name.trim(), wing: wing.trim() }),
          });

          const checkData = await checkResponse.json();

          // If account conflict detected (user exists with password), show conflict report immediately
          if (checkData.exists && checkData.hasPassword) {
            setIsSubmitting(false);
            toast.error('Account already exists. Please login.', {
              duration: 5000,
            });
            // Show report modal for account conflict
            setIsAccountConflictReport(true);
            setShowReportModal(true);
            // Switch to login mode and keep name/wing filled
            setIsLogin(true);
            setPassword(''); // Clear password field
            return;
          }

          // If no conflict, show confirmation modal
          setIsSubmitting(false);
          setShowConfirmationModal(true);
        } catch (error) {
          console.error('Error checking user:', error);
          // If check fails, proceed with confirmation anyway
          setIsSubmitting(false);
          setShowConfirmationModal(true);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportSubmitted = () => {
    setShowReportModal(false);
    setIsAccountConflictReport(false);
    toast.success('Report submitted. An admin will review it.');
  };

  const handleConfirmRegistration = async () => {
    setShowConfirmationModal(false);
    setIsSubmitting(true);

    try {
      const result = await register(name.trim(), wing.trim(), password);
      if (result.success) {
        if (result.pendingApproval) {
          toast.success(result.message || 'Account created and pending approval');
          // Reset form
          setName('');
          setWing('');
          setPassword('');
          setIsLogin(true); // Switch to login mode
        } else {
          toast.success(result.message || 'Registration successful!');
        }
      } else {
        if (result.message?.includes('already exists')) {
          // Show option to report
          toast.error(result.message, {
            duration: 5000,
          });
          // Show report modal for account conflict
          setIsAccountConflictReport(true);
          setShowReportModal(true);
        } else {
          toast.error(result.message || 'Registration failed');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-black border border-white/20 rounded-lg shadow-md mb-6">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          {isLogin ? 'Login' : 'Register'}
        </h2>
        <p className="text-white/70 mb-6">
          {isLogin
            ? 'Enter your credentials to access the leaderboard'
            : 'Create an account to submit your scores'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            {isLogin ? (
              <>
                <SearchableDropdown
                  id="name"
                  options={names}
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    setPassword(''); // Clear password when name changes
                    setUserNeedsPassword(null);
                  }}
                  placeholder="Search or select your name"
                  label="Name"
                  required
                  loading={loadingNames}
                  disabled={isSubmitting}
                  onEnterPress={() => {
                    // Focus on wing field
                    setTimeout(() => {
                      const wingInput = document.getElementById('wing') as HTMLInputElement;
                      if (wingInput) {
                        wingInput.focus();
                      }
                    }, 100);
                  }}
                />
                {userNeedsPassword && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="mt-2 text-[#ff7301] hover:text-[#ff7301]/80 text-sm transition-colors underline"
                    disabled={isSubmitting}
                  >
                    Click me to create a password!
                  </button>
                )}
              </>
            ) : (
              <>
                <SearchableDropdown
                  id="name"
                  options={names}
                  value={name}
                  onChange={setName}
                  placeholder="Search or select your name"
                  label="Name"
                  required
                  loading={loadingNames}
                  disabled={isSubmitting}
                  onEnterPress={() => {
                    // Focus on wing field
                    setTimeout(() => {
                      const wingInput = document.getElementById('wing') as HTMLInputElement;
                      if (wingInput) {
                        wingInput.focus();
                      }
                    }, 100);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    // Show new account request modal (not conflict)
                    setIsAccountConflictReport(false);
                    setShowReportModal(true);
                  }}
                  className="mt-2 text-[#ff7301] hover:text-[#ff7301]/80 text-sm transition-colors underline"
                  disabled={isSubmitting}
                >
                  Don't see your name? Send a report to admin by clicking me!
                </button>
              </>
            )}
          </div>

          <div>
            <SearchableDropdown
              id="wing"
              options={wings}
              value={wing}
              onChange={setWing}
              placeholder="Search or select wing"
              label="Wing"
              required
              loading={loadingWings}
              disabled={isSubmitting}
              onEnterPress={() => {
                // Focus on password field if it's visible, otherwise focus submit button
                setTimeout(() => {
                  if (isLogin && !userNeedsPassword && name.trim() && wing.trim()) {
                    const passwordInput = document.getElementById('password') as HTMLInputElement;
                    if (passwordInput) {
                      passwordInput.focus();
                    }
                  } else if (!isLogin && name.trim() && wing.trim()) {
                    const passwordInput = document.getElementById('password') as HTMLInputElement;
                    if (passwordInput) {
                      passwordInput.focus();
                    }
                  } else {
                    // Focus submit button
                    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                    if (submitButton) {
                      submitButton.focus();
                    }
                  }
                }, 150);
              }}
            />
          </div>

          {isLogin && !userNeedsPassword && name.trim() && wing.trim() && (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                  Password
                </label>
                <input
                  ref={passwordRef}
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Submit form
                      const form = e.currentTarget.closest('form');
                      if (form) {
                        form.requestSubmit();
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                  placeholder="Enter your password"
                  required
                  minLength={4}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Remember Me
                </label>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="rememberMe"
                      value="7days"
                      checked={rememberMe === '7days'}
                      onChange={(e) => setRememberMe(e.target.value as '7days' | '30days' | 'forever')}
                      className="mr-2 w-4 h-4 text-[#ff7301] focus:ring-[#ff7301] focus:ring-2 bg-black border-white/20"
                      disabled={isSubmitting}
                    />
                    <span className="text-white text-sm">
                      Remember me for 7 days <span className="text-green-400 text-xs">(Safest)</span>
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="rememberMe"
                      value="30days"
                      checked={rememberMe === '30days'}
                      onChange={(e) => setRememberMe(e.target.value as '7days' | '30days' | 'forever')}
                      className="mr-2 w-4 h-4 text-[#ff7301] focus:ring-[#ff7301] focus:ring-2 bg-black border-white/20"
                      disabled={isSubmitting}
                    />
                    <span className="text-white text-sm">
                      Remember me for 30 days <span className="text-yellow-400 text-xs">(Medium)</span>
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="rememberMe"
                      value="forever"
                      checked={rememberMe === 'forever'}
                      onChange={(e) => setRememberMe(e.target.value as '7days' | '30days' | 'forever')}
                      className="mr-2 w-4 h-4 text-[#ff7301] focus:ring-[#ff7301] focus:ring-2 bg-black border-white/20"
                      disabled={isSubmitting}
                    />
                    <span className="text-white text-sm">
                      Remember me forever <span className="text-red-400 text-xs">(Riskiest)</span>
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}
          {!isLogin && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                Password
              </label>
              <input
                ref={passwordRef}
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Submit form
                    const form = e.currentTarget.closest('form');
                    if (form) {
                      form.requestSubmit();
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                placeholder="Enter your password"
                required
                minLength={4}
                disabled={isSubmitting}
              />
              <p className="text-white/50 text-xs mt-1">Minimum 4 characters</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting || (isLogin && !password.trim() && !userNeedsPassword)}
              className="flex-1 bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? isLogin
                  ? 'Logging in...'
                  : 'Registering...'
                : isLogin
                ? userNeedsPassword
                  ? 'Check Password Status'
                  : 'Login'
                : 'Register'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setName('');
                setWing('');
                setPassword('');
              }}
              className="text-[#ff7301] hover:text-[#ff7301]/80 text-sm transition-colors"
              disabled={isSubmitting}
            >
              {isLogin
                ? "Don't have an account? Register"
                : 'Already have an account? Login'}
            </button>
          </div>
        </form>
      </div>
      {showReportModal && (
        <ReportModal
          initialName={name}
          initialWing={wing}
          isAccountConflict={isAccountConflictReport}
          onClose={() => {
            setShowReportModal(false);
            setIsAccountConflictReport(false);
          }}
          onSubmitted={handleReportSubmitted}
        />
      )}
      {showPasswordModal && userNeedsPassword && (
        <PasswordCreationModal
          userId={userNeedsPassword.id}
          userName={userNeedsPassword.name}
          userWing={userNeedsPassword.wing}
          onClose={() => {
            setShowPasswordModal(false);
            setUserNeedsPassword(null);
            setName('');
            setWing('');
            setPassword('');
          }}
        />
      )}
      {showConfirmationModal && (
        <RegistrationConfirmationModal
          name={name}
          wing={wing}
          onConfirm={handleConfirmRegistration}
          onCancel={() => {
            setShowConfirmationModal(false);
            setIsSubmitting(false);
          }}
        />
      )}
    </div>
  );
}

