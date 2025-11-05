'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import SearchableDropdown from './SearchableDropdown';

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
  const [rank, setRank] = useState('');
  const [name, setName] = useState('');
  const [wing, setWing] = useState('');
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const ranks = [
    'REC', 'PTE', 'LCP', 'CPL', '3SG', '2SG', '1SG', 'SSG', 'MSG',
    '3WO', '2WO', '1WO', 'MWO', 'SWO',
    '2LT', 'LTA', 'CPT', 'MAJ', 'LTC', 'COL', 'BG', 'MG', 'LG',
    'ME4T', 'ME4A', 'ME1', 'ME2', 'ME3', 'ME4', 'ME5', 'ME6', 'ME7', 'ME8', 'ME9',
  ];

  const wings = [
    'ALPHA WING',
    'CHARLIE WING',
    'DELTA WING',
    'ECHO WING',
    'TANGO WING',
    'SIERRA WING',
    'MIDS WING',
    'AIR WING',
    'DIS WING',
    'OCS HQ',
    'CLD',
  ];

  const userNames = [
    'SIEW WEI HENG',
    'ISAAC QUEK JOE HONG',
    'BRYAN LIM JUN HUANG',
  ];

  useEffect(() => {
    fetchExercises();
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

    if (!selectedExercise || !rank || !name || !wing || !value.trim()) {
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
          rank: rank.trim(),
          name: name.trim(),
          wing: wing.trim(),
          exerciseId: selectedExercise,
          value: numValue,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Score submitted successfully!' });
        setRank('');
        setName('');
        setWing('');
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
            onEnterPress={() => {
              const nameInput = document.getElementById('name') as HTMLInputElement;
              if (nameInput) nameInput.focus();
            }}
          />
        </div>

        <div>
          <SearchableDropdown
            id="name"
            options={userNames}
            value={name}
            onChange={setName}
            placeholder="Search or type your name"
            label="Name"
            required
            onEnterPress={() => {
              const wingInput = document.getElementById('wing') as HTMLInputElement;
              if (wingInput) wingInput.focus();
            }}
          />
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
            onEnterPress={() => {
              const valueInput = document.getElementById('value') as HTMLInputElement;
              if (valueInput) valueInput.focus();
            }}
          />
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

