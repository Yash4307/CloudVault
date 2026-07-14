import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../useAuth';
import { getFiles, getFolders, uploadFile, deleteFile, createFolder, deleteFolder } from '../api';
import { useToast } from '../components/Toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import FileCard from '../components/FileCard';
import FileListItem from '../components/FileListItem';
import FolderCard from '../components/FolderCard';
import FolderListItem from '../components/FolderListItem';
import UploadModal from '../components/UploadModal';
import Breadcrumb from '../components/Breadcrumb';
import EmptyState from '../components/EmptyState';

const Files = () => {
  const { folderId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, foldersRes] = await Promise.all([
        getFiles({ folder_id: folderId || null, search: search || null, sort_by: sortBy, order: sortOrder }),
        getFolders({ parent_id: folderId || null, search: search || null }),
      ]);
      setFiles(filesRes.data);
      setFolders(foldersRes.data);
    } catch { addToast('Failed to load files', 'error'); }
    finally { setLoading(false); }
  }, [addToast, folderId, search, sortBy, sortOrder]);

  useEffect(() => { loadData(); }, [loadData, refresh]);

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadFile(formData, folderId || null);
      setRefresh((r) => r + 1);
    } catch (err) {
      throw new Error(err.response?.data?.detail || 'Upload failed');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Move to trash?')) {
      await deleteFile(fileId);
      addToast('File moved to trash', 'info');
      setRefresh((r) => r + 1);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder({ name: newFolderName, parent_id: folderId || null });
    addToast('Folder created', 'success');
    setNewFolderName('');
    setShowCreateFolder(false);
    setRefresh((r) => r + 1);
  };

  const handleDeleteFolder = async (id) => {
    if (window.confirm('Delete folder and contents?')) {
      await deleteFolder(id);
      addToast('Folder deleted', 'info');
      setRefresh((r) => r + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
      <Navbar user={user} onLogout={() => { logout(); navigate('/login'); }} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 max-w-6xl">
          <Breadcrumb folderId={folderId} />

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setViewMode('grid')} className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${viewMode==='grid'?'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>▦</button>
              <button onClick={() => setViewMode('list')} className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${viewMode==='list'?'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>☰</button>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                <option value="created_at">Date</option><option value="name">Name</option><option value="file_size">Size</option><option value="file_type">Type</option>
              </select>
              <button onClick={() => setSortOrder(sortOrder==='asc'?'desc':'asc')} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">{sortOrder==='asc'?'↑':'↓'}</button>
              <button onClick={() => setShowCreateFolder(true)} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700">+ Folder</button>
              <button onClick={() => setShowUpload(true)} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors hover:shadow-lg hover:shadow-indigo-500/25">+ Upload</button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 skeleton rounded-2xl" />)}
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <EmptyState onUpload={() => setShowUpload(true)} />
          ) : (
            <>
              {folders.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Folders</h3>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {folders.map(f => <FolderCard key={f.id} folder={f} onClick={() => navigate(`/files/${f.id}`)} onDelete={() => handleDeleteFolder(f.id)} onRefresh={() => setRefresh(r => r+1)} />)}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                      {folders.map(f => <FolderListItem key={f.id} folder={f} onClick={() => navigate(`/files/${f.id}`)} onDelete={() => handleDeleteFolder(f.id)} />)}
                    </div>
                  )}
                </div>
              )}

              {files.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Files</h3>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {files.map(f => <FileCard key={f.id} file={f} onDelete={() => handleDeleteFile(f.id)} onRefresh={() => setRefresh(r => r+1)} />)}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                      {files.map((f, i) => <FileListItem key={f.id} file={f} isLast={i===files.length-1} onDelete={() => handleDeleteFile(f.id)} onRefresh={() => setRefresh(r => r+1)} />)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {showUpload && <UploadModal onUpload={handleUpload} onClose={() => setShowUpload(false)} />}
          {showCreateFolder && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreateFolder(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Folder</h3>
                <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4" autoFocus
                  onKeyDown={e => e.key==='Enter' && handleCreateFolder()} />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowCreateFolder(false)} className="px-4 py-2.5 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
                  <button onClick={handleCreateFolder} className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">Create</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Files;
