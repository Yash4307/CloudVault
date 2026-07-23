import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { downloadSharedFile, getSharedFile } from '../api';
import { formatBytes, getFilenameFromDisposition, isPreviewableFile, isTextFile } from '../utils/fileTypes';

const SharedFile = () => {
  const { token } = useParams();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl = '';
    const loadSharedFile = async () => {
      try {
        const metadata = await getSharedFile(token);
        setFile(metadata.data);

        if (isPreviewableFile(metadata.data)) {
          const response = await downloadSharedFile(token);
          const blob = new Blob([response.data], { type: metadata.data.file_type });
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Shared file is unavailable');
      } finally {
        setLoading(false);
      }
    };

    loadSharedFile();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token]);

  const handleDownload = async () => {
    const response = await downloadSharedFile(token);
    const blob = new Blob([response.data], { type: file.file_type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFilenameFromDisposition(response.headers['content-disposition'], file.original_name || file.name);
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 dark:bg-[#0f172a]">
      <main className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/login" className="text-lg font-bold text-indigo-700 dark:text-cyan-300">CloudVault</Link>
          {file && (
            <button onClick={handleDownload} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Download
            </button>
          )}
        </div>

        <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Loading shared file...</p>
          ) : error ? (
            <p className="text-red-600 dark:text-red-300">{error}</p>
          ) : (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-bold text-gray-950 dark:text-white">{file.name}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatBytes(file.file_size)} · Shared read-only
                </p>
              </div>

              {previewUrl && file.file_type?.startsWith('image/') && (
                <img src={previewUrl} alt={file.name} className="max-h-[70vh] w-full rounded-lg object-contain" />
              )}
              {previewUrl && file.file_type === 'application/pdf' && (
                <iframe src={previewUrl} className="h-[70vh] w-full rounded-lg" title={file.name} />
              )}
              {previewUrl && isTextFile(file.file_type, file.name) && (
                <iframe src={previewUrl} className="h-[60vh] w-full rounded-lg border border-gray-200 dark:border-gray-700" title={file.name} />
              )}
              {!previewUrl && (
                <div className="rounded-lg bg-gray-50 p-10 text-center dark:bg-gray-900">
                  <p className="text-gray-600 dark:text-gray-300">Preview is not available for this file type.</p>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default SharedFile;
