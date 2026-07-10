'use client';
import { motion } from 'framer-motion';
import { FileText, FileSpreadsheet, File, Trash2, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import type { Document } from '@/lib/types';
import { clsx } from 'clsx';

const FILE_ICONS: Record<string, React.ReactNode> = {
  '.pdf':  <FileText size={14} className="text-red-400" />,
  '.docx': <FileText size={14} className="text-blue-400" />,
  '.doc':  <FileText size={14} className="text-blue-400" />,
  '.csv':  <FileSpreadsheet size={14} className="text-green-400" />,
  '.xlsx': <FileSpreadsheet size={14} className="text-green-400" />,
  '.md':   <File size={14} className="text-purple-400" />,
  '.txt':  <File size={14} className="text-slate-400" />,
};

const STATUS_CONFIG = {
  ready:      { icon: <CheckCircle2 size={11} />, color: 'text-emerald-400', label: 'Ready' },
  processing: { icon: <Loader2 size={11} className="animate-spin" />, color: 'text-yellow-400', label: 'Processing' },
  pending:    { icon: <Clock size={11} />, color: 'text-slate-400', label: 'Pending' },
  failed:     { icon: <AlertCircle size={11} />, color: 'text-red-400', label: 'Failed' },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  doc: Document;
  onDelete: (id: string, name: string) => void;
}

export default function DocumentCard({ doc, onDelete }: Props) {
  const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
  const icon = FILE_ICONS[doc.file_type] || <File size={14} className="text-slate-400" />;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-surface-600/50 transition-all border border-transparent hover:border-surface-500"
    >
      <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center shrink-0 border border-surface-500">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-200 truncate leading-tight" title={doc.original_name}>
          {doc.original_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-500">{formatSize(doc.size)}</span>
          {doc.chunk_count > 0 && (
            <span className="text-[10px] text-slate-650">· {doc.chunk_count} chunks</span>
          )}
        </div>
        <div className={clsx('flex items-center gap-1 mt-0.5 text-[10px] font-medium', status.color)}>
          {status.icon}
          {status.label}
          {doc.status === 'failed' && doc.error_message && (
            <span className="text-red-500 truncate max-w-[100px]" title={doc.error_message}>
              · {doc.error_message}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(doc.id, doc.original_name)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:text-red-400 hover:bg-red-400/10 transition-all text-slate-500 shrink-0"
        title="Delete document"
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}
