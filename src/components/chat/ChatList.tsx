import { Message } from '../types/chat';
import { ChatMessage } from './ChatMessage';

interface ChatListProps {
  messages: Message[];
  onMessageComplete?: (index: number) => void;
  onConfirm?: () => void;
}

export function ChatList({ messages, onMessageComplete, onConfirm }: ChatListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-6">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message}
            index={index}
            onMessageComplete={() => onMessageComplete?.(index)}
            onConfirm={onConfirm}
          />
        ))}
      </div>
    </div>
  );
}
