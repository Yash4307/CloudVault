import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../useAuth';
import { getTrashFiles, restoreFile, permanentDeleteFile } from '../api';
import { useToast } from '../components/Toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const Trash = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTrash(); }, []);

  const loadTrash = async () => {
    try {
      const response = await getTrashFiles();
      setFiles(response.data);
    } catch (err) { addToast('Failed to load trash', 'error'); }
    finally { setLoading(false); }
  };

  const handleRestore = async (fileId) => {
    try {
      await restoreFile(fileId);
      addToast('File restored!', 'success');
      loadTrash();
    } catch (err) { addToast(err.response?.data?.detail || 'Failed to restore', 'error'); }
  };

  const handlePermanentDelete = async (fileId) => {
    if (window.confirm('Permanently delete? This cannot be undone.')) {
      try {
        await permanentDeleteFile(fileId);
        addToast('File permanently deleted', 'success');
        loadTrash();
      } catch (err) { addToast(err.response?.data?.detail || 'Failed to delete', 'error'); }
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 max-w-4xl">
          <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trash</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Files are automatically deleted after 30 days</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 mt-6">
                {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-2xl" />)}
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-20 mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="text-6xl mb-4">🗑️</div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Trash is empty</p>
              </div>
            ) : (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Deleted {new Date(file.deleted_at || file.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRestore(file.id)}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                        Restore
                      </button>
                      <button onClick={() => handlePermanentDelete(file.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        Delete Forever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Trash;
