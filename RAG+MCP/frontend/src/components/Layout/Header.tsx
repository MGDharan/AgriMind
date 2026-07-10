'use client';
import { Brain, PanelLeftClose, PanelLeftOpen, FolderOpen } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';

export default function Header() {
  const { sidebarOpen, setSidebarOpen, docPanelOpen, setDocPanelOpen } = useChatStore();

  return (
    <header className="h-14 glass border-b border-surface-600 flex items-center px-4 gap-3 shrink-0 z-10">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 rounded-lg hover:bg-surface-600 transition-colors focus-ring text-slate-400 hover:text-slate-200"
        title="Toggle sidebar"
      >
        {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Brain size={14} className="text-white" />
        </div>
        <span className="font-semibold text-sm gradient-text">RAG Chatbot</span>
      </div>

      <div className="flex-1" />

      <button
        onClick={() => setDocPanelOpen(!docPanelOpen)}
        className="p-2 rounded-lg hover:bg-surface-600 transition-colors focus-ring text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs font-medium"
        title="Toggle document panel"
      >
        <FolderOpen size={15} />
        <span className="hidden sm:inline">Documents</span>
      </button>
    </header>
  );
}
