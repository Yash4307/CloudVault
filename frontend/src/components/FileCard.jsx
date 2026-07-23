import { useState } from 'react';
import { createShareLink, downloadFile, renameFile } from '../api';
import FilePreview from './FilePreview';
import { formatBytes, getFileBadge, getFilenameFromDisposition } from '../utils/fileTypes';

const FileCard = ({ file, onDelete, onRefresh }) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [showPreview, setShowPreview] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const badge = getFileBadge(file);

  const handleDownload = async () => {
    try {
      const response = await downloadFile(file.id);
      const blob = new Blob([response.data], { type: file.file_type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilenameFromDisposition(response.headers['content-disposition'], file.original_name);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch {
      alert('Download failed');
    } finally {
      setShowMenu(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === file.name) {
      setIsRenaming(false);
      return;
    }
    try {
      await renameFile(file.id, { new_name: newName });
      setIsRenaming(false);
      onRefresh();
    } catch {
      alert('Rename failed');
    }
  };

  const handleShare = async () => {
    try {
      const response = await createShareLink(file.id);
      setShareUrl(response.data.url);
      setShowMenu(false);
      await navigator.clipboard?.writeText(response.data.url);
    } catch {
      alert('Share link failed');
    }
  };

  return (
    <>
      <div className="group rounded-2xl border border-gray-100 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600">
        <div className="relative mb-3">
          <button
            type="button"
            className={`flex aspect-square w-full items-center justify-center rounded-xl text-lg font-bold transition-transform hover:scale-105 ${badge.bg}`}
            onClick={() => setShowPreview(true)}
          >
            {badge.label}
          </button>
          <button
            type="button"
            onClick={() => setShowMenu((value) => !value)}
            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-white/85 opacity-0 backdrop-blur-sm transition-opacity hover:bg-gray-100 group-hover:opacity-100 dark:bg-gray-800/85 dark:hover:bg-gray-700"
            aria-label="File actions"
          >
            <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
              <button onClick={handleDownload} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">Download</button>
              <button onClick={() => { setNewName(file.name); setIsRenaming(true); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">Rename</button>
              <button onClick={handleShare} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">Share</button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30">Delete</button>
            </div>
          )}
        </div>

        {isRenaming ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
            />
            <button onClick={handleRename} className="px-1 text-xs text-emerald-500">Save</button>
          </div>
        ) : (
          <p
            className="truncate text-sm font-medium text-gray-900 dark:text-white"
            title={`${file.name} (double-click to rename)`}
            onDoubleClick={() => { setNewName(file.name); setIsRenaming(true); }}
          >
            {file.name}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-gray-50 pt-2 dark:border-gray-700">
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatBytes(file.file_size)}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(file.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {showPreview && <FilePreview file={file} onClose={() => setShowPreview(false)} />}
      {shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setShareUrl('')}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-semibold text-gray-950 dark:text-white">Share file</h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Anyone with this link can view and download this file for 7 days.</p>
            <input
              readOnly
              value={shareUrl}
              className="mb-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShareUrl('')} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Close</button>
              <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Copy</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileCard;
