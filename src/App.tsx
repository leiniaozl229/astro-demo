import { useState, useEffect, useRef } from 'react';
import { Message } from './types/chat';
import { Sidebar } from './components/layout/Sidebar';
import { ChatMessage } from './components/chat/ChatMessage';
import { ChatInput } from './components/chat/ChatInput';
import { loadAllMockResponses, MockResponse } from './mock/mockLoader';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mockResponses, setMockResponses] = useState<Omit<Message, 'isStreaming'>[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载 mock 数据
  useEffect(() => {
    loadAllMockResponses().then((responses) => {
      setMockResponses(responses as Omit<Message, 'isStreaming'>[]);
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // 立即添加空的 assistant 消息
    setMessages((prev) => [
      ...prev,
      {
        ...response,
        isStreaming: true,
        content: '',
      },
    ]);

    // 流式输出内容
    const fullContent = response.content;
    const contentLength = fullContent.length;
    let currentIndex = 0;

    // 根据内容长度动态调整 chunk 大小和时间间隔
    // 长内容使用更大的 chunk 和更短的间隔，保持总体速度稳定
    const getChunkSize = () => {
      const remaining = contentLength - currentIndex;
      if (remaining > 500) return Math.floor(Math.random() * 15) + 10;  // 长内容：10-25 字
      if (remaining > 200) return Math.floor(Math.random() * 8) + 5;    // 中等内容：5-13 字
      return Math.floor(Math.random() * 3) + 1;                          // 短内容：1-3 字
    };

    const getInterval = () => {
      const remaining = contentLength - currentIndex;
      if (remaining > 500) return 15;   // 长内容：15ms
      if (remaining > 200) return 20;   // 中等内容：20ms
      return 30;                         // 短内容：30ms
    };

    const stream = () => {
      if (currentIndex >= fullContent.length) {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            ...response,
            isStreaming: false,
          };
          return newMessages;
        });
        setIsStreaming(false);
        setCurrentResponseIndex((prev) => prev + 1);
        return;
      }

      const chunkSize = getChunkSize();
      currentIndex = Math.min(currentIndex + chunkSize, fullContent.length);

      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...response,
          content: fullContent.slice(0, currentIndex),
          isStreaming: true,
        };
        return newMessages;
      });

      // 使用 requestAnimationFrame 获得更好的性能
      setTimeout(() => {
        requestAnimationFrame(stream);
      }, getInterval());
    };

    requestAnimationFrame(stream);
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
