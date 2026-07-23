export const formatBytes = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const extensionOf = (name = '') => {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : '';
};

export const getFileBadge = (fileOrType, maybeName = '') => {
  const type = typeof fileOrType === 'string' ? fileOrType : fileOrType?.file_type;
  const name = typeof fileOrType === 'string' ? maybeName : fileOrType?.name;
  const ext = extensionOf(name);

  if (type === 'image/svg+xml' || ext === 'svg') {
    return { label: 'SVG', bg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' };
  }
  if (type?.startsWith('image/')) {
    return { label: 'IMG', bg: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' };
  }
  if (type === 'application/pdf' || ext === 'pdf') {
    return { label: 'PDF', bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  }
  if (type?.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return { label: 'VID', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
  }
  if (type?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return { label: 'AUD', bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
  }
  if (type?.includes('zip') || type?.includes('rar') || type?.includes('7z') || type?.includes('tar') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { label: 'ZIP', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  }
  if (type?.includes('sheet') || type?.includes('excel') || ['xls', 'xlsx', 'ods'].includes(ext)) {
    return { label: 'XLS', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
  }
  if (type?.includes('presentation') || type?.includes('powerpoint') || ['ppt', 'pptx', 'odp'].includes(ext)) {
    return { label: 'PPT', bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' };
  }
  if (type?.includes('word') || type?.includes('document') || ['doc', 'docx', 'odt'].includes(ext)) {
    return { label: 'DOC', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
  }
  if (isTextFile(type, name)) {
    return { label: 'TXT', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' };
  }
  return { label: 'FILE', bg: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' };
};

export const isTextFile = (type, name = '') => {
  const ext = extensionOf(name);
  return (
    type?.startsWith('text/') ||
    ['txt', 'json', 'xml', 'csv', 'md', 'log', 'html', 'css', 'js'].includes(ext) ||
    ['application/json', 'application/xml', 'application/csv'].includes(type)
  );
};

export const isPreviewableFile = (file) => (
  file?.file_type?.startsWith('image/') ||
  file?.file_type === 'application/pdf' ||
  isTextFile(file?.file_type, file?.name)
);

export const getFilenameFromDisposition = (contentDisposition, fallback = 'download') => {
  if (!contentDisposition) return fallback;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() || fallback;
};
