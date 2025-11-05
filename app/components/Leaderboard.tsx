'use client';

import { useState, useEffect } from 'react';
import SearchableDropdown from './SearchableDropdown';

interface LeaderboardEntry {
  id: number;
  value: number;
  created_at: string;
  rank: string | null;
  user_name: string;
  wing: string | null;
  user_id: number;
}

interface ExerciseBasedEntry {
  exercise_id: number;
  exercise_name: string;
  exercise_type: string;
  value: number;
  created_at: string;
  rank: string | null;
  user_name: string;
  wing: string | null;
  user_id: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'exercise' | 'all'>('exercise');
  const [wing, setWing] = useState('OCS LEVEL');
  const [exerciseBasedData, setExerciseBasedData] = useState<ExerciseBasedEntry[]>([]);
  const [allData, setAllData] = useState<Record<string, LeaderboardEntry[]>>({});
  const [exercises, setExercises] = useState<Array<{ id: number; name: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [wings, setWings] = useState<string[]>([]);

  useEffect(() => {
    fetchExercises();
    fetchWings();
  }, []);

  const fetchWings = async () => {
    try {
      const response = await fetch('/api/wings');
      if (response.ok) {
        const data = await response.json();
        // Add OCS LEVEL at the beginning for the filter
        setWings(['OCS LEVEL', ...data]);
      }
    } catch (error) {
      console.error('Error fetching wings:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [wing, activeTab]);

  const fetchExercises = async () => {
    try {
      const response = await fetch('/api/exercises');
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'exercise') {
        const response = await fetch(`/api/exercise-leaderboard?wing=${encodeURIComponent(wing)}`);
        if (response.ok) {
          const data = await response.json();
          setExerciseBasedData(data);
        }
      } else {
        const response = await fetch('/api/exercises');
        if (response.ok) {
          const exData = await response.json();
          const leaderboards: Record<string, LeaderboardEntry[]> = {};
          
          for (const exercise of exData) {
            const lbResponse = await fetch(
              `/api/scores?exerciseId=${exercise.id}&limit=10&wing=${encodeURIComponent(wing)}`
            );
            if (lbResponse.ok) {
              const lbData = await lbResponse.json();
              leaderboards[exercise.name] = lbData;
            }
          }
          setAllData(leaderboards);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (entry: LeaderboardEntry | ExerciseBasedEntry) => {
    const rankPart = entry.rank ? `${entry.rank} ` : '';
    return `${rankPart}${entry.user_name}`;
  };

  return (
    <div className="bg-black border border-white/20 rounded-lg shadow-md p-6">
      <div className="mb-4">
        <SearchableDropdown
          id="wing-filter"
          options={wings}
          value={wing}
          onChange={setWing}
          placeholder="Filter by wing"
          label="Filter by Wing"
        />
      </div>

      <div className="flex border-b border-white/20 mb-6">
        <button
          onClick={() => setActiveTab('exercise')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'exercise'
              ? 'text-[#ff7301] border-b-2 border-[#ff7301]'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Exercise-Based View
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'all'
              ? 'text-[#ff7301] border-b-2 border-[#ff7301]'
              : 'text-white/70 hover:text-white'
          }`}
        >
          All Scores View
        </button>
      </div>

      {loading ? (
        <p className="text-white/70">Loading...</p>
      ) : activeTab === 'exercise' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-2 px-4 font-semibold text-white">Exercise</th>
                <th className="text-left py-2 px-4 font-semibold text-white">Name</th>
                <th className="text-right py-2 px-4 font-semibold text-white">Reps</th>
                <th className="text-right py-2 px-4 font-semibold text-white">Date</th>
              </tr>
            </thead>
            <tbody>
              {exerciseBasedData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-white/70">
                    No scores yet. Be the first!
                  </td>
                </tr>
              ) : (
                exerciseBasedData.map((entry) => (
                  <tr
                    key={entry.exercise_id}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
                    <td className="py-3 px-4 text-white font-medium">
                      {entry.exercise_name}
                    </td>
                    <td className="py-3 px-4 text-white">
                      {getDisplayName(entry)}
                    </td>
                    <td className="py-3 px-4 text-[#ff7301] text-right font-semibold">
                      {entry.value}
                    </td>
                    <td className="py-3 px-4 text-white/70 text-right text-sm">
                      {formatDate(entry.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {exercises.length === 0 ? (
            <p className="text-white/70">No exercises available.</p>
          ) : (
            exercises.map((exercise) => {
              const entries = allData[exercise.name] || [];
              return (
                <div key={exercise.id} className="bg-black border border-white/20 rounded-lg p-4">
                  <h2 className="text-xl font-bold mb-4 text-white">
                    {exercise.name} Leaderboard
                  </h2>
                  {entries.length === 0 ? (
                    <p className="text-white/70">No scores yet. Be the first!</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left py-2 px-4 font-semibold text-white">Rank</th>
                            <th className="text-left py-2 px-4 font-semibold text-white">Name</th>
                            <th className="text-right py-2 px-4 font-semibold text-white">
                              {exercise.type === 'seconds' ? 'Seconds' : 'Reps'}
                            </th>
                            <th className="text-right py-2 px-4 font-semibold text-white">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry, index) => (
                            <tr
                              key={entry.id}
                              className="border-b border-white/10 hover:bg-white/5"
                            >
                              <td className="py-3 px-4 text-white font-medium">
                                #{index + 1}
                              </td>
                              <td className="py-3 px-4 text-white">
                                {getDisplayName(entry)}
                              </td>
                              <td className="py-3 px-4 text-[#ff7301] text-right font-semibold">
                                {entry.value}
                              </td>
                              <td className="py-3 px-4 text-white/70 text-right text-sm">
                                {formatDate(entry.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
