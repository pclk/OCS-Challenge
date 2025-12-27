'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import SearchableDropdown from './SearchableDropdown';
import ExerciseIcon from './ExerciseIcon';
import { useAuth } from './AuthContext';
import UserScoreTimelineModal from './UserScoreTimelineModal';

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'exercise' | 'all' | 'total'>('total');
  const [wing, setWing] = useState('OCS LEVEL');
  const [exerciseBasedData, setExerciseBasedData] = useState<ExerciseBasedEntry[]>([]);
  const [allData, setAllData] = useState<Record<string, LeaderboardEntry[]>>({});
  const [totalRepsData, setTotalRepsData] = useState<TotalRepsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [exercisePages, setExercisePages] = useState<Record<string, number>>({});
  const [timelineModal, setTimelineModal] = useState<{ userId: number; userName: string; userWing: string | null } | null>(null);
  const [totalRepsSearch, setTotalRepsSearch] = useState('');
  const itemsPerPage = 10;
  const itemsPerPageTotal = 5; // Separate page size for total reps view
  const GOAL_REPS = 20260;
  // Add OCS LEVEL at the beginning for the filter
  const wings = ['OCS LEVEL', ...allWings];
  const fetchingRef = useRef(false);

  // Helper function to check if entry matches current user
  const isUserEntry = useCallback((entryName: string, entryWing: string | null) => {
    if (!user) return false;
    return entryName === user.name && entryWing === user.wing;
  }, [user]);

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
    // Prevent duplicate fetches
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;
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
      fetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wing, activeTab, deduplicateEntries]);

  // Memoize exercises length and IDs to prevent unnecessary refetches
  const exercisesKey = useMemo(() => {
    return exercises.map(e => `${e.id}-${e.name}`).join(',');
  }, [exercises]);

  useEffect(() => {
    fetchData();
    if (activeTab !== 'total') {
      setCurrentPage(1); // Reset to first page when data changes (except for total view which has its own search)
    }
    setExercisePages({}); // Reset exercise pages
  }, [wing, activeTab, exercisesKey, fetchData]);

  const getDisplayName = (entry: LeaderboardEntry | ExerciseBasedEntry) => {
    return entry.user_name;
  };

  // Helper function to get rank color class
  const getRankColorClass = (rank: number) => {
    if (rank === 1) return 'text-yellow-400'; // Gold
    if (rank === 2) return 'text-gray-300'; // Silver
    if (rank === 3) return 'text-amber-600'; // Bronze
    return 'text-white/70'; // Gray for rest
  };

  // Process Exercise-Based data: filter out entries without username, do NOT add placeholder
  const processedExerciseBasedData = useMemo(() => {
    // Filter out entries without user_name
    const filteredData = exerciseBasedData.filter(entry => entry.user_name && entry.user_name.trim() !== '');
    
    // Do not add placeholder for exercise-based view
    return filteredData;
  }, [exerciseBasedData]);

  // Process Total Reps data: add placeholder if user has no entry, then filter by search, then sort by rank
  const processedTotalRepsData = useMemo(() => {
    let data = totalRepsData;
    
    // Add placeholder if user has no entry
    if (user && totalRepsData.length > 0) {
      const hasUserEntry = totalRepsData.some(entry => 
        isUserEntry(entry.user_name, entry.wing)
      );
      
      if (!hasUserEntry) {
        // Find the lowest rank to place placeholder
        const maxRank = Math.max(...totalRepsData.map(e => e.rank || 0), 0);
        const placeholder: TotalRepsEntry = {
          rank: maxRank + 1,
          user_id: user.id,
          user_name: user.name,
          wing: user.wing,
          total_reps: 0,
          achieved_goal: false,
        };
        data = [...totalRepsData, placeholder];
      }
    }
    
    // Filter by search query if provided
    if (totalRepsSearch.trim()) {
      const searchLower = totalRepsSearch.toLowerCase().trim();
      data = data.filter(entry => 
        entry.user_name.toLowerCase().includes(searchLower) ||
        (entry.wing && entry.wing.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by rank (ascending)
    data = [...data].sort((a, b) => (a.rank || 0) - (b.rank || 0));
    
    return data;
  }, [totalRepsData, user, isUserEntry, totalRepsSearch]);

  // Process All Data: add placeholder for each exercise if user has no entry
  const processedAllData = useMemo(() => {
    if (!user) return allData;
    
    const processed: Record<string, LeaderboardEntry[]> = {};
    
    exercises.forEach(exercise => {
      const entries = allData[exercise.name] || [];
      const hasUserEntry = entries.some(entry => 
        isUserEntry(entry.user_name, entry.wing)
      );
      
      if (!hasUserEntry && entries.length > 0) {
        const placeholder: LeaderboardEntry = {
          id: -1,
          value: 0,
          created_at: new Date().toISOString(),
          user_name: user.name,
          wing: user.wing,
          user_id: user.id,
        };
        processed[exercise.name] = [...entries, placeholder];
      } else {
        processed[exercise.name] = entries;
      }
    });
    
    return processed;
  }, [allData, user, exercises, isUserEntry]);

  // Helper to find user's entry in TotalRepsEntry dataset
  const findUserTotalRepsEntry = useCallback((entries: TotalRepsEntry[]) => {
    if (!user) return null;
    return entries.find(entry => isUserEntry(entry.user_name, entry.wing)) || null;
  }, [user, isUserEntry]);

  // Helper to find user's entry in ExerciseBasedEntry dataset
  const findUserExerciseEntry = useCallback((entries: ExerciseBasedEntry[]) => {
    if (!user) return null;
    return entries.find(entry => isUserEntry(entry.user_name, entry.wing)) || null;
  }, [user, isUserEntry]);

  // Helper to find user's entry in LeaderboardEntry dataset
  const findUserLeaderboardEntry = useCallback((entries: LeaderboardEntry[]) => {
    if (!user) return null;
    return entries.find(entry => isUserEntry(entry.user_name, entry.wing)) || null;
  }, [user, isUserEntry]);

  // Helper to filter out user's entry from TotalRepsEntry data
  const filterOutUserTotalReps = useCallback((entries: TotalRepsEntry[]) => {
    if (!user) return entries;
    return entries.filter(entry => !isUserEntry(entry.user_name, entry.wing));
  }, [user, isUserEntry]);

  // Helper to filter out user's entry from ExerciseBasedEntry data
  const filterOutUserExercise = useCallback((entries: ExerciseBasedEntry[]) => {
    if (!user) return entries;
    return entries.filter(entry => !isUserEntry(entry.user_name, entry.wing));
  }, [user, isUserEntry]);

  // Helper to filter out user's entry from LeaderboardEntry data
  const filterOutUserLeaderboard = useCallback((entries: LeaderboardEntry[]) => {
    if (!user) return entries;
    return entries.filter(entry => !isUserEntry(entry.user_name, entry.wing));
  }, [user, isUserEntry]);

  // Pagination helpers for Exercise-Based View
  const exerciseDataWithoutUser = filterOutUserExercise(processedExerciseBasedData);
  const userExerciseEntry = findUserExerciseEntry(processedExerciseBasedData);
  const totalPagesExercise = Math.ceil(exerciseDataWithoutUser.length / itemsPerPage);
  const startIndexExercise = (currentPage - 1) * itemsPerPage;
  const endIndexExercise = startIndexExercise + itemsPerPage;
  const paginatedExerciseData = exerciseDataWithoutUser.slice(startIndexExercise, endIndexExercise);

  // Pagination helpers for Total Reps View
  const userTotalRepsEntry = findUserTotalRepsEntry(processedTotalRepsData);
  const totalPagesTotalReps = Math.ceil(processedTotalRepsData.length / itemsPerPageTotal);
  const startIndexTotalReps = (currentPage - 1) * itemsPerPageTotal;
  const endIndexTotalReps = startIndexTotalReps + itemsPerPageTotal;
  
  // Find user's entry index in the sorted data
  const userEntryIndex = userTotalRepsEntry 
    ? processedTotalRepsData.findIndex(e => isUserEntry(e.user_name, e.wing))
    : -1;
  
  // Pagination logic: user's entry appears at bottom when not in current page
  let paginatedTotalRepsData: TotalRepsEntry[];
  let isUserJustAfterPage = false;

  if (userEntryIndex >= 0) {
    if (userEntryIndex >= startIndexTotalReps && userEntryIndex < endIndexTotalReps) {
      // User is in current page - include normally
      // Rank 4 will be in its natural position and use CSS sticky positioning
      paginatedTotalRepsData = processedTotalRepsData.slice(startIndexTotalReps, endIndexTotalReps);
    } else if (userEntryIndex === endIndexTotalReps) {
      // User is just after current page - show them at bottom as sticky
      // Don't include in paginated data, they'll be shown separately at bottom
      paginatedTotalRepsData = processedTotalRepsData.slice(startIndexTotalReps, endIndexTotalReps);
      isUserJustAfterPage = true;
    } else {
      // User is far from current page - don't include, show at bottom
      paginatedTotalRepsData = processedTotalRepsData.slice(startIndexTotalReps, endIndexTotalReps);
    }
  } else {
    paginatedTotalRepsData = processedTotalRepsData.slice(startIndexTotalReps, endIndexTotalReps);
  }
  
  // Check if user's entry is in the current page
  const isUserInCurrentPage = userTotalRepsEntry && paginatedTotalRepsData.some(e => isUserEntry(e.user_name, e.wing));

  // Export to CSV functions for different tabs
  const exportTotalRepsToCSV = () => {
    const headers = ['Rank', 'Name', 'Wing', 'Total Reps', 'Status (%)'];
    const rows = processedTotalRepsData.map(entry => {
      const isUser = isUserEntry(entry.user_name, entry.wing);
      const isPlaceholder = entry.total_reps === 0 && isUser && entry.user_id === user?.id;
      const percentage = Math.min(Math.round((entry.total_reps / GOAL_REPS) * 100), 100);
      
      let status = '';
      if (isPlaceholder) {
        status = 'You haven\'t done any reps yet!';
      } else if (entry.achieved_goal) {
        status = `Goal Achieved (${percentage}%)`;
      } else {
        status = `${percentage}%`;
      }
      
      return [
        entry.rank,
        entry.user_name,
        entry.wing || '-',
        entry.total_reps,
        status
      ];
    });
    
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
    const rows = processedExerciseBasedData.map(entry => [
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
      const entries = processedAllData[exercise.name] || [];
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
    const entriesWithoutUser = filterOutUserLeaderboard(entries);
    return entriesWithoutUser.slice(startIndex, endIndex);
  };
  const getUserEntryForExercise = (entries: LeaderboardEntry[]) => {
    return findUserLeaderboardEntry(entries);
  };
  const getTotalPages = (entries: LeaderboardEntry[]) => {
    const entriesWithoutUser = filterOutUserLeaderboard(entries);
    return Math.ceil(entriesWithoutUser.length / itemsPerPage);
  };

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

      <div className="flex flex-row items-center justify-between border-b border-white/20 mb-6 gap-4">
        <div className="overflow-x-auto flex-1 min-w-0 custom-scrollbar">
          <div className="flex flex-nowrap sm:flex-wrap">
            <button
              onClick={() => setActiveTab('total')}
              className={`px-4 sm:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'total'
                  ? 'text-[#ff7301] border-b-2 border-[#ff7301]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              OCS 60 PT Challenge
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
              onClick={() => setActiveTab('exercise')}
              className={`px-4 sm:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'exercise'
                  ? 'text-[#ff7301] border-b-2 border-[#ff7301]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Exercise-Based View
            </button>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors flex-shrink-0"
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
          <div className="mb-4">
            <input
              type="text"
              value={totalRepsSearch}
              onChange={(e) => {
                setTotalRepsSearch(e.target.value);
                setCurrentPage(1); // Reset to first page when search changes
              }}
              placeholder="Search by name or wing..."
              className="w-full px-4 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white placeholder-white/50"
            />
          </div>
          {totalRepsData.length === 0 ? (
            <div className="py-8 text-center text-white/70">
              No scores yet. Be the first!
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {paginatedTotalRepsData.map((entry) => {
                  const isUser = isUserEntry(entry.user_name, entry.wing);
                  const isPlaceholder = entry.total_reps === 0 && isUser && entry.user_id === user?.id;
                  return (
                  <div
                    key={entry.user_id}
                    className={`rounded-lg p-4 ${
                      isUser 
                        ? `bg-gray-800 border border-[#ff7301] ${isUserInCurrentPage ? 'sticky top-0' : 'sticky bottom-0'} z-20` 
                        : entry.achieved_goal 
                          ? 'bg-green-900/30 border border-green-600/50' 
                          : 'border border-white/20 bg-black'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm ${getRankColorClass(entry.rank || 0)}`}>#{entry.rank}</span>
                          <button
                            onClick={() => setTimelineModal({ userId: entry.user_id, userName: entry.user_name, userWing: entry.wing })}
                            className={`font-medium hover:text-[#ff7301] transition-colors cursor-pointer ${
                              entry.achieved_goal ? 'text-green-400 font-bold' : 'text-white'
                            }`}
                          >
                            {entry.user_name}
                            {entry.achieved_goal && (
                              <span className="ml-2 text-green-400">✓</span>
                            )}
                          </button>
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
                      {isPlaceholder ? (
                        <span className="text-white/50 text-xs">
                          You haven't done any reps yet!
                        </span>
                      ) : entry.achieved_goal ? (
                        <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                          Goal Achieved
                        </span>
                      ) : (
                        <span className="text-white/60 text-xs">
                          {Math.min(Math.round((entry.total_reps / GOAL_REPS) * 100), 100)}%
                        </span>
                      )}
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/60 text-xs">Progress</span>
                        <span className="text-white/60 text-xs">
                          {Math.min(Math.round((entry.total_reps / GOAL_REPS) * 100), 100)}%
                        </span>
                      </div>
                      <div className="relative w-full bg-white/10 rounded-full h-2 overflow-visible">
                        {/* Milestone markers */}
                        <div className="absolute inset-0 flex items-center">
                          <div className="absolute left-[25%] w-px h-2 bg-white/30" />
                          <div className="absolute left-[50%] w-px h-2 bg-white/30" />
                          <div className="absolute left-[75%] w-px h-2 bg-white/30" />
                          <div className="absolute right-0 w-px h-2 bg-white/50" />
                        </div>
                        {/* Progress fill */}
                        <div
                          className={`h-full rounded-full transition-all relative z-10 ${
                            entry.achieved_goal 
                              ? 'bg-green-500' 
                              : 'bg-[#ff7301]'
                          }`}
                          style={{
                            width: `${Math.min((entry.total_reps / GOAL_REPS) * 100, 100)}%`
                          }}
                        />
                      </div>
                      {/* Milestone labels */}
                      <div className="flex justify-between mt-1">
                        <span className="text-white/40 text-[10px]">25%</span>
                        <span className="text-white/40 text-[10px]">50%</span>
                        <span className="text-white/40 text-[10px]">75%</span>
                        <span className="text-white/50 text-[10px] font-semibold">Goal</span>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 bg-black z-10">
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-4 font-semibold text-white">Rank</th>
                      <th className="text-left py-2 px-4 font-semibold text-white">Name</th>
                      <th className="text-left py-2 px-4 font-semibold text-white">Wing</th>
                      <th className="text-right py-2 px-4 font-semibold text-white">Total Reps</th>
                      <th className="text-center py-2 px-4 font-semibold text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTotalRepsData.map((entry, index) => {
                      const isUser = isUserEntry(entry.user_name, entry.wing);
                      const isPlaceholder = entry.total_reps === 0 && isUser && entry.user_id === user?.id;
                      // On page 1, rank 4 should stick to bottom when viewing ranks 1-3, and be in natural position when viewing ranks 3-5
                      const isRank4OnPage1 = isUser && entry.rank === 4 && currentPage === 1;
                      const stickyClass = isUser 
                        ? (isRank4OnPage1 
                            ? 'sticky bottom-[79px]' 
                            : (isUserInCurrentPage ? 'sticky top-[40px]' : 'sticky bottom-[79px]'))
                        : '';
                      return (
                      <React.Fragment key={entry.user_id}>
                        <tr
                          className={`${
                            isUser 
                              ? `bg-gray-800 [&>td:first-child]:border-t [&>td:first-child]:border-l [&>td:first-child]:border-[#ff7301] [&>td]:border-t [&>td]:border-[#ff7301] [&>td:last-child]:border-r [&>td:last-child]:border-[#ff7301] ${stickyClass} z-20` 
                              : entry.achieved_goal 
                                ? 'bg-green-900/30 border-b border-white/10' 
                                : 'border-b border-white/10 hover:bg-white/5'
                          }`}
                        >
                          <td className={`py-3 px-4 font-medium ${getRankColorClass(entry.rank || 0)}`}>
                            #{entry.rank}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setTimelineModal({ userId: entry.user_id, userName: entry.user_name, userWing: entry.wing })}
                              className={`font-medium hover:text-[#ff7301] transition-colors cursor-pointer ${
                                entry.achieved_goal ? 'text-green-400 font-bold' : 'text-white'
                              }`}
                            >
                              {entry.user_name}
                              {entry.achieved_goal && (
                                <span className="ml-2 text-green-400">✓</span>
                              )}
                            </button>
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
                            {isPlaceholder ? (
                              <span className="text-white/50 text-sm">
                                You haven't done any reps yet!
                              </span>
                            ) : entry.achieved_goal ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                                  Goal Achieved
                                </span>
                                <span className="text-white/60 text-xs">
                                  {Math.min(Math.round((entry.total_reps / GOAL_REPS) * 100), 100)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-white/60 text-sm">
                                {Math.min(Math.round((entry.total_reps / GOAL_REPS) * 100), 100)}%
                              </span>
                            )}
                          </td>
                        </tr>
                        {/* Progress Bar Row */}
                        <tr
                          className={`${
                            isUser 
                              ? `bg-gray-800 [&>td]:border-l [&>td]:border-r [&>td]:border-b [&>td]:border-[#ff7301] ${isRank4OnPage1 ? 'sticky bottom-0' : (isUserInCurrentPage ? 'sticky top-[79px]' : 'sticky bottom-0')} z-20` 
                              : entry.achieved_goal 
                                ? 'bg-green-900/30 border-b border-white/10' 
                                : 'border-b border-white/10'
                          }`}
                        >
                          <td colSpan={5} className="py-3 px-4">
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white/60 text-xs">Progress</span>
                                <span className="text-white/60 text-xs">
                                  {Math.min(Math.round((entry.total_reps / GOAL_REPS) * 100), 100)}%
                                </span>
                              </div>
                              <div className="relative w-full bg-white/10 rounded-full h-2 overflow-visible">
                                {/* Milestone markers */}
                                <div className="absolute inset-0 flex items-center">
                                  <div className="absolute left-[25%] w-px h-2 bg-white/30" />
                                  <div className="absolute left-[50%] w-px h-2 bg-white/30" />
                                  <div className="absolute left-[75%] w-px h-2 bg-white/30" />
                                  <div className="absolute right-0 w-px h-2 bg-white/50" />
                                </div>
                                {/* Progress fill */}
                                <div
                                  className={`h-full rounded-full transition-all relative z-10 ${
                                    entry.achieved_goal 
                                      ? 'bg-green-500' 
                                      : 'bg-[#ff7301]'
                                  }`}
                                  style={{
                                    width: `${Math.min((entry.total_reps / GOAL_REPS) * 100, 100)}%`
                                  }}
                                />
                              </div>
                              {/* Milestone labels */}
                              <div className="flex justify-between mt-1">
                                <span className="text-white/40 text-[10px]">25%</span>
                                <span className="text-white/40 text-[10px]">50%</span>
                                <span className="text-white/40 text-[10px]">75%</span>
                                <span className="text-white/50 text-[10px] font-semibold">Goal</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                      );
                    })}
                    {/* Always show user's entry at bottom if it exists and is not in current page */}
                    {userTotalRepsEntry && (!isUserInCurrentPage || isUserJustAfterPage) && userEntryIndex !== -1 && (
                      <>
                        <tr className="bg-gray-800 [&>td:first-child]:border-t [&>td:first-child]:border-l [&>td:first-child]:border-[#ff7301] [&>td]:border-t [&>td]:border-[#ff7301] [&>td:last-child]:border-r [&>td:last-child]:border-[#ff7301] sticky bottom-[79px] z-20">
                          <td className={`py-3 px-4 font-medium ${getRankColorClass(userTotalRepsEntry.rank || 0)}`}>
                            #{userTotalRepsEntry.rank}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setTimelineModal({ userId: userTotalRepsEntry.user_id, userName: userTotalRepsEntry.user_name, userWing: userTotalRepsEntry.wing })}
                              className={`font-medium hover:text-[#ff7301] transition-colors cursor-pointer ${
                                userTotalRepsEntry.achieved_goal ? 'text-green-400 font-bold' : 'text-white'
                              }`}
                            >
                              {userTotalRepsEntry.user_name}
                              {userTotalRepsEntry.achieved_goal && (
                                <span className="ml-2 text-green-400">✓</span>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-white/80">
                            {userTotalRepsEntry.wing || '-'}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${
                            userTotalRepsEntry.achieved_goal ? 'text-green-400' : 'text-[#ff7301]'
                          }`}>
                            {userTotalRepsEntry.total_reps.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {userTotalRepsEntry.total_reps === 0 ? (
                              <span className="text-white/50 text-sm">
                                You haven't done any reps yet!
                              </span>
                            ) : userTotalRepsEntry.achieved_goal ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                                  Goal Achieved
                                </span>
                                <span className="text-white/60 text-xs">
                                  {Math.min(Math.round((userTotalRepsEntry.total_reps / GOAL_REPS) * 100), 100)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-white/60 text-sm">
                                {Math.min(Math.round((userTotalRepsEntry.total_reps / GOAL_REPS) * 100), 100)}%
                              </span>
                            )}
                          </td>
                        </tr>
                        <tr className="bg-gray-800 [&>td]:border-l [&>td]:border-r [&>td]:border-b [&>td]:border-[#ff7301] sticky bottom-0 z-20">
                          <td colSpan={5} className="py-3 px-4">
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white/60 text-xs">Progress</span>
                                <span className="text-white/60 text-xs">
                                  {Math.min(Math.round((userTotalRepsEntry.total_reps / GOAL_REPS) * 100), 100)}%
                                </span>
                              </div>
                              <div className="relative w-full bg-white/10 rounded-full h-2 overflow-visible">
                                <div className="absolute inset-0 flex items-center">
                                  <div className="absolute left-[25%] w-px h-2 bg-white/30" />
                                  <div className="absolute left-[50%] w-px h-2 bg-white/30" />
                                  <div className="absolute left-[75%] w-px h-2 bg-white/30" />
                                  <div className="absolute right-0 w-px h-2 bg-white/50" />
                                </div>
                                <div
                                  className={`h-full rounded-full transition-all relative z-10 ${
                                    userTotalRepsEntry.achieved_goal 
                                      ? 'bg-green-500' 
                                      : 'bg-[#ff7301]'
                                  }`}
                                  style={{
                                    width: `${Math.min((userTotalRepsEntry.total_reps / GOAL_REPS) * 100, 100)}%`
                                  }}
                                />
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-white/40 text-[10px]">25%</span>
                                <span className="text-white/40 text-[10px]">50%</span>
                                <span className="text-white/40 text-[10px]">75%</span>
                                <span className="text-white/50 text-[10px] font-semibold">Goal</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Mobile: Always show user's entry at bottom if it exists and is not in current page */}
              {userTotalRepsEntry && (!isUserInCurrentPage || isUserJustAfterPage) && userEntryIndex !== -1 && (
                <div className="block sm:hidden sticky bottom-0 z-20 mt-3">
                  <div className="rounded-lg p-4 bg-gray-800 border border-[#ff7301]">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm ${getRankColorClass(userTotalRepsEntry.rank || 0)}`}>#{userTotalRepsEntry.rank}</span>
                          <button
                            onClick={() => setTimelineModal({ userId: userTotalRepsEntry.user_id, userName: userTotalRepsEntry.user_name, userWing: userTotalRepsEntry.wing })}
                            className={`font-medium hover:text-[#ff7301] transition-colors cursor-pointer ${
                              userTotalRepsEntry.achieved_goal ? 'text-green-400 font-bold' : 'text-white'
                            }`}
                          >
                            {userTotalRepsEntry.user_name}
                            {userTotalRepsEntry.achieved_goal && (
                              <span className="ml-2 text-green-400">✓</span>
                            )}
                          </button>
                        </div>
                        <div className="text-white/80 text-sm">
                          {userTotalRepsEntry.wing || '-'}
                        </div>
                      </div>
                      <div className={`text-right font-semibold text-lg ${
                        userTotalRepsEntry.achieved_goal ? 'text-green-400' : 'text-[#ff7301]'
                      }`}>
                        {userTotalRepsEntry.total_reps.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      {userTotalRepsEntry.total_reps === 0 ? (
                        <span className="text-white/50 text-xs">
                          You haven't done any reps yet!
                        </span>
                      ) : userTotalRepsEntry.achieved_goal ? (
                        <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                          Goal Achieved
                        </span>
                      ) : (
                        <span className="text-white/60 text-xs">
                          {Math.min(Math.round((userTotalRepsEntry.total_reps / GOAL_REPS) * 100), 100)}%
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/60 text-xs">Progress</span>
                        <span className="text-white/60 text-xs">
                          {Math.min(Math.round((userTotalRepsEntry.total_reps / GOAL_REPS) * 100), 100)}%
                        </span>
                      </div>
                      <div className="relative w-full bg-white/10 rounded-full h-2 overflow-visible">
                        <div className="absolute inset-0 flex items-center">
                          <div className="absolute left-[25%] w-px h-2 bg-white/30" />
                          <div className="absolute left-[50%] w-px h-2 bg-white/30" />
                          <div className="absolute left-[75%] w-px h-2 bg-white/30" />
                          <div className="absolute right-0 w-px h-2 bg-white/50" />
                        </div>
                        <div
                          className={`h-full rounded-full transition-all relative z-10 ${
                            userTotalRepsEntry.achieved_goal 
                              ? 'bg-green-500' 
                              : 'bg-[#ff7301]'
                          }`}
                          style={{
                            width: `${Math.min((userTotalRepsEntry.total_reps / GOAL_REPS) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-white/40 text-[10px]">25%</span>
                        <span className="text-white/40 text-[10px]">50%</span>
                        <span className="text-white/40 text-[10px]">75%</span>
                        <span className="text-white/50 text-[10px] font-semibold">Goal</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {processedTotalRepsData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4 pt-4 border-t border-white/20">
              <div className="text-white/70 text-sm">
                Showing {startIndexTotalReps + 1} to {Math.min(endIndexTotalReps, processedTotalRepsData.length)} of {processedTotalRepsData.length} entries
              </div>
              {totalPagesTotalReps > 1 && (
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
              )}
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
              <div className="block sm:hidden space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {paginatedExerciseData.map((entry) => {
                  const isUser = isUserEntry(entry.user_name, entry.wing);
                  const isPlaceholder = entry.exercise_id === -1;
                  return (
                  <div
                    key={entry.exercise_id}
                    className={`rounded-lg p-4 transition-colors flex flex-col ${
                      isUser 
                        ? 'bg-gray-800 border border-[#ff7301] sticky bottom-0 z-20' 
                        : 'border border-white/20 bg-black hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <ExerciseIcon exerciseName={entry.exercise_name} className="w-5 h-5 text-[#ff7301]" />
                          <span className="text-white font-medium text-sm">
                            {entry.exercise_name}
                          </span>
                        </div>
                        <button
                          onClick={() => setTimelineModal({ userId: entry.user_id, userName: entry.user_name, userWing: entry.wing })}
                          className="text-white text-sm mb-1 hover:text-[#ff7301] transition-colors cursor-pointer text-left"
                        >
                          {getDisplayName(entry)}
                        </button>
                      </div>
                      <div className="text-[#ff7301] text-right font-semibold text-lg">
                        {entry.value}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-white/80 text-xs mt-auto">
                      <span>{entry.wing || '-'}</span>
                      <span className="text-white/70 text-right">
                        {isPlaceholder ? "You haven't done any reps yet!" : formatDate(entry.created_at)}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-black z-10">
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-4 font-semibold text-white">Exercise</th>
                      <th className="text-left py-2 px-4 font-semibold text-white">Name</th>
                      <th className="text-left py-2 px-4 font-semibold text-white">Wing</th>
                      <th className="text-right py-2 px-4 font-semibold text-white">Reps</th>
                      <th className="text-right py-2 px-4 font-semibold text-white">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExerciseData.map((entry) => {
                      const isUser = isUserEntry(entry.user_name, entry.wing);
                      const isPlaceholder = entry.exercise_id === -1;
                      return (
                      <tr
                        key={entry.exercise_id}
                        className={`border-b ${
                          isUser 
                            ? 'bg-gray-800 border-[#ff7301] sticky bottom-0 z-20' 
                            : 'border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <td className="py-3 px-4 text-white font-medium">
                          <div className="flex items-center gap-2">
                            <ExerciseIcon exerciseName={entry.exercise_name} className="w-5 h-5 text-[#ff7301]" />
                            {entry.exercise_name}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setTimelineModal({ userId: entry.user_id, userName: entry.user_name, userWing: entry.wing })}
                            className="text-white hover:text-[#ff7301] transition-colors cursor-pointer"
                          >
                            {getDisplayName(entry)}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-white/80">
                          {entry.wing || '-'}
                        </td>
                        <td className="py-3 px-4 text-[#ff7301] text-right font-semibold">
                          {entry.value}
                        </td>
                        <td className="py-3 px-4 text-white/70 text-right text-sm">
                          {isPlaceholder ? "You haven't done any reps yet!" : formatDate(entry.created_at)}
                        </td>
                      </tr>
                      );
                    })}
                    {/* Always show user's entry at bottom if it exists and is not in current page */}
                    {userExerciseEntry && !paginatedExerciseData.some(e => isUserEntry(e.user_name, e.wing)) && (
                      <tr className="bg-gray-800 border-[#ff7301] sticky bottom-0 z-20">
                        <td className="py-3 px-4 text-white font-medium">
                          <div className="flex items-center gap-2">
                            <ExerciseIcon exerciseName={userExerciseEntry.exercise_name} className="w-5 h-5 text-[#ff7301]" />
                            {userExerciseEntry.exercise_name}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setTimelineModal({ userId: userExerciseEntry.user_id, userName: userExerciseEntry.user_name, userWing: userExerciseEntry.wing })}
                            className="text-white hover:text-[#ff7301] transition-colors cursor-pointer"
                          >
                            {getDisplayName(userExerciseEntry)}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-white/80">
                          {userExerciseEntry.wing || '-'}
                        </td>
                        <td className="py-3 px-4 text-[#ff7301] text-right font-semibold">
                          {userExerciseEntry.value}
                        </td>
                        <td className="py-3 px-4 text-white/70 text-right text-sm">
                          {userExerciseEntry.exercise_id === -1 ? "You haven't done any reps yet!" : formatDate(userExerciseEntry.created_at)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Mobile: Always show user's entry at bottom if it exists and is not in current page */}
              {userExerciseEntry && !paginatedExerciseData.some(e => isUserEntry(e.user_name, e.wing)) && (
                <div className="block sm:hidden sticky bottom-0 z-20 mt-3">
                  <div className="rounded-lg p-4 bg-gray-800 border border-[#ff7301] transition-colors flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <ExerciseIcon exerciseName={userExerciseEntry.exercise_name} className="w-5 h-5 text-[#ff7301]" />
                          <span className="text-white font-medium text-sm">
                            {userExerciseEntry.exercise_name}
                          </span>
                        </div>
                        <button
                          onClick={() => setTimelineModal({ userId: userExerciseEntry.user_id, userName: userExerciseEntry.user_name, userWing: userExerciseEntry.wing })}
                          className="text-white text-sm mb-1 hover:text-[#ff7301] transition-colors cursor-pointer text-left"
                        >
                          {getDisplayName(userExerciseEntry)}
                        </button>
                      </div>
                      <div className="text-[#ff7301] text-right font-semibold text-lg">
                        {userExerciseEntry.value}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-white/80 text-xs mt-auto">
                      <span>{userExerciseEntry.wing || '-'}</span>
                      <span className="text-white/70 text-right">
                        {userExerciseEntry.exercise_id === -1 ? "You haven't done any reps yet!" : formatDate(userExerciseEntry.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {totalPagesExercise > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4 pt-4 border-t border-white/20">
              <div className="text-white/70 text-sm">
                Showing {startIndexExercise + 1} to {Math.min(endIndexExercise, exerciseDataWithoutUser.length)} of {exerciseDataWithoutUser.length} entries
                {userExerciseEntry && <span className="text-white/50"> (+ your entry)</span>}
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
              const entries = processedAllData[exercise.name] || [];
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
                      <div className="block sm:hidden space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {paginatedEntries.map((entry, index) => {
                          const isUser = isUserEntry(entry.user_name, entry.wing);
                          const isPlaceholder = entry.id === -1;
                          return (
                          <div
                            key={entry.id}
                            className={`rounded-lg p-4 transition-colors flex flex-col ${
                              isUser 
                                ? 'bg-gray-800 border border-[#ff7301] sticky bottom-0 z-20' 
                                : 'border border-white/20 bg-black hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs ${getRankColorClass(startIndex + index + 1)}`}>#{startIndex + index + 1}</span>
                                  <button
                                    onClick={() => setTimelineModal({ userId: entry.user_id, userName: entry.user_name, userWing: entry.wing })}
                                    className="text-white text-sm font-medium hover:text-[#ff7301] transition-colors cursor-pointer"
                                  >
                                    {getDisplayName(entry)}
                                  </button>
                                </div>
                              </div>
                              <div className="text-[#ff7301] text-right font-semibold text-lg">
                                {entry.value}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-white/80 text-xs mt-auto">
                              <span>{entry.wing || '-'}</span>
                              <span className="text-white/70 text-right">
                                {isPlaceholder ? "You haven't done any reps yet!" : formatDate(entry.created_at)}
                              </span>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-black z-10">
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
                            {paginatedEntries.map((entry, index) => {
                              const isUser = isUserEntry(entry.user_name, entry.wing);
                              const isPlaceholder = entry.id === -1;
                              return (
                              <tr
                                key={entry.id}
                                className={`border-b ${
                                  isUser 
                                    ? 'bg-gray-800 border-[#ff7301] sticky bottom-0 z-20' 
                                    : 'border-white/10 hover:bg-white/5'
                                }`}
                              >
                                <td className={`py-3 px-4 font-medium ${getRankColorClass(startIndex + index + 1)}`}>
                                  #{startIndex + index + 1}
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => setTimelineModal({ userId: entry.user_id, userName: entry.user_name, userWing: entry.wing })}
                                    className="text-white hover:text-[#ff7301] transition-colors cursor-pointer"
                                  >
                                    {getDisplayName(entry)}
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-white/80">
                                  {entry.wing || '-'}
                                </td>
                                <td className="py-3 px-4 text-[#ff7301] text-right font-semibold">
                                  {entry.value}
                                </td>
                                <td className="py-3 px-4 text-white/70 text-right text-sm">
                                  {isPlaceholder ? "You haven't done any reps yet!" : formatDate(entry.created_at)}
                                </td>
                              </tr>
                              );
                            })}
                            {/* Always show user's entry at bottom if it exists and is not in current page */}
                            {(() => {
                              const userEntry = getUserEntryForExercise(entries);
                              return userEntry && !paginatedEntries.some(e => isUserEntry(e.user_name, e.wing)) ? (
                                <tr className="bg-gray-800 border-[#ff7301] sticky bottom-0 z-20">
                                  <td className={`py-3 px-4 font-medium ${getRankColorClass(startIndex + paginatedEntries.length + 1)}`}>
                                    #{startIndex + paginatedEntries.length + 1}
                                  </td>
                                  <td className="py-3 px-4">
                                    <button
                                      onClick={() => setTimelineModal({ userId: userEntry.user_id, userName: userEntry.user_name, userWing: userEntry.wing })}
                                      className="text-white hover:text-[#ff7301] transition-colors cursor-pointer"
                                    >
                                      {getDisplayName(userEntry)}
                                    </button>
                                  </td>
                                  <td className="py-3 px-4 text-white/80">
                                    {userEntry.wing || '-'}
                                  </td>
                                  <td className="py-3 px-4 text-[#ff7301] text-right font-semibold">
                                    {userEntry.value}
                                  </td>
                                  <td className="py-3 px-4 text-white/70 text-right text-sm">
                                    {userEntry.id === -1 ? "You haven't done any reps yet!" : formatDate(userEntry.created_at)}
                                  </td>
                                </tr>
                              ) : null;
                            })()}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile: Always show user's entry at bottom if it exists and is not in current page */}
                      {(() => {
                        const userEntry = getUserEntryForExercise(entries);
                        return userEntry && !paginatedEntries.some(e => isUserEntry(e.user_name, e.wing)) ? (
                          <div className="block sm:hidden sticky bottom-0 z-20 mt-3">
                            <div className="rounded-lg p-4 bg-gray-800 border border-[#ff7301] transition-colors flex flex-col">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs ${getRankColorClass(startIndex + paginatedEntries.length + 1)}`}>#{startIndex + paginatedEntries.length + 1}</span>
                                    <button
                                      onClick={() => setTimelineModal({ userId: userEntry.user_id, userName: userEntry.user_name, userWing: userEntry.wing })}
                                      className="text-white text-sm font-medium hover:text-[#ff7301] transition-colors cursor-pointer"
                                    >
                                      {getDisplayName(userEntry)}
                                    </button>
                                  </div>
                                </div>
                                <div className="text-[#ff7301] text-right font-semibold text-lg">
                                  {userEntry.value}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-white/80 text-xs mt-auto">
                                <span>{userEntry.wing || '-'}</span>
                                <span className="text-white/70 text-right">
                                  {userEntry.id === -1 ? "You haven't done any reps yet!" : formatDate(userEntry.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}
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

      {/* User Score Timeline Modal */}
      {timelineModal && (
        <UserScoreTimelineModal
          isOpen={timelineModal !== null}
          userId={timelineModal.userId}
          userName={timelineModal.userName}
          userWing={timelineModal.userWing}
          onClose={() => setTimelineModal(null)}
        />
      )}
    </div>
  );
}
