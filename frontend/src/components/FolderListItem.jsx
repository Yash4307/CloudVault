import { useState } from 'react';
import { renameFolder } from '../api';

const FolderListItem = ({ folder, onClick, onDelete }) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);

  const handleRename = async () => {
    if (!newName.trim() || newName === folder.name) { setIsRenaming(false); return; }
    try { await renameFolder(folder.id, { new_name: newName }); setIsRenaming(false); }
    catch (err) { alert('Rename failed'); }
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-50 dark:border-gray-700 last:border-0 group cursor-pointer" onClick={onClick}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">📁</span>
        <div>
          {isRenaming ? (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus onKeyDown={e => { if (e.key==='Enter') handleRename(); if (e.key==='Escape') setIsRenaming(false); }} />
              <button onClick={handleRename} className="text-emerald-500 text-xs">✓</button>
              <button onClick={() => setIsRenaming(false)} className="text-red-500 text-xs">✕</button>
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-900 dark:text-white" onDoubleClick={e => { e.stopPropagation(); setNewName(folder.name); setIsRenaming(true); }}>
              {folder.name}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(folder.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setNewName(folder.name); setIsRenaming(true); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">✏️</button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">🗑️</button>
      </div>
    </div>
  );
};

export default FolderListItem;