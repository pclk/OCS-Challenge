'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Exercise {
  id: number;
  name: string;
  type: string;
}

interface AddScoreModalProps {
  isOpen: boolean;
  userId: number;
  userName: string;
  adminToken: string | null;
  onClose: () => void;
  onScoreAdded?: () => void;
}

export default function AddScoreModal({
  isOpen,
  userId,
  userName,
  adminToken,
  onClose,
  onScoreAdded,
}: AddScoreModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingExercises, setFetchingExercises] = useState(false);

  useEffect(() => {
    if (isOpen && adminToken) {
      fetchExercises();
    }
  }, [isOpen, adminToken]);

  const fetchExercises = async () => {
    setFetchingExercises(true);
    try {
      const response = await fetch('/api/exercises');
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      } else {
        toast.error('Failed to fetch exercises');
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      toast.error('Network error: Unable to fetch exercises');
    } finally {
      setFetchingExercises(false);
    }
  };

  const handleScoreChange = (exerciseId: number, value: string) => {
    setScores((prev) => ({
      ...prev,
      [exerciseId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminToken) {
      toast.error('Admin token required');
      return;
    }

    // Filter out empty scores and validate
    const validScores = exercises
      .filter((exercise) => {
        const value = scores[exercise.id];
        if (!value || value.trim() === '') return false;
        const numValue = parseInt(value, 10);
        return !isNaN(numValue) && numValue >= 0;
      })
      .map((exercise) => ({
        exerciseId: exercise.id,
        value: parseInt(scores[exercise.id], 10),
      }));

    if (validScores.length === 0) {
      toast.error('Please enter at least one valid score');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Adding scores...');

    try {
      const response = await fetch('/api/admin/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId,
          scores: validScores,
        }),
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success(`Successfully added ${validScores.length} score(s) for ${userName}`);
        setScores({});
        if (onScoreAdded) {
          onScoreAdded();
        }
        onClose();
      } else {
        toast.error(data.error || 'Failed to add scores');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error adding scores:', error);
      toast.error('Network error: Unable to add scores');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-white">Add Scores for {userName}</h3>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {fetchingExercises ? (
            <p className="text-white/70">Loading exercises...</p>
          ) : exercises.length === 0 ? (
            <p className="text-white/70">No exercises available</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {exercises.map((exercise) => (
                  <div key={exercise.id} className="border border-white/20 rounded-md p-4">
                    <label className="block text-white font-medium mb-2">
                      {exercise.name} ({exercise.type === 'seconds' ? 'Seconds' : 'Reps'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={scores[exercise.id] || ''}
                      onChange={(e) => handleScoreChange(exercise.id, e.target.value)}
                      placeholder={`Enter ${exercise.type === 'seconds' ? 'seconds' : 'reps'}`}
                      className="w-full px-4 py-2 border border-white/20 rounded-md bg-black text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301]"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/20">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || Object.keys(scores).length === 0}
                  className="flex-1 bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Scores'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

