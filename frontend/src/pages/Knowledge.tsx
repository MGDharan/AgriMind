import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Send, Loader2, Upload, Trash2, FileText,
  Bot, User, Quote, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { GlassCard, ConfidenceRing } from '../components/ui';
import { timeAgo } from '../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface Source {
  doc_id: string;
  doc_name: string;
  chunk_text: string;
  score: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  streaming?: boolean;
}

interface DocMeta {
  id: string;
  name: string;
  chunks: number;
  created_at: string;
}

// ── Suggested questions ────────────────────────────────────────────────────

const SUGGESTED = [
  'How to treat late blight in tomatoes?',
  'What is the optimal NPK ratio for rice?',
  'How do I control aphids naturally?',
  'What pH level is best for tomatoes?',
  'How often should I irrigate wheat?',
  'Signs of nitrogen deficiency in crops?',
];

// ── Source citation collapsible ────────────────────────────────────────────

function SourceList({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-wheat-400 transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {sources.length} source{sources.length > 1 ? 's' : ''}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2 space-y-2"
          >
            {sources.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-xl bg-earth-800/30 border border-earth-700/50"
              >
                <Quote className="w-3 h-3 text-wheat-400 mt-1 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-wheat-400 truncate">{s.doc_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-3">{s.chunk_text}</p>
                  <p className="text-[10px] text-gray-600 mt-1">Relevance: {(s.score * 100).toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chat message bubble ────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-moss-600/15 border border-moss-600/20 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-moss-400" />
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-moss-600/20 border border-moss-600/30 text-gray-100 rounded-tr-sm'
              : 'bg-earth-800/60 border border-earth-700/50 text-gray-200 rounded-tl-sm'
          }`}
        >
          {msg.content}
          {msg.streaming && (
            <span className="inline-block w-1.5 h-4 bg-moss-400 ml-1 animate-pulse rounded-sm" />
          )}
        </div>
        {!isUser && msg.sources && <SourceList sources={msg.sources} />}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-earth-700/50 border border-earth-600 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </motion.div>
  );
}

// ── Document management panel ──────────────────────────────────────────────

function DocumentPanel() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: docs = [], isLoading } = useQuery<DocMeta[]>({
    queryKey: ['rag-docs'],
    queryFn: api.knowledge.listDocs,
  });

  const deleteMut = useMutation({
    mutationFn: api.knowledge.deleteDoc,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rag-docs'] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      await api.knowledge.uploadDoc(file);
      qc.invalidateQueries({ queryKey: ['rag-docs'] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Knowledge Documents</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,.docx,.csv"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {uploadError && (
        <p className="text-xs text-terra-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {uploadError}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-earth-800/30 animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-6 rounded-xl border border-dashed border-earth-600">
          <FileText className="w-8 h-8 text-earth-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No documents yet</p>
          <p className="text-[10px] text-gray-600 mt-1">Upload PDFs, TXT, MD, DOCX or CSV</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-xl bg-earth-800/30 border border-earth-700/50 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-wheat-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-300 truncate">{doc.name}</p>
                  <p className="text-[10px] text-gray-600">
                    {doc.chunks > 0 ? `${doc.chunks} chunks` : 'Processing…'} · {timeAgo(doc.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteMut.mutate(doc.id)}
                disabled={deleteMut.isPending}
                className="p-1.5 rounded-lg text-gray-600 hover:text-terra-400 hover:bg-terra-500/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-600 leading-relaxed">
        Uploaded documents are embedded and searched semantically when you ask questions.
        Your farm scan history is automatically included as context.
      </p>
    </div>
  );
}

// ── Main Knowledge page ────────────────────────────────────────────────────

export function KnowledgePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || streaming) return;
    setInput('');
    setStreaming(true);

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
    };

    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      await api.knowledge.chat(question, (event) => {
        if (event.type === 'token') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + event.content }
                : m,
            ),
          );
        } else if (event.type === 'sources') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, sources: event.sources as Source[], streaming: false }
                : m,
            ),
          );
        } else if (event.type === 'done') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m,
            ),
          );
        } else if (event.type === 'error') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${event.message}`, streaming: false }
                : m,
            ),
          );
        }
      });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: err instanceof Error ? err.message : 'Request failed',
                streaming: false,
              }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }, [streaming]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="font-display text-3xl font-bold">Agricultural Knowledge</h2>
        <p className="text-gray-500 mt-1">
          Ask anything — answers draw from your uploaded documents and your farm history
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Chat panel */}
        <div className="flex flex-col gap-4">
          {/* Message thread */}
          <GlassCard className="p-4 flex flex-col min-h-[480px]">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
                <div className="w-16 h-16 rounded-2xl bg-moss-600/10 border border-moss-600/20 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-moss-400" />
                </div>
                <div className="text-center">
                  <p className="text-gray-300 font-medium">Ask AgriMind anything</p>
                  <p className="text-xs text-gray-500 mt-2 max-w-sm">
                    Your farm context and uploaded documents are automatically used to give you personalised answers
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full bg-earth-800/60 border border-earth-600 text-gray-400 hover:text-moss-400 hover:border-moss-600/30 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-2">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </GlassCard>

          {/* Input */}
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              className="input-field flex-1"
              placeholder="Ask about diseases, irrigation, fertilizers, pests…"
              disabled={streaming}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={streaming || !input.trim()}
              className="btn-primary px-5 flex items-center gap-2"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {messages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.slice(0, 3).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={streaming}
                  className="text-xs px-3 py-1.5 rounded-full bg-earth-800/50 border border-earth-600 text-gray-500 hover:text-moss-400 hover:border-moss-600/30 transition-all disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Document sidebar */}
        <GlassCard className="p-5">
          <DocumentPanel />
        </GlassCard>
      </div>
    </div>
  );
}

// ── History page (unchanged) ───────────────────────────────────────────────

export function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ['history'], queryFn: api.history });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold">Analysis History</h2>
        <p className="text-gray-500 mt-1">Past disease scans and predictions</p>
      </div>

      {isLoading ? (
        <GlassCard className="p-12 text-center text-gray-500">Loading history…</GlassCard>
      ) : !data?.length ? (
        <GlassCard className="p-12 text-center">
          <p className="text-gray-500">No analysis history yet</p>
          <p className="text-xs text-gray-600 mt-2">Run a crop scan to get started</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {data.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="agent-badge border text-moss-400">{item.agent}</span>
                    <p className="text-sm text-gray-300 mt-2">{item.input_summary}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                    {item.confidence && (
                      <p className="text-xs text-moss-400 mt-1">{item.confidence}% confidence</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
