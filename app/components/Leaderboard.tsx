'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
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

interface LeaderboardProps {
  exercises: Array<{ id: number; name: string; type: string }>;
  wings: string[];
}

export default function Leaderboard({ exercises, wings: allWings }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'exercise' | 'all'>('exercise');
  const [wing, setWing] = useState('OCS LEVEL');
  const [exerciseBasedData, setExerciseBasedData] = useState<ExerciseBasedEntry[]>([]);
  const [allData, setAllData] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [exercisePages, setExercisePages] = useState<Record<string, number>>({});
  const itemsPerPage = 10;
  // Add OCS LEVEL at the beginning for the filter
  const wings = ['OCS LEVEL', ...allWings];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const loadingToast = toast.loading('Loading leaderboard...');
    try {
      if (activeTab === 'exercise') {
        const response = await fetch(`/api/exercise-leaderboard?wing=${encodeURIComponent(wing)}`);
        if (response.ok) {
          const data = await response.json();
          console.log('exercise-based leaderboard fetched:', data);
          setExerciseBasedData(data);
          toast.dismiss(loadingToast);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch leaderboard' }));
          toast.dismiss(loadingToast);
          toast.error(errorData.error || 'Failed to fetch leaderboard');
        }
      } else {
        // Use exercises prop instead of fetching again
        if (exercises.length === 0) {
          toast.dismiss(loadingToast);
          setLoading(false);
          return;
        }
        
        const leaderboards: Record<string, LeaderboardEntry[]> = {};
        
        for (const exercise of exercises) {
          const lbResponse = await fetch(
            `/api/scores?exerciseId=${exercise.id}&limit=100&wing=${encodeURIComponent(wing)}`
          );
          if (lbResponse.ok) {
            const lbData = await lbResponse.json();
            leaderboards[exercise.name] = lbData;
          } else {
            const errorData = await lbResponse.json().catch(() => ({ error: 'Failed to fetch scores' }));
            toast.error(`Failed to fetch scores for ${exercise.name}: ${errorData.error || 'Unknown error'}`);
          }
        }
        setAllData(leaderboards);
        toast.dismiss(loadingToast);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error fetching leaderboard data:', error);
      toast.error('Network error: Unable to fetch leaderboard. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [wing, activeTab, exercises]);

  useEffect(() => {
    fetchData();
    setCurrentPage(1); // Reset to first page when data changes
    setExercisePages({}); // Reset exercise pages
  }, [fetchData]);

  const getDisplayName = (entry: LeaderboardEntry | ExerciseBasedEntry) => {
    const rankPart = entry.rank ? `${entry.rank} ` : '';
    return `${rankPart}${entry.user_name}`;
  };

  // Pagination helpers for Exercise-Based View
  const totalPagesExercise = Math.ceil(exerciseBasedData.length / itemsPerPage);
  const startIndexExercise = (currentPage - 1) * itemsPerPage;
  const endIndexExercise = startIndexExercise + itemsPerPage;
  const paginatedExerciseData = exerciseBasedData.slice(startIndexExercise, endIndexExercise);

  // Pagination helpers for All Scores View
  const getExercisePage = (exerciseName: string) => exercisePages[exerciseName] || 1;
  const setExercisePage = (exerciseName: string, page: number) => {
    setExercisePages(prev => ({ ...prev, [exerciseName]: page }));
  };
  const getPaginatedEntries = (entries: LeaderboardEntry[], exerciseName: string) => {
    const page = getExercisePage(exerciseName);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return entries.slice(startIndex, endIndex);
  };
  const getTotalPages = (entries: LeaderboardEntry[]) => Math.ceil(entries.length / itemsPerPage);

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
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 px-4 font-semibold text-white">Exercise</th>
                  <th className="text-left py-2 px-4 font-semibold text-white">Name</th>
                  <th className="text-left py-2 px-4 font-semibold text-white">Wing</th>
                  <th className="text-right py-2 px-4 font-semibold text-white">Reps</th>
                  <th className="text-right py-2 px-4 font-semibold text-white">Date</th>
                </tr>
              </thead>
              <tbody>
                {exerciseBasedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/70">
                      No scores yet. Be the first!
                    </td>
                  </tr>
                ) : (
                  paginatedExerciseData.map((entry) => (
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
                      <td className="py-3 px-4 text-white/80">
                        {entry.wing || '-'}
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
          {totalPagesExercise > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
              <div className="text-white/70 text-sm">
                Showing {startIndexExercise + 1} to {Math.min(endIndexExercise, exerciseBasedData.length)} of {exerciseBasedData.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-md bg-[#ff7301] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ff7301]/90 transition-colors"
                >
                  Previous
                </button>
                <span className="text-white/70 text-sm">
                  Page {currentPage} of {totalPagesExercise}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPagesExercise, prev + 1))}
                  disabled={currentPage === totalPagesExercise}
                  className="px-3 py-1 rounded-md bg-[#ff7301] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ff7301]/90 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {exercises.length === 0 ? (
            <p className="text-white/70">No exercises available.</p>
          ) : (
            exercises.map((exercise) => {
              const entries = allData[exercise.name] || [];
              const paginatedEntries = getPaginatedEntries(entries, exercise.name);
              const totalPages = getTotalPages(entries);
              const currentExercisePage = getExercisePage(exercise.name);
              const startIndex = (currentExercisePage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              
              return (
                <div key={exercise.id} className="bg-black border border-white/20 rounded-lg p-4">
                  <h2 className="text-xl font-bold mb-4 text-white">
                    {exercise.name} Leaderboard
                  </h2>
                  {entries.length === 0 ? (
                    <p className="text-white/70">No scores yet. Be the first!</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/20">
                              <th className="text-left py-2 px-4 font-semibold text-white">Rank</th>
                              <th className="text-left py-2 px-4 font-semibold text-white">Name</th>
                              <th className="text-left py-2 px-4 font-semibold text-white">Wing</th>
                              <th className="text-right py-2 px-4 font-semibold text-white">
                                {exercise.type === 'seconds' ? 'Seconds' : 'Reps'}
                              </th>
                              <th className="text-right py-2 px-4 font-semibold text-white">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedEntries.map((entry, index) => (
                              <tr
                                key={entry.id}
                                className="border-b border-white/10 hover:bg-white/5"
                              >
                                <td className="py-3 px-4 text-white font-medium">
                                  #{startIndex + index + 1}
                                </td>
                                <td className="py-3 px-4 text-white">
                                  {getDisplayName(entry)}
                                </td>
                                <td className="py-3 px-4 text-white/80">
                                  {entry.wing || '-'}
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
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                          <div className="text-white/70 text-sm">
                            Showing {startIndex + 1} to {Math.min(endIndex, entries.length)} of {entries.length} entries
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExercisePage(exercise.name, Math.max(1, currentExercisePage - 1))}
                              disabled={currentExercisePage === 1}
                              className="px-3 py-1 rounded-md bg-[#ff7301] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ff7301]/90 transition-colors"
                            >
                              Previous
                            </button>
                            <span className="text-white/70 text-sm">
                              Page {currentExercisePage} of {totalPages}
                            </span>
                            <button
                              onClick={() => setExercisePage(exercise.name, Math.min(totalPages, currentExercisePage + 1))}
                              disabled={currentExercisePage === totalPages}
                              className="px-3 py-1 rounded-md bg-[#ff7301] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ff7301]/90 transition-colors"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
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
