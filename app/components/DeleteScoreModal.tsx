'use client';

interface DeleteScoreModalProps {
  isOpen: boolean;
  userName: string;
  exerciseName: string;
  value: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DeleteScoreModal({
  isOpen,
  userName,
  exerciseName,
  value,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteScoreModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Delete Score</h3>
          <p className="text-white/70 mb-2">
            Are you sure you want to delete this score?
          </p>
          <div className="bg-white/5 rounded-md p-3 mb-4">
            <p className="text-white"><span className="font-semibold">User:</span> {userName}</p>
            <p className="text-white"><span className="font-semibold">Exercise:</span> {exerciseName}</p>
            <p className="text-white"><span className="font-semibold">Value:</span> {value}</p>
          </div>
          <p className="text-white/50 text-sm mb-6">
            This will permanently delete this score. This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



