'use client';

interface DeleteExerciseModalProps {
  isOpen: boolean;
  exerciseName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DeleteExerciseModal({
  isOpen,
  exerciseName,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteExerciseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Delete Exercise</h3>
          <p className="text-white/70 mb-2">
            Are you sure you want to delete <span className="font-semibold text-white">{exerciseName}</span>?
          </p>
          <p className="text-white/50 text-sm mb-6">
            This will permanently delete the exercise and all associated scores. This action cannot be undone.
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



