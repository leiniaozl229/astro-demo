import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseStreamingReturn {
  displayContent: string;
  isStreaming: boolean;
  isPaused: boolean;
  completedSteps: Map<string, number>; // 记录已完成的 STEP 标题和完成时间
  startStream: (fullText: string) => void;
  stopStream: () => void;
}

/**
 * 高性能流式输出 Hook - 支持 STEP 标记停顿
 *
 * 核心优化：
 * 1. 双 Buffer 机制 - 使用 Ref 缓冲区，避免频繁 setState
 * 2. 固定渲染频率 - 锁定约 33FPS (30ms)，避免渲染阻塞
 * 3. 块处理 - 每次输出 3-5 个字符，减少解析开销
 * 4. 节流更新 - 无论内容多长，渲染频率恒定
 * 5. 智能速度 - 根据内容类型动态调整速度（代码块加速）
 * 6. STEP 标记停顿 - 遇到 [STEP: xxx | loading] 时暂停 2-4 秒，模拟执行耗时
 */
export const useStreaming = (onFinished?: () => void): UseStreamingReturn => {
  const [displayContent, setDisplayContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Map<string, number>>(new Map());

  // 核心：使用 Ref 作为缓冲区，避免 Ref 变化触发 Re-render
  const bufferRef = useRef("");
  const timerRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const isPausedRef = useRef(false); // 使用 ref 保存 pause 状态，避免闭包问题
  const processedStepsRef = useRef(new Set<string>()); // 记录已触发过停顿的步骤
  const completedStepsRef = useRef<Map<string, number>>(new Map()); // 记录已完成的 STEP

  // 同步 ref 和 state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // 使用 ref 保存 onFinished 回调，避免 startStream 频繁重新创建
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const chunkSize = 2; // 每次追加的字符数 - 减小使流式更平滑
  const interval = 50; // 节流频率（毫秒）- 稍慢的速度让打字效果更清晰

  const stopStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsStreaming(false);
    setIsPaused(false);
  }, []);

  const startStream = useCallback((text: string) => {
    if (!text) return;

    // 清理之前的定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsStreaming(true);
    setIsPaused(false);
    setDisplayContent("");
    bufferRef.current = "";
    indexRef.current = 0;
    processedStepsRef.current = new Set<string>(); // 重置已处理步骤
    completedStepsRef.current = new Map(); // 重置已完成步骤
    setCompletedSteps(new Map());

    // 根据内容长度智能调整速度
    // 长内容时略微加快，避免用户等待过久
    const adaptiveInterval = text.length > 1000 ? 25 : interval;
    const adaptiveChunkSize = text.includes('```') ? 5 : chunkSize; // 代码块时加快速度

    const processQueue = () => {
      // 如果已追平进度或正在停顿，则停止执行
      if (indexRef.current >= text.length || isPausedRef.current) {
        return;
      }

      const remaining = text.slice(indexRef.current);

      // 检查即将渲染的片段中是否包含 loading 标记
      // 使用 [\s\S]*? 替代 ^.*? 来匹配换行符
      const stepMatch = remaining.match(/[\s\S]*?\[STEP: ([^\]|]+)\s*\|\s*loading\]/);

      if (stepMatch) {
        const fullMatch = stepMatch[0];
        const stepTitle = stepMatch[1].trim();

        if (!processedStepsRef.current.has(stepTitle)) {
          // 命中新步骤：先渲染到标记处，然后停顿
          const nextChunk = text.slice(indexRef.current, indexRef.current + fullMatch.length);
          bufferRef.current += nextChunk;
          indexRef.current += fullMatch.length;
          setDisplayContent(bufferRef.current);

          processedStepsRef.current.add(stepTitle);
          setIsPaused(true);
          isPausedRef.current = true; // 立即同步 ref

          // 模拟 2-4 秒的随机执行延迟
          const delay = Math.floor(Math.random() * 2000) + 2000;
          setTimeout(() => {
            setIsPaused(false);
            isPausedRef.current = false; // 立即同步 ref
            // 记录 STEP 完成时间
            completedStepsRef.current.set(stepTitle, Date.now());
            setCompletedSteps(new Map(completedStepsRef.current));
          }, delay);
          return;
        }
      }

      // 正常打字效果输出
      const nextChunk = text.slice(indexRef.current, indexRef.current + adaptiveChunkSize);
      bufferRef.current += nextChunk;
      indexRef.current += adaptiveChunkSize;
      setDisplayContent(bufferRef.current);
    };

    timerRef.current = window.setInterval(() => {
      if (!isPausedRef.current && indexRef.current < text.length) {
        processQueue();
      } else if (indexRef.current >= text.length && !isPausedRef.current) {
        // 结束流
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsStreaming(false);
        // 使用 ref 调用最新的 onFinished 回调
        onFinishedRef.current?.();
      }
    }, adaptiveInterval);
  }, []);

  // 清理逻辑 - 防止组件销毁后定时器还在跑
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { displayContent, isStreaming, isPaused, completedSteps, startStream, stopStream };
};
