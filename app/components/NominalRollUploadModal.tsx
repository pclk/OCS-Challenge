'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import NominalRollHelpModal from './NominalRollHelpModal';

interface NominalRollUploadModalProps {
  isOpen: boolean;
  adminWing: string | null;
  onClose: () => void;
  onUploadSuccess: () => void;
  loading?: boolean;
}

export default function NominalRollUploadModal({
  isOpen,
  adminWing,
  onClose,
  onUploadSuccess,
  loading = false,
}: NominalRollUploadModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Get admin token from localStorage
  if (typeof window !== 'undefined' && !adminToken) {
    const token = localStorage.getItem('ocs_admin_token');
    if (token) setAdminToken(token);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !csvFile) {
      toast.error('Please select a CSV file');
      return;
    }
    if (!adminWing) {
      toast.error('Wing not found. Please ensure you are logged in with a wing-specific password.');
      return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/admin/upload-nominal-roll', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Upload successful: ${data.summary.created} created, ${data.summary.updated} updated`);
        setCsvFile(null);
        onUploadSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Failed to upload');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-white">Upload Nominal Roll</h3>
                <button
                  onClick={() => setShowHelp(true)}
                  className="text-[#ff7301] hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#ff7301]"
                  title="How to upload nominal roll"
                  aria-label="Help"
                >
                  ?
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {adminWing && (
              <p className="text-white/70 text-sm mb-4">Wing: <span className="font-semibold text-white">{adminWing}</span></p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-white/20 rounded-md bg-black text-white"
                  required
                />
                <p className="text-white/50 text-xs mt-1">CSV should have a "name" column. <a href="/nominal-roll-template.csv" download className="text-[#ff7301] hover:text-[#ff7301]/80 underline">Download template</a></p>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={uploadLoading || loading}
                  className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || loading || !csvFile || !adminWing}
                  className="px-4 py-2 bg-[#ff7301] text-white rounded-md hover:bg-[#ff7301]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <NominalRollHelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </>
  );
}

