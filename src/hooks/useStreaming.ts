import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseStreamingReturn {
  displayContent: string;
  isStreaming: boolean;
  startStream: (fullText: string) => Promise<void>;
  stopStream: () => void;
}

/**
 * 高性能流式输出 Hook
 *
 * 核心优化：
 * 1. 双 Buffer 机制 - 使用 Ref 缓冲区，避免频繁 setState
 * 2. 固定渲染频率 - 锁定约 40FPS (24ms)，避免渲染阻塞
 * 3. 块处理 - 每次输出 5 个字符，减少解析开销
 * 4. 节流更新 - 无论内容多长，渲染频率恒定
 */
export const useStreaming = (onFinished?: () => void): UseStreamingReturn => {
  const [displayContent, setDisplayContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // 核心：使用 Ref 作为缓冲区，避免 Ref 变化触发 Re-render
  const bufferRef = useRef("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback((fullText: string) => {
    return new Promise<void>((resolve) => {
      // 清理之前的定时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setIsStreaming(true);
      setDisplayContent("");
      bufferRef.current = "";

      let index = 0;
      const chunkSize = 5; // 每次追加的字符数 - 增加此值可加速感官速度
      const interval = 24; // 节流频率（毫秒）- 约 40FPS，肉眼舒适的极限

      timerRef.current = setInterval(() => {
        if (index < fullText.length) {
          // 1. 将新字符压入缓冲区
          const nextChunk = fullText.slice(index, index + chunkSize);
          bufferRef.current += nextChunk;
          index += chunkSize;

          // 2. 节流更新：只在此处触发一次 React 渲染
          // 无论 fullText 有多长，React 的渲染频率都是恒定的
          setDisplayContent(bufferRef.current);
        } else {
          // 结束流
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setIsStreaming(false);
          onFinished?.();
          resolve();
        }
      }, interval);
    });
  }, [onFinished]);

  // 清理逻辑 - 防止组件销毁后定时器还在跑
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return { displayContent, isStreaming, startStream, stopStream };
};
