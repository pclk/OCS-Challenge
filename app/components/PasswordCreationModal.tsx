'use client';

import { useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

interface PasswordCreationModalProps {
  userId: number;
  userName: string;
  userWing: string | null;
  onClose: () => void;
}

export default function PasswordCreationModal({
  userId,
  userName,
  userWing,
  onClose,
}: PasswordCreationModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!password.trim() || !confirmPassword.trim()) {
      toast.error('Please fill in both password fields');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 4) {
      toast.error('Password must be at least 4 characters long');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          password: password.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || 'Password created successfully!');
        // Update auth context with new token
        if (data.token && data.user) {
          localStorage.setItem('ocs_auth_token', data.token);
          localStorage.setItem('ocs_auth_user', JSON.stringify(data.user));
          // Trigger a page reload to update auth state
          window.location.reload();
        }
        onClose();
      } else {
        toast.error(data.error || 'Failed to create password');
      }
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/20 rounded-lg shadow-md max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Create Password</h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-white/70 mb-6">
            Welcome {userName}! Please create a password to secure your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-white mb-1">
                New Password *
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                placeholder="Enter new password"
                required
                minLength={4}
                disabled={isSubmitting}
              />
              <p className="text-white/50 text-xs mt-1">Minimum 4 characters</p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-white mb-1">
                Confirm Password *
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                placeholder="Confirm new password"
                required
                minLength={4}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

