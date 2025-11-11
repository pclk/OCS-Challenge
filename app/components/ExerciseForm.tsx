'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import SearchableDropdown from './SearchableDropdown';

interface Exercise {
  id: number;
  name: string;
  type: string;
}

interface ExerciseFormProps {
  onScoreSubmitted?: () => void;
  exercises: Exercise[];
}

export default function ExerciseForm({ onScoreSubmitted, exercises }: ExerciseFormProps) {
  const router = useRouter();
  const [selectedExercise, setSelectedExercise] = useState<number | ''>('');
  const [rank, setRank] = useState('');
  const [name, setName] = useState('');
  const [wing, setWing] = useState('');
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  const [ranks, setRanks] = useState<string[]>([]);
  const [wings, setWings] = useState<string[]>([]);
  const [userNames, setUserNames] = useState<string[]>([]);
  const [loadingRanks, setLoadingRanks] = useState(false);
  const [loadingNames, setLoadingNames] = useState(false);
  const [loadingWings, setLoadingWings] = useState(false);

  useEffect(() => {
    fetchRanks();
  }, []);

  useEffect(() => {
    // Set default selected exercise when exercises are loaded
    if (exercises.length > 0 && !selectedExercise) {
      setSelectedExercise(exercises[0].id);
    }
  }, [exercises, selectedExercise]);

  useEffect(() => {
    // Fetch names when rank changes
    if (rank) {
      fetchNames(rank);
    } else {
      setUserNames([]);
      setName(''); // Clear name when rank is cleared
      setWings([]); // Clear wings when rank is cleared
      setWing(''); // Clear selected wing
      setLoadingNames(false); // Reset loading state
      setLoadingWings(false); // Reset loading state
    }
  }, [rank]);

  useEffect(() => {
    // Fetch wings when rank and name are selected
    if (rank && name) {
      fetchWings(rank, name);
    } else {
      setWings([]);
      setWing(''); // Clear wing when rank or name is cleared
      setLoadingWings(false); // Reset loading state
    }
  }, [rank, name]);

  const fetchRanks = async () => {
    setLoadingRanks(true);
    try {
      const response = await fetch('/api/ranks');
      if (response.ok) {
        const data = await response.json();
        setRanks(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch ranks' }));
        toast.error(errorData.error || 'Failed to fetch ranks');
      }
    } catch (error) {
      console.error('Error fetching ranks:', error);
      toast.error('Network error: Unable to fetch ranks. Please check your connection.');
    } finally {
      setLoadingRanks(false);
    }
  };

  const fetchWings = async (selectedRank?: string, selectedName?: string) => {
    setLoadingWings(true);
    let shouldFocus = false;
    try {
      let url = '/api/wings';
      if (selectedRank && selectedName) {
        url += `?rank=${encodeURIComponent(selectedRank)}&name=${encodeURIComponent(selectedName)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setWings(data);
        
        // Auto-fill wing if there's only one option
        if (data.length === 1) {
          setWing(data[0]);
          // Defocus wing field if it was auto-filled
          setTimeout(() => {
            const wingInput = document.getElementById('wing') as HTMLInputElement;
            if (wingInput && document.activeElement === wingInput) {
              wingInput.blur();
            }
          }, 150);
          shouldFocus = false; // Don't focus if auto-filled
        } else {
          // Clear wing if current wing is not in the new list
          if (wing && !data.includes(wing)) {
            setWing('');
          }
          shouldFocus = true; // Focus if multiple options
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch wings' }));
        toast.error(errorData.error || 'Failed to fetch wings');
        setWings([]);
      }
    } catch (error) {
      console.error('Error fetching wings:', error);
      toast.error('Network error: Unable to fetch wings. Please check your connection.');
      setWings([]);
    } finally {
      setLoadingWings(false);
      // Focus wing field after loading completes (if not auto-filled and field exists)
      if (shouldFocus) {
        setTimeout(() => {
          const wingInput = document.getElementById('wing') as HTMLInputElement;
          if (wingInput) {
            wingInput.focus();
          }
        }, 100);
      }
    }
  };

  const fetchNames = async (selectedRank: string) => {
    setLoadingNames(true);
    let shouldFocus = false;
    try {
      const response = await fetch(`/api/names?rank=${encodeURIComponent(selectedRank)}`);
      if (response.ok) {
        const data = await response.json();
        setUserNames(data);
        
        // Auto-fill name if there's only one option
        if (data.length === 1) {
          // Auto-fill name - this will trigger the useEffect to fetch wings
          setName(data[0]);
          // Defocus name field if it was auto-filled
          setTimeout(() => {
            const nameInput = document.getElementById('name') as HTMLInputElement;
            if (nameInput && document.activeElement === nameInput) {
              nameInput.blur();
            }
          }, 150);
          shouldFocus = false; // Don't focus if auto-filled
        } else {
          // Clear name if current name is not in the new list
          if (name && !data.includes(name)) {
            setName('');
            // Clear wings when name is cleared
            setWings([]);
            setWing('');
          }
          shouldFocus = true; // Focus if multiple options
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch names' }));
        toast.error(errorData.error || 'Failed to fetch names');
        setUserNames([]);
      }
    } catch (error) {
      console.error('Error fetching names:', error);
      toast.error('Network error: Unable to fetch names. Please check your connection.');
      setUserNames([]);
    } finally {
      setLoadingNames(false);
      // Focus name field after loading completes (if not auto-filled and field exists)
      if (shouldFocus) {
        setTimeout(() => {
          const nameInput = document.getElementById('name') as HTMLInputElement;
          if (nameInput) {
            nameInput.focus();
          }
        }, 100);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedExercise || !rank || !name || !wing || !value.trim()) {
      const errorMsg = 'Please fill in all fields';
      setMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
      return;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      const errorMsg = 'Please enter a valid number';
      setMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Submitting score...');

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rank: rank.trim(),
          name: name.trim(),
          wing: wing.trim(),
          exerciseId: selectedExercise,
          value: numValue,
        }),
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (response.ok) {
        const successMsg = 'Score submitted successfully!';
        setMessage({ type: 'success', text: successMsg });
        toast.success(successMsg);
        // Clear all input values
        setRank('');
        setName('');
        setWing('');
        setValue('');
        // Clear dependent data arrays
        setUserNames([]);
        setWings([]);
        // Reset loading states
        setLoadingNames(false);
        setLoadingWings(false);
        // Reset exercise to first one
        if (exercises.length > 0) {
          setSelectedExercise(exercises[0].id);
        }
        router.refresh(); // Refresh server components
        if (onScoreSubmitted) {
          onScoreSubmitted();
        }
      } else {
        const errorMsg = data.error || 'Failed to submit score';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMsg = 'Network error. Please check your connection and try again.';
      setMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
      console.error('Error submitting score:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedExerciseData = exercises.find((e) => e.id === selectedExercise);
  const inputLabel = selectedExerciseData?.type === 'seconds' ? 'Seconds' : 'Reps';

  return (
    <div className="bg-black border border-white/20 rounded-lg shadow-md mb-6">
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
      >
        <h2 className="text-2xl font-bold text-white">Submit Your Score</h2>
        <svg
          className={`w-6 h-6 text-white transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0' : 'max-h-[2000px]'
        }`}
      >
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="exercise" className="block text-sm font-medium text-white mb-1">
            Exercise
          </label>
          <select
            id="exercise"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value ? parseInt(e.target.value, 10) : '')}
            className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name} ({exercise.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rank" className="block text-sm font-medium text-white mb-1">
            Rank
          </label>
          <SearchableDropdown
            id="rank"
            options={ranks}
            value={rank}
            onChange={setRank}
            placeholder="Search or select rank"
            required
            loading={loadingRanks}
            onEnterPress={() => {
              // Always move focus to name field first
              setTimeout(() => {
                const nameInput = document.getElementById('name') as HTMLInputElement;
                if (nameInput) nameInput.focus();
              }, 50);
            }}
          />
        </div>

        {rank && (
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
                // Always move focus to wing field first
                setTimeout(() => {
                  const wingInput = document.getElementById('wing') as HTMLInputElement;
                  if (wingInput) wingInput.focus();
                }, 50);
              }}
            />
          </div>
        )}

        {rank && name && (
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
                // Always move to value field after wing selection
                const valueInput = document.getElementById('value') as HTMLInputElement;
                if (valueInput) valueInput.focus();
              }}
            />
          </div>
        )}

        <div>
          <label htmlFor="value" className="block text-sm font-medium text-white mb-1">
            {inputLabel}
          </label>
          <input
            id="value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
            placeholder={`Enter ${inputLabel.toLowerCase()}`}
            min="0"
            required
          />
        </div>

        {message && (
          <div
            className={`p-3 rounded-md ${
              message.type === 'success'
                ? 'bg-[#ff7301]/20 text-[#ff7301] border border-[#ff7301]/50'
                : 'bg-red-900/50 text-red-300 border border-red-700/50'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Score'}
        </button>
      </form>
        </div>
      </div>
    </div>
  );
}

