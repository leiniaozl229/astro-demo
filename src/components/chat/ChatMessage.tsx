import React from 'react';
import { Message } from '../types/chat';
import { User, ThumbsUp, ThumbsDown, RotateCcw, Copy } from 'lucide-react';
import { MessageRenderer } from './MessageRenderer';
import { cn } from '../../utils/cn';
import astroLogo from '../../assets/astro-logo.svg';

interface ChatMessageProps {
  message: Message;
  index: number;
  onMessageComplete?: () => void;
  onConfirm?: () => void;
}

export const ChatMessage = React.memo(function ChatMessage({ message, index, onMessageComplete, onConfirm }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* 头像 */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden',
          isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-transparent'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <img src={astroLogo} alt="Astro" className="w-full h-full" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn('flex-1 min-w-0', isUser ? 'flex flex-col items-end' : '')}>
        {/* 名字和时间 */}
        <div className={cn('flex items-center gap-2 mb-1', isUser ? 'flex-row-reverse' : '')}>
          <span className="text-sm font-medium text-gray-700">
            {isUser ? '您' : 'PlanManager'}
          </span>
        </div>

        {/* 消息气泡 */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 mb-2',
            isUser
              ? 'bg-white border border-blue-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-gray-800'
              : 'bg-white border border-gray-200'
          )}
        >
          {isUser ? (
            <p className="text-sm text-gray-800">{message.content}</p>
          ) : (
            <div className="text-sm text-gray-700">
              <MessageRenderer content={message.content} onConfirm={onConfirm} />
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 只有当消息内容变化或流式状态变化时才重新渲染
  return prevProps.message.content === nextProps.message.content &&
    prevProps.message.isStreaming === nextProps.message.isStreaming;
});
