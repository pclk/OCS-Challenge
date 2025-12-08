'use client';

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import SearchableDropdown from './SearchableDropdown';

interface ReportModalProps {
  initialName?: string;
  initialWing?: string;
  isAccountConflict?: boolean; // If true, shows account conflict message; if false, shows new account request
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ReportModal({ initialName = '', initialWing = '', isAccountConflict = false, onClose, onSubmitted }: ReportModalProps) {
  const [name, setName] = useState(initialName);
  const [wing, setWing] = useState(initialWing);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [wings, setWings] = useState<string[]>([]);
  const [loadingWings, setLoadingWings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWings();
    // Update name and wing if initial values change
    if (initialName) setName(initialName);
    if (initialWing) setWing(initialWing);
  }, [initialName, initialWing]);

  const fetchWings = async () => {
    setLoadingWings(true);
    try {
      const response = await fetch('/api/wings');
      if (response.ok) {
        const data = await response.json();
        setWings(data);
      }
    } catch (error) {
      console.error('Error fetching wings:', error);
    } finally {
      setLoadingWings(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!name.trim() || !wing.trim()) {
      toast.error('Please fill in name and wing');
      setIsSubmitting(false);
      return;
    }

    // Password is required for new account requests, optional for account conflicts
    if (!isAccountConflict && !password.trim()) {
      toast.error('Please fill in password');
      setIsSubmitting(false);
      return;
    }

    if (password.trim() && password.length < 4) {
      toast.error('Password must be at least 4 characters long');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/report-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          wing: wing.trim(),
          password: password.trim() || undefined,
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim() || (isAccountConflict 
            ? 'Account already exists - possible impersonation. Requesting investigation to reclaim account.'
            : 'Requesting new account creation - name not found in personnel CSV'),
        }),
      });

      if (response.ok) {
        onSubmitted();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/20 rounded-lg shadow-md max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">
              {isAccountConflict ? 'Account Conflict Report' : 'Request New Account'}
            </h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          {isAccountConflict ? (
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-md p-4 mb-6">
              <p className="text-yellow-200 text-sm font-semibold mb-2">⚠️ Account Already Exists</p>
              <p className="text-white/90 text-sm">
                An account with this name and wing already exists with a password. Someone may have been impersonating you and set a password already. Please send a request to admin for investigation and to reclaim your account.
              </p>
            </div>
          ) : (
            <p className="text-white/70 mb-6">
              Fill in your details below. An admin will review your request and create your account.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="report-name" className="block text-sm font-medium text-white mb-1">
                Name *
              </label>
              <input
                id="report-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                placeholder="Enter your name"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <SearchableDropdown
                id="report-wing"
                options={wings}
                value={wing}
                onChange={setWing}
                placeholder="Search or select wing"
                label="Wing *"
                required
                loading={loadingWings}
                disabled={isSubmitting}
              />
            </div>

            {isAccountConflict ? (
              <div>
                <label htmlFor="report-password" className="block text-sm font-medium text-white mb-1">
                  Password
                </label>
                <input
                  id="report-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                  placeholder="Enter your password (optional)"
                  minLength={4}
                  disabled={isSubmitting}
                />
                <p className="text-white/50 text-xs mt-1">Optional - Minimum 4 characters if provided</p>
              </div>
            ) : (
              <div>
                <label htmlFor="report-password" className="block text-sm font-medium text-white mb-1">
                  Password *
                </label>
                <input
                  id="report-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                  placeholder="Enter your password"
                  required
                  minLength={4}
                  disabled={isSubmitting}
                />
                <p className="text-white/50 text-xs mt-1">Minimum 4 characters</p>
              </div>
            )}

            <div>
              <label htmlFor="report-email" className="block text-sm font-medium text-white mb-1">
                Email
              </label>
              <input
                id="report-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                placeholder="Enter your email (optional)"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="report-phone" className="block text-sm font-medium text-white mb-1">
                Phone
              </label>
              <input
                id="report-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                placeholder="Enter your phone number (optional)"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="report-notes" className="block text-sm font-medium text-white mb-1">
                Notes
              </label>
              <textarea
                id="report-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                placeholder="Any additional information (optional)"
                rows={3}
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
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

