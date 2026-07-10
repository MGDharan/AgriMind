'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';
import MessageBubble from './MessageBubble';
import type { Message } from '@/lib/types';

interface Props {
  messages: Message[];
  isStreaming: boolean;
}

export default function ChatWindow({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-600 to-purple-700 flex items-center justify-center shadow-2xl shadow-brand-600/30 mb-6"
        >
          <Bot size={36} className="text-white" />
        </motion.div>
        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold gradient-text mb-3"
        >
          Ready to help
        </motion.h2>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-slate-400 max-w-sm text-sm leading-relaxed"
        >
          Upload your documents and ask questions. I'll search your knowledge base
          and provide answers with source citations.
        </motion.p>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 w-full max-w-lg"
        >
          {[
            { icon: '📄', text: 'Summarize documents' },
            { icon: '🔍', text: 'Find specific info' },
            { icon: '💡', text: 'Explain concepts' },
          ].map((item) => (
            <div
              key={item.text}
              className="glass rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2 border-surface-500"
            >
              <span className="text-base">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={i === messages.length - 1}
          />
        ))}
      </AnimatePresence>
      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
