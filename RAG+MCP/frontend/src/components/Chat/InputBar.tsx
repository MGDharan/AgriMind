'use client';
import { useRef, useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Send, Square, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  onSend: (message: string) => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export default function InputBar({ onSend, isStreaming, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  return (
    <div className="p-4 border-t border-surface-600 glass">
      <div
        className={clsx(
          'flex items-end gap-3 rounded-2xl border transition-all duration-200 px-4 py-3 glow-blue',
          'bg-surface-800 border-surface-500',
          !disabled && 'hover:border-brand-600/50 focus-within:border-brand-500/70'
        )}
      >
        <Sparkles size={16} className="text-brand-400 shrink-0 mb-1 opacity-60" />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your documents..."
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent text-slate-200 placeholder-slate-650 text-sm leading-relaxed resize-none focus:outline-none min-h-[1.5rem] max-h-[200px] font-sans"
        />
        <motion.button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          whileTap={{ scale: 0.92 }}
          className={clsx(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
            value.trim() && !disabled
              ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-lg hover:shadow-brand-500/30 hover:scale-105'
              : 'bg-surface-600 text-slate-600 cursor-not-allowed'
          )}
        >
          {isStreaming ? <Square size={14} fill="currentColor" /> : <Send size={14} />}
        </motion.button>
      </div>
      <p className="text-[10px] text-slate-700 text-center mt-2">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
