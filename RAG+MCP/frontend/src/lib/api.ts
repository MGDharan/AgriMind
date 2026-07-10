import axios from 'axios';
import type { Document, ChatSession, Message } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
});

// ── Documents ─────────────────────────────────────────────────────────────────

export const documentsApi = {
  list: async (): Promise<{ documents: Document[]; total: number }> => {
    const { data } = await api.get('/documents/');
    return data;
  },

  upload: async (
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<Document> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  get: async (id: string): Promise<Document> => {
    const { data } = await api.get(`/documents/${id}`);
    return data;
  },
};

// ── Chat Sessions ─────────────────────────────────────────────────────────────

export const chatApi = {
  listSessions: async (): Promise<ChatSession[]> => {
    const { data } = await api.get('/chat/sessions');
    return data;
  },

  createSession: async (title?: string): Promise<ChatSession> => {
    const { data } = await api.post('/chat/sessions', { title });
    return data;
  },

  deleteSession: async (id: string): Promise<void> => {
    await api.delete(`/chat/sessions/${id}`);
  },

  getMessages: async (sessionId: string): Promise<Message[]> => {
    const { data } = await api.get(`/chat/sessions/${sessionId}/messages`);
    return data;
  },

  streamCompletion: (
    request: { session_id?: string; messages: { role: string; content: string }[]; top_k?: number },
    apiUrl: string = API_URL
  ) => {
    return fetch(`${apiUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },
};

export const healthApi = {
  check: async () => {
    const { data } = await api.get('/health');
    return data;
  },
};
