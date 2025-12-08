'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import SearchableDropdown from './SearchableDropdown';
import ExerciseIcon from './ExerciseIcon';

interface LeaderboardEntry {
  id: number;
  value: number;
  created_at: string;
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
  user_name: string;
  wing: string | null;
  user_id: number;
}

interface TotalRepsEntry {
  rank: number;
  user_id: number;
  user_name: string;
  wing: string | null;
  total_reps: number;
  achieved_goal: boolean;
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
  const [activeTab, setActiveTab] = useState<'exercise' | 'all' | 'total'>('exercise');
  const [wing, setWing] = useState('OCS LEVEL');
  const [exerciseBasedData, setExerciseBasedData] = useState<ExerciseBasedEntry[]>([]);
  const [allData, setAllData] = useState<Record<string, LeaderboardEntry[]>>({});
  const [totalRepsData, setTotalRepsData] = useState<TotalRepsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [exercisePages, setExercisePages] = useState<Record<string, number>>({});
  const itemsPerPage = 10;
  const GOAL_REPS = 20260;
  // Add OCS LEVEL at the beginning for the filter
  const wings = ['OCS LEVEL', ...allWings];

  // Deduplicate entries: keep only the highest rep count for each unique combination of name and wing
  const deduplicateEntries = useCallback((entries: LeaderboardEntry[]): LeaderboardEntry[] => {
    const entryMap = new Map<string, LeaderboardEntry>();
    
    for (const entry of entries) {
      // Create a unique key from name and wing
      const key = `${entry.user_name}|${entry.wing || ''}`;
      
      const existingEntry = entryMap.get(key);
      if (!existingEntry) {
        // First entry for this person
        entryMap.set(key, entry);
      } else {
        // Compare values and keep the one with the highest rep count
        if (entry.value > existingEntry.value) {
          // Current entry has higher value, keep it
          entryMap.set(key, entry);
        } else if (entry.value === existingEntry.value) {
          // Same value, keep the one with the latest date
          const existingDate = new Date(existingEntry.created_at);
          const currentDate = new Date(entry.created_at);
          if (currentDate > existingDate) {
            entryMap.set(key, entry);
          }
        }
        // If existing entry has higher value, keep it (do nothing)
      }
    }
    
    // Convert back to array and re-sort by value DESC, then created_at DESC
    const deduplicated = Array.from(entryMap.values());
    return deduplicated.sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value; // Sort by value DESC
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Then by date DESC
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const loadingToast = toast.loading('Loading leaderboard...');
    try {
      if (activeTab === 'total') {
        const response = await fetch('/api/total-reps');
        if (response.ok) {
          const data = await response.json();
          console.log('total reps leaderboard fetched:', data);
          setTotalRepsData(data);
          toast.dismiss(loadingToast);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch total reps leaderboard' }));
          toast.dismiss(loadingToast);
          toast.error(errorData.error || 'Failed to fetch total reps leaderboard');
        }
      } else if (activeTab === 'exercise') {
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
            // Deduplicate entries: keep only latest entry for each unique combination of name, wing, and value
            const deduplicatedData = deduplicateEntries(lbData);
            leaderboards[exercise.name] = deduplicatedData;
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
  }, [wing, activeTab, exercises, deduplicateEntries]);

  useEffect(() => {
    fetchData();
    setCurrentPage(1); // Reset to first page when data changes
    setExercisePages({}); // Reset exercise pages
  }, [fetchData]);

  const getDisplayName = (entry: LeaderboardEntry | ExerciseBasedEntry) => {
    return entry.user_name;
  };

  // Pagination helpers for Exercise-Based View
  const totalPagesExercise = Math.ceil(exerciseBasedData.length / itemsPerPage);
  const startIndexExercise = (currentPage - 1) * itemsPerPage;
  const endIndexExercise = startIndexExercise + itemsPerPage;
  const paginatedExerciseData = exerciseBasedData.slice(startIndexExercise, endIndexExercise);

  // Pagination helpers for Total Reps View
  const totalPagesTotalReps = Math.ceil(totalRepsData.length / itemsPerPage);
  const startIndexTotalReps = (currentPage - 1) * itemsPerPage;
  const endIndexTotalReps = startIndexTotalReps + itemsPerPage;
  const paginatedTotalRepsData = totalRepsData.slice(startIndexTotalReps, endIndexTotalReps);

  // Export to CSV functions for different tabs
  const exportTotalRepsToCSV = () => {
    const headers = ['Rank', 'Name', 'Wing', 'Total Reps', 'Achieved Goal (20260)'];
    const rows = totalRepsData.map(entry => [
      entry.rank,
      entry.user_name,
      entry.wing || '-',
      entry.total_reps,
      entry.achieved_goal ? 'Yes' : 'No'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `total-reps-leaderboard-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully!');
  };

  const exportExerciseBasedToCSV = () => {
    const headers = ['Exercise', 'Name', 'Wing', 'Reps', 'Date'];
    const rows = exerciseBasedData.map(entry => [
      entry.exercise_name,
      entry.user_name,
      entry.wing || '-',
      entry.value,
      formatDate(entry.created_at)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `exercise-based-leaderboard-${wing}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully!');
  };

  const exportAllScoresToCSV = () => {
    const allRows: string[][] = [];
    const headers = ['Exercise', 'Name', 'Wing', 'Reps', 'Date'];
    
    exercises.forEach(exercise => {
      const entries = allData[exercise.name] || [];
      entries.forEach(entry => {
        allRows.push([
          exercise.name,
          entry.user_name,
          entry.wing || '-',
          entry.value.toString(),
          formatDate(entry.created_at)
        ]);
      });
    });
    
    const csvContent = [
      headers.join(','),
      ...allRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `all-scores-leaderboard-${wing}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully!');
  };

  const handleExport = () => {
    if (activeTab === 'total') {
      exportTotalRepsToCSV();
    } else if (activeTab === 'exercise') {
      exportExerciseBasedToCSV();
    } else {
      exportAllScoresToCSV();
    }
  };

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
    <div className="bg-black border border-white/20 rounded-lg shadow-md p-4 sm:p-6">
      {activeTab !== 'total' && (
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
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/20 mb-6 gap-4">
        <div className="overflow-x-auto w-full sm:w-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <div className="flex flex-nowrap sm:flex-wrap">
            <button
              onClick={() => setActiveTab('exercise')}
              className={`px-4 sm:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'exercise'
                  ? 'text-[#ff7301] border-b-2 border-[#ff7301]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Exercise-Based View
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 sm:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'text-[#ff7301] border-b-2 border-[#ff7301]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              All Scores View
            </button>
            <button
              onClick={() => setActiveTab('total')}
              className={`px-4 sm:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'total'
                  ? 'text-[#ff7301] border-b-2 border-[#ff7301]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Total Reps
            </button>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors self-start sm:self-auto"
          title="Export to CSV"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
        </button>
      </div>

      {loading ? (
        <p className="text-white/70">Loading...</p>
      ) : activeTab === 'total' ? (
        <>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white mb-2">Total Reps Leaderboard</h2>
            <p className="text-white/70 text-sm">Goal: 20260 reps to unlock the Medal (July 26)</p>
          </div>
          {totalRepsData.length === 0 ? (
            <div className="py-8 text-center text-white/70">
              No scores yet. Be the first!
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {paginatedTotalRepsData.map((entry) => (
                  <div
                    key={entry.user_id}
                    className={`border border-white/20 rounded-lg p-4 ${
                      entry.achieved_goal ? 'bg-green-900/30 border-green-600/50' : 'bg-black'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white/70 text-sm">#{entry.rank}</span>
                          <span className={`font-medium ${
                            entry.achieved_goal ? 'text-green-400 font-bold' : 'text-white'
                          }`}>
                            {entry.user_name}
                            {entry.achieved_goal && (
                              <span className="ml-2 text-green-400">✓</span>
                            )}
                          </span>
                        </div>
                        <div className="text-white/80 text-sm">
                          {entry.wing || '-'}
                        </div>
                      </div>
                      <div className={`text-right font-semibold text-lg ${
                        entry.achieved_goal ? 'text-green-400' : 'text-[#ff7301]'
                      }`}>
                        {entry.total_reps.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      {entry.achieved_goal ? (
                        <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                          Goal Achieved
                        </span>
                      ) : (
                        <span className="text-white/50 text-xs">
                          {GOAL_REPS - entry.total_reps} to go
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-4 font-semibold text-white">Rank</th>
                      <th className="text-left py-2 px-4 font-semibold text-white">Name</th>
                      <th className="text-left py-2 px-4 font-semibold text-white">Wing</th>
                      <th className="text-right py-2 px-4 font-semibold text-white">Total Reps</th>
                      <th className="text-center py-2 px-4 font-semibold text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTotalRepsData.map((entry) => (
                      <tr
                        key={entry.user_id}
                        className={`border-b border-white/10 hover:bg-white/5 ${
                          entry.achieved_goal ? 'bg-green-900/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-white font-medium">
                          #{entry.rank}
                        </td>
                        <td className={`py-3 px-4 font-medium ${
                          entry.achieved_goal ? 'text-green-400 font-bold' : 'text-white'
                        }`}>
                          {entry.user_name}
                          {entry.achieved_goal && (
                            <span className="ml-2 text-green-400">✓</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-white/80">
                          {entry.wing || '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${
                          entry.achieved_goal ? 'text-green-400' : 'text-[#ff7301]'
                        }`}>
                          {entry.total_reps.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {entry.achieved_goal ? (
                            <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                              Goal Achieved
                            </span>
                          ) : (
                            <span className="text-white/50 text-sm">
                              {GOAL_REPS - entry.total_reps} to go
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {totalPagesTotalReps > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4 pt-4 border-t border-white/20">
              <div className="text-white/70 text-sm">
                Showing {startIndexTotalReps + 1} to {Math.min(endIndexTotalReps, totalRepsData.length)} of {totalRepsData.length} entries
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
                  Page {currentPage} of {totalPagesTotalReps}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPagesTotalReps, prev + 1))}
                  disabled={currentPage === totalPagesTotalReps}
                  className="px-3 py-1 rounded-md bg-[#ff7301] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ff7301]/90 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'exercise' ? (
        <>
          {exerciseBasedData.length === 0 ? (
            <div className="py-8 text-center text-white/70">
              No scores yet. Be the first!
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {paginatedExerciseData.map((entry) => (
                  <div
                    key={entry.exercise_id}
                    className="border border-white/20 rounded-lg p-4 bg-black hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <ExerciseIcon exerciseName={entry.exercise_name} className="w-5 h-5 text-[#ff7301]" />
                          <span className="text-white font-medium text-sm">
                            {entry.exercise_name}
                          </span>
                        </div>
                        <div className="text-white text-sm mb-1">
                          {getDisplayName(entry)}
                        </div>
                        <div className="text-white/80 text-xs">
                          {entry.wing || '-'}
                        </div>
                      </div>
                      <div className="text-[#ff7301] text-right font-semibold text-lg">
                        {entry.value}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-white/70 text-xs">
                        {formatDate(entry.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
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
                    {paginatedExerciseData.map((entry) => (
                      <tr
                        key={entry.exercise_id}
                        className="border-b border-white/10 hover:bg-white/5"
                      >
                        <td className="py-3 px-4 text-white font-medium">
                          <div className="flex items-center gap-2">
                            <ExerciseIcon exerciseName={entry.exercise_name} className="w-5 h-5 text-[#ff7301]" />
                            {entry.exercise_name}
                          </div>
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
            </>
          )}
          {totalPagesExercise > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4 pt-4 border-t border-white/20">
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
                  <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                    <ExerciseIcon exerciseName={exercise.name} className="w-6 h-6 text-[#ff7301]" />
                    {exercise.name} Leaderboard
                  </h2>
                  {entries.length === 0 ? (
                    <p className="text-white/70">No scores yet. Be the first!</p>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="block sm:hidden space-y-3">
                        {paginatedEntries.map((entry, index) => (
                          <div
                            key={entry.id}
                            className="border border-white/20 rounded-lg p-4 bg-black hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white/70 text-xs">#{startIndex + index + 1}</span>
                                  <span className="text-white text-sm font-medium">
                                    {getDisplayName(entry)}
                                  </span>
                                </div>
                                <div className="text-white/80 text-xs">
                                  {entry.wing || '-'}
                                </div>
                              </div>
                              <div className="text-[#ff7301] text-right font-semibold text-lg">
                                {entry.value}
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <div className="text-white/70 text-xs">
                                {formatDate(entry.created_at)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/20">
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
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4 pt-4 border-t border-white/20">
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
