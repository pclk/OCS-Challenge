'use client';

interface DeleteUserModalProps {
  isOpen: boolean;
  userName: string;
  userWing: string | null;
  onConfirm: (deletionType: 'reset' | 'ban') => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DeleteUserModal({
  isOpen,
  userName,
  userWing,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Delete User</h3>
          <p className="text-white/70 mb-4">
            Choose an action for <span className="font-semibold text-white">{userName}</span>?
            {userWing && <span className="text-white/70"> ({userWing})</span>}
          </p>
          
          <div className="mb-6 space-y-3">
            <div className="border border-white/20 rounded-lg p-4 bg-white/5">
              <h4 className="text-white font-semibold mb-2">Reset</h4>
              <p className="text-white/60 text-sm mb-3">
                Removes the password and all scores. The account remains and can still be selected when logging in or registering.
              </p>
              <button
                onClick={() => onConfirm('reset')}
                disabled={loading}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : 'Reset Account'}
              </button>
            </div>
            
            <div className="border border-white/20 rounded-lg p-4 bg-white/5">
              <h4 className="text-white font-semibold mb-2">Ban</h4>
              <p className="text-white/60 text-sm mb-3">
                Permanently deletes the entire account. The user will no longer be selectable when logging in or registering. This action cannot be undone.
              </p>
              <button
                onClick={() => onConfirm('ban')}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : 'Ban Account'}
              </button>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

