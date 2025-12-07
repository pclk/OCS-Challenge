'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SearchableDropdown from './SearchableDropdown';

interface NameSelectionProps {
  onNameSelected: (name: string) => void;
}

export default function NameSelection({ onNameSelected }: NameSelectionProps) {
  const [name, setName] = useState('');
  const [userNames, setUserNames] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    fetchAllNames();
  }, []);

  const fetchAllNames = async () => {
    setLoadingNames(true);
    try {
      const response = await fetch('/api/names');
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
        <h2 className="text-2xl font-bold text-white mb-4">Submit Your Scores</h2>
        <p className="text-white/70 mb-6">Start by selecting or entering your name</p>
        
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

          <button
            type="submit"
            className="w-full bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue to Exercises
          </button>
        </form>
      </div>
    </div>
  );
}

