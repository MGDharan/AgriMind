import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { documentsApi } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import type { Document } from '@/lib/types';

export function useDocuments() {
  const { documents, setDocuments, addDocument, removeDocument, updateDocument } =
    useChatStore();

  const fetchDocuments = useCallback(async () => {
    try {
      const { documents } = await documentsApi.list();
      setDocuments(documents);
    } catch (err) {
      toast.error('Failed to load documents');
    }
  }, [setDocuments]);

  const uploadDocument = useCallback(
    async (file: File, onProgress?: (pct: number) => void): Promise<Document | null> => {
      try {
        const doc = await documentsApi.upload(file, onProgress);
        addDocument(doc);
        toast.success(`"${file.name}" uploaded! Processing...`);

        // Poll for status until ready or failed
        const poll = setInterval(async () => {
          try {
            const updated = await documentsApi.get(doc.id);
            updateDocument(doc.id, updated);
            if (updated.status === 'ready') {
              clearInterval(poll);
              toast.success(`"${file.name}" is ready (${updated.chunk_count} chunks)`);
            } else if (updated.status === 'failed') {
              clearInterval(poll);
              toast.error(`Processing failed: ${updated.error_message}`);
            }
          } catch {
            clearInterval(poll);
          }
        }, 2000);

        return doc;
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err.message || 'Upload failed';
        toast.error(msg);
        return null;
      }
    },
    [addDocument, updateDocument]
  );

  const deleteDocument = useCallback(
    async (id: string, name: string) => {
      try {
        await documentsApi.delete(id);
        removeDocument(id);
        toast.success(`"${name}" deleted`);
      } catch {
        toast.error('Failed to delete document');
      }
    },
    [removeDocument]
  );

  return { documents, fetchDocuments, uploadDocument, deleteDocument };
}
