'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { motion } from 'framer-motion';
import { User, Bot, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import SourceCitation from './SourceCitation';
import type { Message } from '@/lib/types';
import { clsx } from 'clsx';

interface Props {
  message: Message;
  isLast?: boolean;
}

export default function MessageBubble({ message, isLast }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copyContent = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSafeDistance = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'now';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return 'now';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={clsx('flex gap-3 px-4 py-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md mt-0.5',
          isUser
            ? 'bg-gradient-to-br from-brand-500 to-purple-600'
            : 'bg-gradient-to-br from-surface-500 to-surface-600 border border-surface-400'
        )}
      >
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-brand-400" />}
      </div>

      {/* Bubble */}
      <div className={clsx('max-w-[80%] min-w-0', isUser ? 'items-end' : 'items-start')}>
        <div
          className={clsx(
            'rounded-2xl px-4 py-3 text-sm shadow-sm relative',
            isUser
              ? 'bg-gradient-to-br from-brand-600 to-purple-700 text-white rounded-tr-sm'
              : 'glass text-slate-200 rounded-tl-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className={clsx('prose-dark', message.isStreaming && !message.content && 'min-h-[1.5em]')}>
              {message.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeRaw]}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <span className="text-slate-500 animate-pulse">Thinking...</span>
              )}
              {message.isStreaming && message.content && (
                <span className="typing-cursor" />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={clsx('flex items-center gap-2 mt-1 px-1', isUser ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-slate-600">
            {getSafeDistance(message.created_at)}
          </span>
          {!isUser && message.content && (
            <button
              onClick={copyContent}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300"
              title="Copy"
            >
              {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
            </button>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="px-1">
            <SourceCitation sources={message.sources} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
