import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { chatApi } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import type { Message } from '@/lib/types';

function makeId() {
  return Math.random().toString(36).slice(2, 11);
}

export function useChat() {
  const {
    sessions,
    setSessions,
    addSession,
    removeSession,
    activeSessionId,
    setActiveSession,
    messages,
    addMessage,
    updateLastMessage,
    setMessages,
    isStreaming,
    setIsStreaming,
  } = useChatStore();

  const currentMessages = activeSessionId ? messages[activeSessionId] || [] : [];

  const fetchSessions = useCallback(async () => {
    try {
      const data = await chatApi.listSessions();
      setSessions(data);
    } catch {
      toast.error('Failed to load sessions');
    }
  }, [setSessions]);

  const loadSession = useCallback(
    async (sessionId: string) => {
      setActiveSession(sessionId);
      if (!messages[sessionId]) {
        try {
          const msgs = await chatApi.getMessages(sessionId);
          setMessages(sessionId, msgs);
        } catch {
          toast.error('Failed to load messages');
        }
      }
    },
    [setActiveSession, messages, setMessages]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await chatApi.deleteSession(id);
        removeSession(id);
        toast.success('Chat deleted');
      } catch {
        toast.error('Failed to delete chat');
      }
    },
    [removeSession]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setIsStreaming(true);

      // Optimistic user message
      const userMsg: Message = {
        id: makeId(),
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };

      const workingSessionId = activeSessionId;

      if (workingSessionId) {
        addMessage(workingSessionId, userMsg);
      }

      // Placeholder assistant message
      const assistantMsg: Message = {
        id: makeId(),
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        isStreaming: true,
      };

      const allMessages = workingSessionId
        ? [...(messages[workingSessionId] || []), userMsg]
        : [userMsg];

      let resolvedSessionId = workingSessionId;

      try {
        const response = await chatApi.streamCompletion({
          session_id: workingSessionId || undefined,
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          top_k: 5,
        });

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let finalSources: any[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw);

              if (event.type === 'session_id') {
                resolvedSessionId = event.session_id;
                if (!workingSessionId) {
                  setActiveSession(resolvedSessionId);
                  // Add messages to newly resolved session
                  addMessage(resolvedSessionId!, userMsg);
                }
                addMessage(resolvedSessionId!, assistantMsg);
              } else if (event.type === 'token') {
                accumulated += event.content;
                if (resolvedSessionId) {
                  updateLastMessage(resolvedSessionId, accumulated);
                }
              } else if (event.type === 'sources') {
                finalSources = event.sources || [];
              } else if (event.type === 'done') {
                if (resolvedSessionId) {
                  updateLastMessage(resolvedSessionId, accumulated, finalSources);
                  // Refresh sessions to surface new title
                  const updatedSessions = await chatApi.listSessions();
                  setSessions(updatedSessions);
                }
              } else if (event.type === 'error') {
                toast.error(event.message || 'An error occurred');
              }
            } catch {
              // Non-JSON SSE line — skip
            }
          }
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to send message');
      } finally {
        setIsStreaming(false);
      }
    },
    [activeSessionId, messages, isStreaming, addMessage, updateLastMessage, setActiveSession, setSessions, setIsStreaming]
  );

  return {
    sessions,
    activeSessionId,
    currentMessages,
    isStreaming,
    fetchSessions,
    loadSession,
    deleteSession,
    sendMessage,
  };
}
