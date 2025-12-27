'use client';

interface ReportTypesHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportTypesHelpModal({ isOpen, onClose }: ReportTypesHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-white">Report Types</h3>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 text-white/90">
            <div className="bg-blue-600/20 border border-blue-600/50 rounded p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-semibold text-lg">NEW_ACCOUNT_REQUEST</span>
              </div>
              <p className="text-white/80 text-sm mt-2">
                This report type is submitted when a user cannot find their name in the system and requests a new account to be created. 
                The user provides their name, wing, password, and optional contact information.
              </p>
              <p className="text-white/70 text-xs mt-2">
                <strong>Quick Fix:</strong> Use the "Create Account" button to create a new user account with the provided information.
              </p>
            </div>

            <div className="bg-yellow-600/20 border border-yellow-600/50 rounded p-4">
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 font-semibold text-lg">ACCOUNT_CONFLICT</span>
              </div>
              <p className="text-white/80 text-sm mt-2">
                This report type is submitted when a user discovers that an account with their name and wing already exists with a password set. 
                This may indicate that someone has impersonated them and created an account. The user is requesting investigation and account recovery.
              </p>
              <p className="text-white/70 text-xs mt-2">
                <strong>Quick Fix:</strong> Use the "Approve Account" button to approve the existing account, or investigate further if needed.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="bg-[#ff7301] text-white py-2 px-6 rounded-md hover:bg-[#ff7301]/90 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



