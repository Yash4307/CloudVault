import { useState, useEffect } from 'react';
import { downloadFile } from '../api';

const FilePreview = ({ file, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPreview();
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [file]);

  const loadPreview = async () => {
    try {
      const response = await downloadFile(file.id);
      const byteArray = new Uint8Array(response.data.data.match(/.{1,2}/g).map(b => parseInt(b, 16)));
      const blob = new Blob([byteArray], { type: file.file_type });
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) { setError('Failed to load preview'); }
    finally { setLoading(false); }
  };

  const isImage = file.file_type?.startsWith('image/');
  const isPDF = file.file_type === 'application/pdf';
  const isText = file.file_type?.startsWith('text/');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{file.name}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900">
          {loading ? (
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : isImage ? (
            <img src={previewUrl} alt={file.name} className="max-w-full max-h-[70vh] rounded-xl object-contain" />
          ) : isPDF || isText ? (
            <iframe src={previewUrl} className="w-full h-[70vh] rounded-xl" title={file.name} />
          ) : (
            <div className="text-center">
              <span className="text-6xl">📄</span>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Preview not available</p>
              <a href={previewUrl} download={file.name}
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
                ⬇️ Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreview;