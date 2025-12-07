'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import WingSelection from './components/WingSelection';
import NameSelectionByWing from './components/NameSelectionByWing';
import ExerciseScoresForm from './components/ExerciseScoresForm';
import Leaderboard from './components/Leaderboard';

interface Exercise {
  id: number;
  name: string;
  type: string;
}

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [wings, setWings] = useState<string[]>([]);
  const [selectedWing, setSelectedWing] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    fetchExercises();
    fetchWings();
  }, []);

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
    // Reset to wing selection after successful submission
    setSelectedWing(null);
    setSelectedName(null);
  };

  const handleWingSelected = (wing: string) => {
    setSelectedWing(wing);
  };

  const handleNameSelected = (name: string) => {
    setSelectedName(name);
  };

  const handleBackFromName = () => {
    setSelectedName(null);
  };

  const handleBackFromWing = () => {
    setSelectedWing(null);
  };

  return (
    <main className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-4 mb-8">
          <Image
            src="/ocs_safti_gold.jpg"
            alt="OCS SAFTI Gold"
            width={80}
            height={80}
            className="object-contain"
          />
          <h1 className="text-4xl font-bold text-white">
            Exercise Leaderboard
          </h1>
        </div>
        <Leaderboard key={refreshKey} exercises={exercises} wings={wings} />
        {selectedWing && selectedName ? (
          <ExerciseScoresForm
            name={selectedName}
            wing={selectedWing}
            exercises={exercises}
            onScoreSubmitted={handleScoreSubmitted}
            onBack={handleBackFromName}
          />
        ) : selectedWing ? (
          <NameSelectionByWing
            wing={selectedWing}
            onNameSelected={handleNameSelected}
            onBack={handleBackFromWing}
          />
        ) : (
          <WingSelection onWingSelected={handleWingSelected} />
        )}
      </div>
    </main>
  );
}

