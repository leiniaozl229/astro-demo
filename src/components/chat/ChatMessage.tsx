import React, { useEffect, useMemo } from 'react';
import { User, ThumbsUp, ThumbsDown, RotateCcw, Copy } from 'lucide-react';
import { Message } from '../../types/chat';
import { MessageRenderer } from './MessageRenderer';
import { cn } from '../../utils/cn';
import { useStreaming } from '../../hooks/useStreaming';
import astroLogo from '../../assets/astro-logo.svg';

interface ChatMessageProps {
  message: Message;
  index: number;
  onMessageComplete?: () => void;
  onConfirm?: () => void;
}

// 操作按钮组件 - 独立 memo 避免不必要的重渲染
const ActionButtons = React.memo(function ActionButtons() {
  return (
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
  );
});

export function ChatMessage({ message, index, onMessageComplete, onConfirm }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // 每条消息自己管理自己的流式状态
  const { displayContent, isStreaming, isPaused, completedSteps, startStream } = useStreaming(onMessageComplete);

  // 当消息内容变化时（新消息创建），启动流式
  useEffect(() => {
    if (!isUser && message.content && message.isStreaming) {
      // 每次 message.content 变化时都重新启动流式
      startStream(message.content);
    }
  }, [message.content, message.isStreaming, isUser]);

  // 流式期间使用 displayContent，完成后使用完整 content
  const displayText = isStreaming ? displayContent : message.content;

  // 使用 useMemo 缓存用户消息的内容渲染 - 必须在任何提前返回之前调用
  const userContent = useMemo(() => (
    <p className="text-sm text-gray-800">{message.content}</p>
  ), [message.content]);

  // 如果正在流式但还没有内容，不渲染
  if (!isUser && message.isStreaming && isStreaming && !displayContent) {
    return null;
  }

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
            userContent
          ) : (
            <div className="text-sm text-gray-700">
              <MessageRenderer
                content={displayText}
                fullContent={message.content}
                onConfirm={onConfirm}
                isStreaming={isStreaming}
                completedSteps={completedSteps}
              />
            </div>
          )}
        </div>

        {/* 操作按钮 - 只在流式完成后显示 */}
        {!isUser && !isStreaming && <ActionButtons />}
      </div>
    </div>
  );
}
