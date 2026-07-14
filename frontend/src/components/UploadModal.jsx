import { useState, useRef, useCallback } from 'react';
import { useToast } from './Toast';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const UploadModal = ({ onUpload, onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const handleDuplicateNames = (files) => {
    const nameCount = {};
    return files.map((file) => {
      if (nameCount[file.name] === undefined) { nameCount[file.name] = 0; return file; }
      nameCount[file.name]++;
      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex > 0 ? file.name.substring(dotIndex) : '';
      const baseName = dotIndex > 0 ? file.name.substring(0, dotIndex) : file.name;
      return new File([file], `${baseName} (${nameCount[file.name]})${ext}`, { type: file.type });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;
    const oversizedFile = selectedFiles.find((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFile) {
      addToast(`${oversizedFile.name} is larger than the 50MB limit`, 'error');
      return;
    }

    setUploading(true);
    setProgress(0);
    const processedFiles = handleDuplicateNames(selectedFiles);
    let uploaded = 0;

    for (let i = 0; i < processedFiles.length; i++) {
      try {
        await onUpload(processedFiles[i]);
        uploaded++;
        setProgress(Math.round((uploaded / processedFiles.length) * 100));
      } catch (err) {
        addToast(`${processedFiles[i].name}: ${err.message || 'Upload failed'}`, 'error');
      }
    }

    setUploading(false);
    if (uploaded > 0) {
      addToast(`${uploaded} file(s) uploaded!`, 'success');
      setTimeout(() => onClose(), 500);
    }
  };

  const handleDragEnter = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDragOver = useCallback((e) => { e.preventDefault(); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-[480px] max-w-[95vw] shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Files</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Drop Zone */}
          <div
            onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-4 ${
              isDragging
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : selectedFiles.length > 0
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            {selectedFiles.length > 0 ? (
              <div>
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">📁</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFiles.length} file(s) selected</p>
                <div className="mt-2 max-h-28 overflow-y-auto space-y-1">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-lg px-2 py-1">
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="flex-shrink-0 ml-2">{(f.size / 1024).toFixed(1)} KB</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="ml-2 text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">📤</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{isDragging ? 'Drop files here' : 'Drag & drop files here'}</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" multiple onChange={(e) => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)])} className="hidden" />
          </div>

          {/* Progress */}
          {uploading && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span>Uploading...</span><span>{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} disabled={uploading} className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={selectedFiles.length === 0 || uploading}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors hover:shadow-lg hover:shadow-indigo-500/25">
              {uploading ? `Uploading ${progress}%` : `Upload ${selectedFiles.length} file(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
