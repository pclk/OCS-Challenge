'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ExerciseIcon from './ExerciseIcon';

interface Exercise {
  id: number;
  name: string;
  type: string;
}

interface ExerciseScoresFormProps {
  name: string;
  wing: string;
  exercises: Exercise[];
  onScoreSubmitted?: () => void;
  onBack?: () => void;
}

export default function ExerciseScoresForm({ 
  name,
  wing,
  exercises, 
  onScoreSubmitted,
  onBack 
}: ExerciseScoresFormProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleScoreChange = (exerciseId: number, value: string) => {
    setScores(prev => ({
      ...prev,
      [exerciseId]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Filter out exercises with no values
    const validScores = Object.entries(scores)
      .filter(([_, value]) => value.trim() !== '')
      .map(([exerciseId, value]) => ({
        exerciseId: parseInt(exerciseId, 10),
        value: value.trim(),
      }));

    if (validScores.length === 0) {
      const errorMsg = 'Please enter at least one score';
      setMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
      return;
    }

    // Validate all values are numbers
    for (const score of validScores) {
      const numValue = parseInt(score.value, 10);
      if (isNaN(numValue) || numValue < 0) {
        const errorMsg = `Invalid value for exercise. Please enter a valid number.`;
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg);
        return;
      }
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Submitting scores...');

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          wing: wing.trim(),
          scores: validScores,
        }),
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (response.ok) {
        const successMsg = `Successfully submitted ${data.submitted || validScores.length} score(s)!`;
        setMessage({ type: 'success', text: successMsg });
        toast.success(successMsg);
        
        // Clear all scores
        setScores({});
        
        router.refresh();
        if (onScoreSubmitted) {
          onScoreSubmitted();
        }
      } else {
        const errorMsg = data.error || 'Failed to submit scores';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMsg = 'Network error. Please check your connection and try again.';
      setMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
      console.error('Error submitting scores:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-black border border-white/20 rounded-lg shadow-md mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Enter Your Scores</h2>
            <p className="text-white/70 mt-1">
              Wing: <span className="text-[#ff7301] font-semibold">{wing}</span> | 
              Name: <span className="text-[#ff7301] font-semibold">{name}</span>
            </p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-white/70 hover:text-white transition-colors"
            >
              ← Change Name
            </button>
          )}
        </div>

        <p className="text-white/70 mb-6 text-sm">
          Enter your scores below. Leave exercises blank if you didn&apos;t complete them.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {exercises.map((exercise) => {
            const inputLabel = exercise.type === 'seconds' ? 'Seconds' : 'Reps';
            const value = scores[exercise.id] || '';

            return (
              <div key={exercise.id}>
                <label 
                  htmlFor={`exercise-${exercise.id}`} 
                  className="flex items-center gap-2 text-sm font-medium text-white mb-1"
                >
                  <ExerciseIcon exerciseName={exercise.name} className="w-5 h-5 text-[#ff7301]" />
                  {exercise.name} ({inputLabel})
                </label>
                <input
                  id={`exercise-${exercise.id}`}
                  type="number"
                  value={value}
                  onChange={(e) => handleScoreChange(exercise.id, e.target.value)}
                  className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
                  placeholder={`Enter ${inputLabel.toLowerCase()}`}
                  min="0"
                />
              </div>
            );
          })}

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
              disabled={isSubmitting}
              className={`${onBack ? 'flex-1' : 'w-full'} bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Scores'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

