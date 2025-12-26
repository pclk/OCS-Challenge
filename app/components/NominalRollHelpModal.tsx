'use client';

interface NominalRollHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NominalRollHelpModal({ isOpen, onClose }: NominalRollHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-black border border-white/20 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-white">How to Upload Nominal Roll</h3>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 text-white/90">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Step 1: Prepare Your CSV File</h4>
              <p className="mb-2">Your CSV file must contain a column named "name" with the names of personnel.</p>
              <p className="text-white/70 text-sm mb-2">Example format:</p>
              <div className="bg-white/5 border border-white/10 rounded p-3 font-mono text-sm mb-2">
                <div>name</div>
                <div>John Doe</div>
                <div>Jane Smith</div>
                <div>Bob Johnson</div>
              </div>
              <a
                href="/nominal-roll-template.csv"
                download
                className="text-[#ff7301] hover:text-[#ff7301]/80 underline text-sm"
              >
                Download Template CSV
              </a>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-2">How to Create CSV File in Microsoft Excel</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
                <li className="mb-2">
                  <span className="font-medium">Open Microsoft Excel</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>Create a new workbook or open an existing one</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <span className="font-medium">Set up your header row</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>In cell A1, type: <code className="bg-white/10 px-1 rounded">name</code></li>
                    <li>This will be your column header</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <span className="font-medium">Enter personnel names</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>Starting from cell A2, enter each person's name (one per row)</li>
                    <li>Example: A2 = "John Doe", A3 = "Jane Smith", etc.</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <span className="font-medium">Save as CSV</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>Click <strong>File</strong> → <strong>Save As</strong></li>
                    <li>Choose a location to save the file</li>
                    <li>In the "Save as type" dropdown, select <strong>"CSV UTF-8 (Comma delimited) (*.csv)"</strong></li>
                    <li>Enter a filename (e.g., "nominal-roll.csv")</li>
                    <li>Click <strong>Save</strong></li>
                    <li>If Excel shows a warning about CSV format, click <strong>Yes</strong> to confirm</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <span className="font-medium">Verify the file</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>Make sure the file extension is .csv</li>
                    <li>You can open it in Notepad to verify it looks like: name,John Doe,Jane Smith (one per line)</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-2">How to Create CSV File in Google Sheets</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
                <li className="mb-2">
                  <span className="font-medium">Open Google Sheets</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>Go to <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-[#ff7301] hover:text-[#ff7301]/80 underline">sheets.google.com</a></li>
                    <li>Create a new spreadsheet or open an existing one</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <span className="font-medium">Set up your header row</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>In cell A1, type: <code className="bg-white/10 px-1 rounded">name</code></li>
                    <li>This will be your column header</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <span className="font-medium">Enter personnel names</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>Starting from cell A2, enter each person's name (one per row)</li>
                    <li>Example: A2 = "John Doe", A3 = "Jane Smith", etc.</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <span className="font-medium">Download as CSV</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>Click <strong>File</strong> → <strong>Download</strong> → <strong>Comma-separated values (.csv)</strong></li>
                    <li>The file will automatically download to your computer</li>
                    <li>The filename will be the same as your spreadsheet name with .csv extension</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <span className="font-medium">Verify the file</span>
                  <ul className="list-disc list-inside ml-6 mt-1 text-white/80">
                    <li>Check your Downloads folder for the .csv file</li>
                    <li>Make sure the file extension is .csv</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Step 2: Upload the File</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Click the "Choose File" button</li>
                <li>Select your CSV file from your computer</li>
                <li>Click "Upload" to process the file</li>
              </ol>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Step 3: Review Results</h4>
              <p className="text-sm">After uploading, you will see a summary showing:</p>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4 mt-1">
                <li>Total number of users processed</li>
                <li>Number of new users created</li>
                <li>Number of existing users updated</li>
                <li>Any errors that occurred</li>
              </ul>
            </div>

            <div className="bg-yellow-600/20 border border-yellow-600/50 rounded p-3">
              <h4 className="text-sm font-semibold text-yellow-400 mb-1">Important Notes:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                <li>The wing will be automatically assigned based on your login credentials</li>
                <li>Users with the same name and wing will be updated, not duplicated</li>
                <li>Empty rows and rows without names will be skipped</li>
                <li>The CSV file should use UTF-8 encoding</li>
              </ul>
            </div>

            <div className="bg-blue-600/20 border border-blue-600/50 rounded p-3">
              <h4 className="text-sm font-semibold text-blue-400 mb-1">Tips:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                <li>Ensure names are spelled correctly as they will be used for user accounts</li>
                <li>Remove any extra columns that are not needed</li>
                <li>Check for duplicate names before uploading</li>
                <li>Save your CSV file in UTF-8 format to avoid encoding issues</li>
              </ul>
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

