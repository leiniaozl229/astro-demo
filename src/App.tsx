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
  const triggeredIndexRef = useRef<number>(-1); // 记录已触发自动播放的消息索引，避免重复

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
      // 逻辑：第 1、2 条由用户消息触发，第 3 条开始自动连续输出
      const lastMessage = newMessages[newMessages.length - 1];
      const messagesCount = newMessages.length;

      // 只在最后一条消息是 assistant 且刚完成流式时触发
      if (lastMessage.role === 'assistant' && !lastMessage.isStreaming) {
        // 计算当前是第几条 assistant 消息
        const assistantIndex = newMessages.filter(m => m.role === 'assistant').length - 1;

        // 从第 3 条开始（索引 2）自动触发后续消息，且不能重复触发
        if (assistantIndex >= 2 && assistantIndex < mockResponses.length && triggeredIndexRef.current !== assistantIndex) {
          // 标记已触发
          triggeredIndexRef.current = assistantIndex;

          // 固定延迟 800ms
          setTimeout(() => {
            const nextIndex = assistantIndex + 1;
            if (nextIndex < mockResponses.length) {
              setMessages((prevMessages) => [
                ...prevMessages,
                { ...mockResponses[nextIndex], isStreaming: true },
              ]);
            }
          }, 800);
        }
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
