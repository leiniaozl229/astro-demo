import { useState, useEffect, useRef } from 'react';
import { Message } from './types/chat';
import { Sidebar } from './components/layout/Sidebar';
import { ChatMessage } from './components/chat/ChatMessage';
import { ChatInput } from './components/chat/ChatInput';
import { loadAllMockResponses, MockResponse } from './mock/mockLoader';
import { useStreaming } from './hooks/useStreaming';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mockResponses, setMockResponses] = useState<Omit<Message, 'isStreaming'>[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMessageIndexRef = useRef<number>(-1);

  // 加载 mock 数据
  useEffect(() => {
    loadAllMockResponses().then((responses) => {
      setMockResponses(responses as Omit<Message, 'isStreaming'>[]);
    });
  }, []);

  // 流式输出完成回调
  const handleStreamComplete = () => {
    setMessages((prev) => {
      const newMessages = [...prev];
      const idx = currentMessageIndexRef.current;
      if (idx >= 0 && newMessages[idx]) {
        newMessages[idx] = { ...newMessages[idx], isStreaming: false };
      }
      return newMessages;
    });
    setIsStreaming(false);
    setCurrentResponseIndex((prev) => prev + 1);
  };

  const { displayContent, isStreaming: hookStreaming, startStream } = useStreaming(handleStreamComplete);

  // 监听流式内容变化，更新消息
  useEffect(() => {
    if (displayContent && currentMessageIndexRef.current >= 0) {
      setMessages((prev) => {
        const newMessages = [...prev];
        const idx = currentMessageIndexRef.current;
        if (newMessages[idx]) {
          newMessages[idx] = { ...newMessages[idx], content: displayContent, isStreaming: true };
        }
        return newMessages;
      });
    }
  }, [displayContent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayContent]);

  // 发送用户消息并触发 assistant 回复
  const handleSendMessage = (userInput: string) => {
    if (!userInput.trim() || isStreaming) return;

    // 添加用户消息
    const userMessage: Message = {
      role: 'user',
      content: userInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    // 获取当前应该使用的回复
    const responseIndex = currentResponseIndex;
    const response = mockResponses[responseIndex % mockResponses.length];
    const newMessageIndex = messages.length;
    currentMessageIndexRef.current = newMessageIndex;

    // 立即添加空的 assistant 消息
    setMessages((prev) => [
      ...prev,
      {
        ...response,
        isStreaming: true,
        content: '',
      },
    ]);

    // 使用 useStreaming hook 开始流式输出
    startStream(response.content);
  };

  // 确认执行按钮处理
  const handleConfirm = () => {
    if (isStreaming) return;
    handleSendMessage('确认执行数据资产建设方案');
  };

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
              <ChatMessage
                key={index}
                message={message}
                index={index}
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
