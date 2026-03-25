import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from './types/chat';
import { Sidebar } from './components/layout/Sidebar';
import { ChatMessage } from './components/chat/ChatMessage';
import { ChatInput } from './components/chat/ChatInput';
import { loadAllMockResponses } from './mock/mockLoader';
import { cn } from './utils/cn';

// 优化的历史消息组件 - 使用 memo 避免流式期间重渲染
const HistoryMessage = React.memo(function HistoryMessage({
  message,
  index,
  onMessageComplete,
  onConfirm
}: {
  message: Message;
  index: number;
  onMessageComplete?: () => void;
  onConfirm?: () => void;
}) {
  return (
    <ChatMessage
      message={message}
      index={index}
      onMessageComplete={onMessageComplete}
      onConfirm={onConfirm}
    />
  );
}, (prev, next) => {
  // 只有当消息内容或流式状态变化时才重新渲染
  // 这确保历史消息在流式期间不会被重渲染
  return (
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming
  );
});

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [mockResponses, setMockResponses] = useState<Omit<Message, 'isStreaming'>[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamTick, setStreamTick] = useState(0); // 用于流式期间触发滚动
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载 mock 数据
  useEffect(() => {
    loadAllMockResponses().then((responses) => {
      setMockResponses(responses as Omit<Message, 'isStreaming'>[]);
    });
  }, []);

  // 监听消息变化，更新 streaming 状态
  useEffect(() => {
    const hasStreaming = messages.some(m => m.isStreaming);
    setIsStreaming(hasStreaming);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 监听 messages 和 isStreaming 状态，实现自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, streamTick]);

  // 流式期间定期触发滚动
  useEffect(() => {
    if (isStreaming) {
      const timer = setInterval(() => {
        setStreamTick(prev => prev + 1);
      }, 300); // 每 300ms 触发一次滚动
      return () => clearInterval(timer);
    }
  }, [isStreaming]);

  // 流式完成回调
  const handleStreamComplete = useCallback(() => {
    setMessages((prev) => {
      const newMessages = prev.map(m =>
        m.isStreaming ? { ...m, isStreaming: false } : m
      );

      // 检查是否需要在流式完成后自动触发下一条回复
      // 例如：第 1 条消息（planner）完成后，自动触发第 2 条（discovery）
      const lastMessage = newMessages[newMessages.length - 1];
      const lastIndex = newMessages.length - 1;

      // 如果是第 1 条消息（索引 0）流式完成，自动触发第 2 条
      if (lastIndex === 0 && lastMessage.role === 'assistant') {
        // 延迟 500ms 后自动触发下一条
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { role: 'user' as const, content: '好的，请继续' },
            { ...mockResponses[1 % mockResponses.length], isStreaming: true },
          ]);
          setCurrentResponseIndex((prev) => prev + 1);
        }, 500);
      }

      return newMessages;
    });
  }, [mockResponses]);

  // 发送用户消息并触发 assistant 回复
  const handleSendMessage = (userInput: string) => {
    if (!userInput.trim()) return;

    // 获取当前应该使用的回复
    const response = mockResponses[currentResponseIndex % mockResponses.length];

    // 添加用户消息和 assistant 消息
    setMessages((prev) => [
      ...prev,
      { role: 'user' as const, content: userInput },
      { ...response, isStreaming: true },
    ]);

    setCurrentResponseIndex((prev) => prev + 1);
  };

  // 确认执行按钮处理
  const handleConfirm = useCallback(() => {
    handleSendMessage('确认执行数据资产建设方案');
  }, [handleSendMessage]);

  return (
    <div className="h-screen flex bg-[#f5f7fa]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部标题栏 */}
        <div className="px-6 py-3">
          <h1 className="text-base font-semibold text-gray-700">建设 DAU 数据资产</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-6">
            {messages.map((message, index) => (
              <HistoryMessage
                key={index}
                message={message}
                index={index}
                onMessageComplete={handleStreamComplete}
                onConfirm={handleConfirm}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <ChatInput disabled={isStreaming} onSend={handleSendMessage} />
      </div>
    </div>
  );
}
