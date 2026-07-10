'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUpload, X, FileCheck } from 'lucide-react';
import { clsx } from 'clsx';
import type { UploadProgress } from '@/lib/types';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
  'application/csv': ['.csv'],
};

interface Props {
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<any>;
}

export default function DropZone({ onUpload }: Props) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      for (const file of accepted) {
        const entry: UploadProgress = { file, progress: 0, status: 'uploading' };
        setUploads((prev) => [...prev, entry]);

        const onProgress = (pct: number) => {
          setUploads((prev) =>
            prev.map((u) => (u.file === file ? { ...u, progress: pct } : u))
          );
        };

        try {
          await onUpload(file, onProgress);
          setUploads((prev) =>
            prev.map((u) => (u.file === file ? { ...u, status: 'done', progress: 100 } : u))
          );
          // Remove after delay
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.file !== file));
          }, 3000);
        } catch (err: any) {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, status: 'error', error: err.message } : u
            )
          );
        }
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={clsx(
          'relative rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-brand-500 bg-brand-600/10 scale-[1.01]'
            : 'border-surface-500 hover:border-brand-600/60 hover:bg-surface-700/50'
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ scale: isDragActive ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center gap-1.5"
        >
          <CloudUpload
            size={22}
            className={clsx(
              'transition-colors',
              isDragActive ? 'text-brand-400' : 'text-slate-500'
            )}
          />
          <p className="text-xs text-slate-400 font-medium">
            {isDragActive ? 'Drop to upload' : 'Drop files or click'}
          </p>
          <p className="text-[10px] text-slate-650">PDF, DOCX, TXT, MD, CSV · max 50MB</p>
        </motion.div>
      </div>

      {/* Upload progress list */}
      <AnimatePresence>
        {uploads.map((u, i) => (
          <motion.div
            key={`${u.file.name}-${i}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-surface-700 border border-surface-500 p-2.5 text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="truncate text-slate-305 max-w-[160px]">{u.file.name}</span>
              {u.status === 'done' && <FileCheck size={12} className="text-emerald-400 shrink-0" />}
              {u.status === 'error' && (
                <button onClick={() => setUploads((p) => p.filter((_, idx) => idx !== i))}>
                  <X size={12} className="text-red-400" />
                </button>
              )}
            </div>
            {u.status === 'uploading' && (
              <div className="h-1 bg-surface-600 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-500 to-purple-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${u.progress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            )}
            {u.status === 'error' && (
              <p className="text-red-400">{u.error || 'Upload failed'}</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
