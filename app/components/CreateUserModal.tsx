'use client';

interface CreateUserModalProps {
  isOpen: boolean;
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

export default function CreateUserModal({
  isOpen,
  adminLevel,
  adminWing,
  formData,
  onFormChange,
  onConfirm,
  onCancel,
  loading = false,
}: CreateUserModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-white">Create User</h3>
            <button
              onClick={onCancel}
              className="text-white/70 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormChange({ ...formData, name: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white uppercase"
                style={{ textTransform: 'uppercase' }}
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
                <p className="text-white/50 text-xs mt-1">Wing is automatically set based on your login</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-white mb-1">Password (optional)</label>
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
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

