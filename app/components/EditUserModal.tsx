'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DeleteScoreModal from './DeleteScoreModal';

interface EditUserModalProps {
  isOpen: boolean;
  userId: number;
  userName: string;
  userWing: string | null;
  adminLevel: 'OCS' | 'WING' | null;
  adminWing: string | null;
  adminToken: string | null;
  formData: {
    name: string;
    wing: string;
    password: string;
  };
  onFormChange: (data: { name: string; wing: string; password: string }) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onScoreDeleted?: () => void;
  loading?: boolean;
}

interface Score {
  id: number;
  value: number;
  createdAt: string;
  exerciseName: string;
  userName: string;
  userWing: string | null;
  userId: number;
}

export default function EditUserModal({
  isOpen,
  userId,
  userName,
  userWing,
  adminLevel,
  adminWing,
  adminToken,
  formData,
  onFormChange,
  onConfirm,
  onCancel,
  onScoreDeleted,
  loading = false,
}: EditUserModalProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'scores'>('edit');
  const [scores, setScores] = useState<Score[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState<{ id: number; userName: string; exerciseName: string; value: number } | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'scores' && userId && adminToken) {
      fetchScores();
    }
  }, [isOpen, activeTab, userId, adminToken]);

  const fetchScores = async () => {
    if (!adminToken) return;
    setScoresLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${adminToken}` };
      const response = await fetch(`/api/admin/scores?userId=${userId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.scores) {
          setScores(data.scores);
        }
      }
    } catch (error) {
      console.error('Error fetching scores:', error);
    } finally {
      setScoresLoading(false);
    }
  };

  const handleDeleteScoreClick = (score: Score) => {
    setScoreToDelete({
      id: score.id,
      userName: score.userName,
      exerciseName: score.exerciseName,
      value: score.value,
    });
  };

  const handleDeleteScoreConfirm = async () => {
    if (!adminToken || !scoreToDelete) return;
    setScoresLoading(true);
    try {
      const response = await fetch('/api/admin/scores', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ scoreId: scoreToDelete.id }),
      });

      if (response.ok) {
        toast.success('Score deleted successfully');
        setScoreToDelete(null);
        fetchScores();
        if (onScoreDeleted) {
          onScoreDeleted();
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete score');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setScoresLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Edit User: {userName}</h3>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/20">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === 'edit'
                    ? 'text-[#ff7301] border-b-2 border-[#ff7301]'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                User Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scores')}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === 'scores'
                    ? 'text-[#ff7301] border-b-2 border-[#ff7301]'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Score Management
              </button>
            </div>

            {activeTab === 'edit' && (
              <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                required
              />
            </div>
            {adminLevel === 'OCS' && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">Wing</label>
                <input
                  type="text"
                  value={formData.wing}
                  onChange={(e) => onFormChange({ ...formData, wing: e.target.value })}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                />
              </div>
            )}
            {adminLevel === 'WING' && adminWing && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">Wing</label>
                <input
                  type="text"
                  value={adminWing}
                  disabled
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white opacity-50 cursor-not-allowed"
                />
                <p className="text-white/50 text-xs mt-1">Wing cannot be changed</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-white mb-1">New Password (leave empty to keep current)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => onFormChange({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
              />
            </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'scores' && (
              <div className="space-y-4">
                {scoresLoading ? (
                  <p className="text-white/70">Loading scores...</p>
                ) : scores.length === 0 ? (
                  <p className="text-white/70">No scores found for this user.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {scores.map((score) => (
                      <div key={score.id} className="border border-white/20 rounded-md p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">{score.exerciseName}: {score.value}</p>
                          <p className="text-white/50 text-xs">{new Date(score.createdAt).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteScoreClick(score)}
                          disabled={scoresLoading}
                          className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 justify-end mt-6">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Score Confirmation Modal */}
      <DeleteScoreModal
        isOpen={scoreToDelete !== null}
        userName={scoreToDelete?.userName || ''}
        exerciseName={scoreToDelete?.exerciseName || ''}
        value={scoreToDelete?.value || 0}
        onConfirm={handleDeleteScoreConfirm}
        onCancel={() => setScoreToDelete(null)}
        loading={scoresLoading}
      />
    </>
  );
}

