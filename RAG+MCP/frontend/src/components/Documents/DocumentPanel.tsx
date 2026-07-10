'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, RefreshCw } from 'lucide-react';
import DropZone from './DropZone';
import DocumentCard from './DocumentCard';
import { useDocuments } from '@/hooks/useDocuments';
import { useChatStore } from '@/store/chatStore';

export default function DocumentPanel() {
  const { docPanelOpen } = useChatStore();
  const { documents, fetchDocuments, uploadDocument, deleteDocument } = useDocuments();

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  return (
    <AnimatePresence initial={false}>
      {docPanelOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="h-full glass border-l border-surface-600 flex flex-col overflow-hidden shrink-0"
        >
          {/* Header */}
          <div className="p-3 border-b border-surface-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen size={14} className="text-brand-400" />
              <span className="text-xs font-semibold text-slate-300">Knowledge Base</span>
              <span className="text-[10px] text-slate-650 bg-surface-600 px-1.5 py-0.5 rounded-full">
                {documents.length}
              </span>
            </div>
            <button
              onClick={fetchDocuments}
              className="p-1.5 rounded-lg hover:bg-surface-600 text-slate-500 hover:text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Upload */}
          <div className="p-3 border-b border-surface-600">
            <DropZone onUpload={uploadDocument} />
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto p-2">
            {documents.length === 0 ? (
              <div className="text-center text-slate-600 text-xs py-8">
                <FolderOpen size={24} className="mx-auto mb-2 opacity-30" />
                No documents yet
              </div>
            ) : (
              <AnimatePresence>
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onDelete={deleteDocument}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
