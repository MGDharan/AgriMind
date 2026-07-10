export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Document {
  id: string;
  name: string;
  original_name: string;
  file_type: string;
  size: number;
  chunk_count: number;
  status: DocumentStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  doc_id: string;
  doc_name: string;
  chunk_text: string;
  score: number;
  chunk_index: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  created_at: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatRequest {
  session_id?: string;
  messages: { role: string; content: string }[];
  top_k?: number;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}
