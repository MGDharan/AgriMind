'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FileText, BarChart2 } from 'lucide-react';
import type { Source } from '@/lib/types';

interface Props {
  sources: Source[];
}

export default function SourceCitation({ sources }: Props) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
      >
        <FileText size={11} />
        {sources.length} source{sources.length !== 1 ? 's' : ''}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={11} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {sources.map((src, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-surface-800 border border-surface-600 text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-brand-400 font-medium">
                      <FileText size={10} />
                      <span className="truncate max-w-[180px]">{src.doc_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <BarChart2 size={9} />
                      <span>{(src.score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-slate-400 leading-relaxed line-clamp-3">
                    {src.chunk_text}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
