'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuth } from './components/AuthContext';
import AuthForm from './components/AuthForm';
import ExerciseScoresForm from './components/ExerciseScoresForm';
import Leaderboard from './components/Leaderboard';
import UserAccountModal from './components/UserAccountModal';

interface Exercise {
  id: number;
  name: string;
  type: string;
}

export default function Home() {
  const { user, loading, logout, token } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [wings, setWings] = useState<string[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchExercises();
      fetchWings();
    }
  }, [user]);

  const fetchExercises = async () => {
    const loadingToast = toast.loading('Loading exercises...');
    try {
      const response = await fetch('/api/exercises');
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
        toast.dismiss(loadingToast);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch exercises' }));
        toast.dismiss(loadingToast);
        toast.error(errorData.error || 'Failed to fetch exercises');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error fetching exercises:', error);
      toast.error('Network error: Unable to fetch exercises. Please check your connection.');
    }
  };

  const fetchWings = async () => {
    try {
      const response = await fetch('/api/wings');
      if (response.ok) {
        const data = await response.json();
        setWings(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch wings' }));
        toast.error(errorData.error || 'Failed to fetch wings');
      }
    } catch (error) {
      console.error('Error fetching wings:', error);
      toast.error('Network error: Unable to fetch wings. Please check your connection.');
    }
  };

  const handleScoreSubmitted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center">
            <p className="text-white">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Image
              src="/ocs_safti_gold.jpg"
              alt="OCS SAFTI Gold"
              width={80}
              height={80}
              className="object-contain"
            />
            <h1 className="text-2xl sm:text-4xl font-bold text-white text-center sm:text-left">
              Exercise Leaderboard
            </h1>
          </div>
          <AuthForm />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-2xl sm:text-4xl font-bold text-white">
              Exercise Leaderboard
            </h1>
          </div>
          <div className="flex flex-row items-center gap-3 sm:gap-4">
            <span className="text-white/70 text-sm sm:text-base">
              {user.name} {user.wing && `(${user.wing})`}
            </span>
            <button
              onClick={() => setShowAccountModal(true)}
              className="p-2 bg-black rounded-md hover:bg-[#ff7301]/20 hover:border-[#ff7301]/80 transition-colors"
              title="Account Management"
            >
              <Image
                src="/account_manage.png"
                alt="Account Management"
                width={50}
                height={50}
                className="w-8 h-8 sm:w-[50px] sm:h-[50px]"
              />
            </button>
          </div>
        </div>
        <Leaderboard key={refreshKey} exercises={exercises} wings={wings} />
        <ExerciseScoresForm
          exercises={exercises}
          onScoreSubmitted={handleScoreSubmitted}
        />
      </div>
      <UserAccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </main>
  );
}
