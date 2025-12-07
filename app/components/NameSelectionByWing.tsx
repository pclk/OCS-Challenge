'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SearchableDropdown from './SearchableDropdown';

interface NameSelectionByWingProps {
  wing: string;
  onNameSelected: (name: string) => void;
  onBack?: () => void;
}

export default function NameSelectionByWing({ wing, onNameSelected, onBack }: NameSelectionByWingProps) {
  const [name, setName] = useState('');
  const [userNames, setUserNames] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    if (wing) {
      fetchNamesByWing();
    }
  }, [wing]);

  const fetchNamesByWing = async () => {
    setLoadingNames(true);
    try {
      const response = await fetch(`/api/names-by-wing?wing=${encodeURIComponent(wing)}`);
      if (response.ok) {
        const data = await response.json();
        setUserNames(data);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please select or enter your name');
      return;
    }
    onNameSelected(name.trim());
  };

  return (
    <div className="bg-black border border-white/20 rounded-lg shadow-md mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Select Your Name</h2>
            <p className="text-white/70 mt-1">Wing: <span className="text-[#ff7301] font-semibold">{wing}</span></p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-white/70 hover:text-white transition-colors"
            >
              ← Change Wing
            </button>
          )}
        </div>
        
        <form id="name-selection-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <SearchableDropdown
              id="name"
              options={userNames}
              value={name}
              onChange={setName}
              placeholder="Search or type your name"
              label="Name"
              required
              loading={loadingNames}
              onEnterPress={() => {
                // Submit on Enter
                const form = document.getElementById('name-selection-form') as HTMLFormElement;
                if (form) {
                  form.requestSubmit();
                }
              }}
            />
          </div>

          <div className="flex gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className={`${onBack ? 'flex-1' : 'w-full'} bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              Continue to Exercises
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

