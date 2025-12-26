'use client';

interface EditUserModalProps {
  isOpen: boolean;
  userName: string;
  userWing: string | null;
  adminLevel: 'OCS' | 'WING' | null;
  adminWing: string | null;
  formData: {
    name: string;
    wing: string;
    password: string;
  };
  onFormChange: (data: { name: string; wing: string; password: string }) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function EditUserModal({
  isOpen,
  userName,
  userWing,
  adminLevel,
  adminWing,
  formData,
  onFormChange,
  onConfirm,
  onCancel,
  loading = false,
}: EditUserModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Edit User</h3>
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
        </div>
      </div>
    </div>
  );
}

