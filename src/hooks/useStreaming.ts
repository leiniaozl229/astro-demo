import { useState, useCallback } from 'react';

interface UseStreamingOptions {
  speed?: number; // 每个字符的间隔毫秒
  onComplete?: () => void;
}

export function useStreaming({ speed = 30, onComplete }: UseStreamingOptions = {}) {
  const [streamingMessages, setStreamingMessages] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const startStreaming = useCallback(
    (fullContent: string, messageIndex: number) => {
      if (isStreaming) return;

      setIsStreaming(true);
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex >= fullContent.length) {
          clearInterval(interval);
          setIsStreaming(false);
          onComplete?.();
          return;
        }

        setStreamingMessages((prev) => {
          const newMessages = [...prev];
          // 每次增加 1-3 个字符，模拟更自然的流式效果
          const chunkSize = Math.floor(Math.random() * 3) + 1;
          const newContent = fullContent.slice(0, currentIndex + chunkSize);
          newMessages[messageIndex] = newContent;
          return newMessages;
        });

        currentIndex += chunkSize;
      }, speed);

      return () => clearInterval(interval);
    },
    [isStreaming, speed, onComplete]
  );

  const updateStreamingMessage = useCallback((messageIndex: number, content: string) => {
    setStreamingMessages((prev) => {
      const newMessages = [...prev];
      newMessages[messageIndex] = content;
      return newMessages;
    });
  }, []);

  const resetStreaming = useCallback(() => {
    setStreamingMessages([]);
    setIsStreaming(false);
  }, []);

  return {
    streamingMessages,
    isStreaming,
    startStreaming,
    updateStreamingMessage,
    resetStreaming,
  };
}
