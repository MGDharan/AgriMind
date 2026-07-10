import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'RAG Chatbot — Local AI Knowledge Base',
  description:
    'A production-ready RAG chatbot powered by Ollama, Qdrant, and local LLMs. Chat with your documents privately.',
  keywords: ['RAG', 'chatbot', 'Ollama', 'local AI', 'document Q&A'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-surface-900 text-slate-200 antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#151b30',
              color: '#e2e8f0',
              border: '1px solid #2e3a6b',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#6089ff', secondary: '#0a0d1a' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#0a0d1a' } },
          }}
        />
      </body>
    </html>
  );
}
