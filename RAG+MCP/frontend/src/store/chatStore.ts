import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatSession, Message, Document } from '@/lib/types';

function makeId() {
  return Math.random().toString(36).slice(2, 11);
}

interface ChatStore {
  // Sessions
  sessions: ChatSession[];
  activeSessionId: string | null;
  setSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  updateSessionTitle: (id: string, title: string) => void;

  // Messages
  messages: Record<string, Message[]>;
  addMessage: (sessionId: string, message: Message) => void;
  updateLastMessage: (sessionId: string, content: string, sources?: any[]) => void;
  setMessages: (sessionId: string, messages: Message[]) => void;
  clearMessages: (sessionId: string) => void;

  // Documents
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;

  // UI State
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  docPanelOpen: boolean;
  setDocPanelOpen: (v: boolean) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      // Sessions
      sessions: [],
      activeSessionId: null,
      setSessions: (sessions) => set({ sessions }),
      addSession: (session) =>
        set((s) => ({ sessions: [session, ...s.sessions] })),
      removeSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((s2) => s2.id !== id),
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        })),
      setActiveSession: (id) => set({ activeSessionId: id }),
      updateSessionTitle: (id, title) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, title } : sess
          ),
        })),

      // Messages
      messages: {},
      addMessage: (sessionId, message) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [sessionId]: [...(s.messages[sessionId] || []), message],
          },
        })),
      updateLastMessage: (sessionId, content, sources) =>
        set((s) => {
          const msgs = s.messages[sessionId] || [];
          const updated = [...msgs];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content,
              sources: sources ?? last.sources,
              isStreaming: false,
            };
          }
          return { messages: { ...s.messages, [sessionId]: updated } };
        }),
      setMessages: (sessionId, messages) =>
        set((s) => ({ messages: { ...s.messages, [sessionId]: messages } })),
      clearMessages: (sessionId) =>
        set((s) => ({ messages: { ...s.messages, [sessionId]: [] } })),

      // Documents
      documents: [],
      setDocuments: (docs) => set({ documents: docs }),
      addDocument: (doc) =>
        set((s) => ({ documents: [doc, ...s.documents] })),
      removeDocument: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      updateDocument: (id, updates) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      // UI
      isStreaming: false,
      setIsStreaming: (v) => set({ isStreaming: v }),
      sidebarOpen: true,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      docPanelOpen: true,
      setDocPanelOpen: (v) => set({ docPanelOpen: v }),
    }),
    {
      name: 'rag-chat-store',
      partialize: (s) => ({
        activeSessionId: s.activeSessionId,
        sidebarOpen: s.sidebarOpen,
        docPanelOpen: s.docPanelOpen,
      }),
    }
  )
);
