export interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export type StepStatus = 'success' | 'loading' | 'pending';
