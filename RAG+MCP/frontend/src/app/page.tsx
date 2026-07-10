'use client';
import Header from '@/components/Layout/Header';
import Sidebar from '@/components/Layout/Sidebar';
import ChatWindow from '@/components/Chat/ChatWindow';
import InputBar from '@/components/Chat/InputBar';
import DocumentPanel from '@/components/Documents/DocumentPanel';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/store/chatStore';

export default function Home() {
  const { currentMessages, isStreaming, sendMessage } = useChat();
  const { activeSessionId } = useChatStore();

  return (
    <div className="h-full flex flex-col bg-surface-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Chat History */}
        <Sidebar />

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow messages={currentMessages} isStreaming={isStreaming} />
          <InputBar
            onSend={sendMessage}
            isStreaming={isStreaming}
            disabled={false}
          />
        </main>

        {/* Right Panel — Documents */}
        <DocumentPanel />
      </div>
    </div>
  );
}
