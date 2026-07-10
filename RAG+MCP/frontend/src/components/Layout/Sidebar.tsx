'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Trash2, MessageSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/store/chatStore';
import { clsx } from 'clsx';

export default function Sidebar() {
  const { sidebarOpen } = useChatStore();
  const { sessions, activeSessionId, fetchSessions, loadSession, deleteSession } = useChat();

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleNewChat = () => {
    useChatStore.getState().setActiveSession(null);
  };

  const getSafeDistance = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'recently';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <AnimatePresence initial={false}>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="h-full glass border-r border-surface-600 flex flex-col overflow-hidden shrink-0"
        >
          <div className="p-3 border-b border-surface-600">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-700 hover:from-brand-500 hover:to-purple-600 transition-all text-white text-sm font-medium shadow-lg hover:shadow-brand-500/25 active:scale-[0.98]"
            >
              <MessageSquarePlus size={16} />
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-8">
                No conversations yet
              </div>
            )}
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={clsx(
                  'group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm',
                  activeSessionId === session.id
                    ? 'bg-brand-600/20 border border-brand-600/30 text-slate-100'
                    : 'hover:bg-surface-600 text-slate-400 hover:text-slate-200'
                )}
                onClick={() => loadSession(session.id)}
              >
                <MessageSquare size={14} className="shrink-0 mt-0.5 opacity-60" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-xs leading-relaxed">
                    {session.title}
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock size={9} />
                    {getSafeDistance(session.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="p-3 border-t border-surface-600">
            <p className="text-[10px] text-slate-600 text-center">
              Powered by Ollama · Qdrant
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
