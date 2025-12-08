'use client';

interface RegistrationConfirmationModalProps {
  name: string;
  wing: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RegistrationConfirmationModal({
  name,
  wing,
  onConfirm,
  onCancel,
}: RegistrationConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/20 rounded-lg shadow-md max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">⚠️ Account Registration Confirmation</h2>
            <button
              onClick={onCancel}
              className="text-white/70 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-white/90 mb-4">
              You are about to register an account with:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-md p-4 mb-4">
              <p className="text-white font-semibold">Name: <span className="text-[#ff7301]">{name}</span></p>
              <p className="text-white font-semibold">Wing: <span className="text-[#ff7301]">{wing}</span></p>
            </div>
            <div className="bg-red-900/30 border border-red-700/50 rounded-md p-4">
              <p className="text-red-200 text-sm font-semibold mb-2">⚠️ WARNING</p>
              <p className="text-white/90 text-sm">
                Registering someone else's account or impersonating another person will result in disciplinary actions.
              </p>
            </div>
            <p className="text-white/70 text-sm mt-4">
              Please confirm that this is <strong>YOUR</strong> account and you have the right to register it.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-white/10 text-white py-2 px-4 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 bg-[#ff7301] text-white py-2 px-4 rounded-md hover:bg-[#ff7301]/90 focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:ring-offset-2 focus:ring-offset-black transition-colors"
            >
              Yes, This is My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

