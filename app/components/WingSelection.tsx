'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SearchableDropdown from './SearchableDropdown';

interface WingSelectionProps {
  onWingSelected: (wing: string) => void;
}

export default function WingSelection({ onWingSelected }: WingSelectionProps) {
  const [wing, setWing] = useState('');
  const [wings, setWings] = useState<string[]>([]);
  const [loadingWings, setLoadingWings] = useState(false);

  useEffect(() => {
    fetchWings();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wing.trim()) {
      toast.error('Please select or enter your wing');
      return;
    }
    onWingSelected(wing.trim());
  };

  return (
    <div className="bg-black border border-white/20 rounded-lg shadow-md mb-6">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Submit Your Scores</h2>
        <p className="text-white/70 mb-6">Start by selecting your wing</p>
        
        <form id="wing-selection-form" onSubmit={handleSubmit} className="space-y-4">
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
              onEnterPress={() => {
                // Submit on Enter
                const form = document.getElementById('wing-selection-form') as HTMLFormElement;
                if (form) {
                  form.requestSubmit();
                }
              }}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

