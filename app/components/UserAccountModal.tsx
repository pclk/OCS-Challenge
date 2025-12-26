'use client';

import { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserAccountModal({ isOpen, onClose }: UserAccountModalProps) {
  const { user, logout, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleLogout = async () => {
    if (!token || !user) {
      logout();
      onClose();
      return;
    }

    try {
      // Log logout action
      await fetch('/api/user/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error logging logout:', error);
      // Continue with logout even if logging fails
    }

    logout();
    onClose();
    toast.success('Logged out successfully');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword.length < 4) {
      toast.error('New password must be at least 4 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowChangePassword(false);
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAccount = async () => {
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/reset-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Account reset successfully. You will be logged out.');
        logout();
        onClose();
      } else {
        toast.error(data.error || 'Failed to reset account');
        setShowResetConfirm(false);
      }
    } catch (error) {
      console.error('Reset account error:', error);
      toast.error('Network error. Please try again.');
      setShowResetConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-black border border-white/20 rounded-lg shadow-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Account Management</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {user && (
          <div className="mb-6">
            <p className="text-white font-semibold text-lg">{user.name}</p>
            {user.wing && (
              <p className="text-white/70 text-sm">Wing: {user.wing}</p>
            )}
          </div>
        )}

        {!showResetConfirm && !showChangePassword ? (
          <div className="space-y-3">
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full bg-[#ff7301] text-white py-3 px-4 rounded-md hover:bg-[#ff7301]/90 transition-colors"
            >
              Change Password
            </button>
            <div className="flex gap-4">
              <button
                onClick={handleLogout}
                className="flex-1 bg-white/10 text-white py-3 px-4 rounded-md hover:bg-white/20 transition-colors"
              >
                Logout
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={loading}
                className="flex-1 bg-yellow-600 text-white py-3 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reset Account
              </button>
            </div>
          </div>
        ) : showChangePassword ? (
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-3">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301]"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301]"
                  required
                  disabled={loading}
                  minLength={4}
                />
                <p className="text-white/50 text-xs mt-1">Must be at least 4 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301]"
                  required
                  disabled={loading}
                  minLength={4}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  disabled={loading}
                  className="flex-1 bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-4 border border-yellow-600/50 rounded-md bg-yellow-600/10">
            <h3 className="text-white font-semibold mb-3">Confirm Account Reset</h3>
            <p className="text-white mb-4">
              Are you sure you want to reset your account? This will:
            </p>
            <ul className="text-white/70 text-sm list-disc list-inside mb-4 space-y-1">
              <li>Remove your password (you'll need to set a new one to log in again)</li>
              <li>Delete all your scores</li>
              <li>Keep your account (you can still log in after setting a new password)</li>
            </ul>
            <p className="text-white/50 text-xs mb-4">
              Note: Your account will remain in the system and can still be selected when logging in or registering.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleResetAccount}
                disabled={loading}
                className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Resetting...' : 'Yes, Reset Account'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={loading}
                className="flex-1 bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

