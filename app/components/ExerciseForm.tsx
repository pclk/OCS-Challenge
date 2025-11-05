'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Exercise {
  id: number;
  name: string;
  type: string;
}

interface ExerciseFormProps {
  onScoreSubmitted?: () => void;
}

export default function ExerciseForm({ onScoreSubmitted }: ExerciseFormProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<number | ''>('');
  const [userName, setUserName] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameDropdownRef = useRef<HTMLDivElement>(null);

  const userNames = [
    'ME4T SIEW WEI HENG',
    'ME4T ISAAC QUEK JOE HONG',
    'ME4T BRYAN LIM JUN HUANG',
  ];

  useEffect(() => {
    fetchExercises();
  }, []);

  // Filter names based on input
  const filteredNames = userNames.filter((name) =>
    name.toLowerCase().includes(userNameInput.toLowerCase())
  );

  // Find most relevant name (exact match first, then partial match)
  const getMostRelevantName = (): string => {
    if (!userNameInput.trim()) return '';
    
    const lowerInput = userNameInput.toLowerCase().trim();
    
    // Check for exact match
    const exactMatch = userNames.find((name) => name.toLowerCase() === lowerInput);
    if (exactMatch) return exactMatch;
    
    // Check for names that start with input
    const startsWith = filteredNames.find((name) => 
      name.toLowerCase().startsWith(lowerInput)
    );
    if (startsWith) return startsWith;
    
    // Return first filtered match
    if (filteredNames.length > 0) return filteredNames[0];
    
    return '';
  };

  // Handle input change and auto-select
  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setUserNameInput(input);
    setShowNameDropdown(true);
    
    // Auto-select most relevant name
    const relevantName = getMostRelevantName();
    if (relevantName) {
      setUserName(relevantName);
    } else {
      setUserName('');
    }
  };

  // Handle name selection from dropdown
  const handleNameSelect = (name: string) => {
    setUserName(name);
    setUserNameInput(name);
    setShowNameDropdown(false);
  };

  // Handle Enter key press
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const relevantName = getMostRelevantName();
      if (relevantName) {
        handleNameSelect(relevantName);
        // Move focus to next input after selection
        const valueInput = document.getElementById('value') as HTMLInputElement;
        if (valueInput) {
          valueInput.focus();
        }
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        nameInputRef.current &&
        nameDropdownRef.current &&
        !nameInputRef.current.contains(event.target as Node) &&
        !nameDropdownRef.current.contains(event.target as Node)
      ) {
        setShowNameDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchExercises = async () => {
    try {
      const response = await fetch('/api/exercises');
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
        if (data.length > 0) {
          setSelectedExercise(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedExercise || !userName || !value.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid number' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: userName.trim(),
          exerciseId: selectedExercise,
          value: numValue,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Score submitted successfully!' });
        setUserName('');
        setUserNameInput('');
        setValue('');
        if (exercises.length > 0) {
          setSelectedExercise(exercises[0].id);
        }
        router.refresh(); // Refresh server components
        if (onScoreSubmitted) {
          onScoreSubmitted();
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit score' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedExerciseData = exercises.find((e) => e.id === selectedExercise);
  const inputLabel = selectedExerciseData?.type === 'seconds' ? 'Seconds' : 'Reps';

  return (
    <div className="bg-black border border-white/20 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Submit Your Score</h2>
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

        <div className="relative">
          <label htmlFor="userName" className="block text-sm font-medium text-white mb-1">
            Your Name
          </label>
          <input
            ref={nameInputRef}
            id="userName"
            type="text"
            value={userNameInput}
            onChange={handleNameInputChange}
            onKeyDown={handleNameKeyDown}
            onFocus={() => setShowNameDropdown(true)}
            className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
            placeholder="Search or type your name"
            required
            autoComplete="off"
          />
          {showNameDropdown && filteredNames.length > 0 && (
            <div
              ref={nameDropdownRef}
              className="absolute z-10 w-full mt-1 bg-black border border-white/20 rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {filteredNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleNameSelect(name)}
                  className={`w-full text-left px-3 py-2 hover:bg-[#ff7301]/20 ${
                    userName === name ? 'bg-[#ff7301]/30 text-[#ff7301]' : 'text-white'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          {showNameDropdown && userNameInput && filteredNames.length === 0 && (
            <div
              ref={nameDropdownRef}
              className="absolute z-10 w-full mt-1 bg-black border border-white/20 rounded-md shadow-lg p-3"
            >
              <p className="text-white/70 text-sm">No matching names found</p>
            </div>
          )}
        </div>

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
  );
}

