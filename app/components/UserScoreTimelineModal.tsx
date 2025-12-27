'use client';

import { useState, useEffect } from 'react';
import ExerciseIcon from './ExerciseIcon';

interface Score {
  id: number;
  value: number;
  createdAt: string;
  exerciseId: number;
  exerciseName: string;
  exerciseType: string;
  userId: number;
  userName: string;
  userWing: string | null;
}

interface UserScoreTimelineModalProps {
  isOpen: boolean;
  userId: number;
  userName: string;
  userWing: string | null;
  onClose: () => void;
}

export default function UserScoreTimelineModal({
  isOpen,
  userId,
  userName,
  userWing,
  onClose,
}: UserScoreTimelineModalProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchScores();
    }
  }, [isOpen, userId]);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/scores?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setScores(data.scores);
      }
    } catch (error) {
      console.error('Failed to fetch scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Score Timeline</h3>
              <p className="text-white/70 text-sm mt-1">
                {userName} {userWing && `(${userWing})`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-white/70 py-8">Loading scores...</div>
          ) : scores.length === 0 ? (
            <div className="text-center text-white/70 py-8">No scores recorded yet</div>
          ) : (
            <div className="space-y-4">
              {scores.map((score, index) => (
                <div
                  key={score.id}
                  className="border border-white/20 rounded-lg p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <ExerciseIcon exerciseName={score.exerciseName} className="w-6 h-6 text-[#ff7301]" />
                      <div>
                        <div className="text-white font-semibold">{score.exerciseName}</div>
                        <div className="text-white/50 text-xs mt-1">{formatDate(score.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-[#ff7301] font-bold text-xl">
                      {score.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



