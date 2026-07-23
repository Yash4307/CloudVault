import { useState } from 'react';
import { createShareLink, downloadFile, renameFile } from '../api';
import FilePreview from './FilePreview';
import { formatBytes, getFileBadge, getFilenameFromDisposition } from '../utils/fileTypes';

const FileListItem = ({ file, isLast, onDelete, onRefresh }) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [showPreview, setShowPreview] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const badge = getFileBadge(file);

  const handleDownload = async () => {
    try {
      const response = await downloadFile(file.id);
      const blob = new Blob([response.data], { type: file.file_type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilenameFromDisposition(response.headers['content-disposition'], file.original_name);
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch {
      alert('Download failed');
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
      await navigator.clipboard?.writeText(response.data.url);
    } catch {
      alert('Share link failed');
    }
  };

  return (
    <>
      <div className={`group flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!isLast ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button onClick={() => setShowPreview(true)} className={`rounded-lg px-2 py-1 text-xs font-bold ${badge.bg}`}>{badge.label}</button>
          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                />
                <button onClick={handleRename} className="text-xs text-emerald-500">Save</button>
              </div>
            ) : (
              <p className="truncate text-sm font-medium text-gray-900 hover:text-indigo-600 dark:text-white" onDoubleClick={() => { setNewName(file.name); setIsRenaming(true); }}>
                {file.name}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.file_size)} · {new Date(file.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={handleDownload} className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-700">Download</button>
          <button onClick={() => { setNewName(file.name); setIsRenaming(true); }} className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700">Rename</button>
          <button onClick={handleShare} className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-700">Share</button>
          <button onClick={onDelete} className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">Delete</button>
        </div>
      </div>
      {showPreview && <FilePreview file={file} onClose={() => setShowPreview(false)} />}
      {shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setShareUrl('')}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-semibold text-gray-950 dark:text-white">Share file</h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Anyone with this link can view and download this file for 7 days.</p>
            <input readOnly value={shareUrl} className="mb-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" onFocus={(e) => e.target.select()} />
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

export default FileListItem;
