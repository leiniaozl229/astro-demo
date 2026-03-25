import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useStreaming Hook 返回值类型定义
 */
export interface UseStreamingReturn {
  /** 当前已渲染到前端的内容（用户可见的部分） */
  displayContent: string;
  /** 是否正在流式输出中 */
  isStreaming: boolean;
  /** 是否处于暂停状态（通常在 STEP 执行时暂停） */
  isPaused: boolean;
  /** 已完成的 STEP 步骤记录，key 为步骤标题，value 为完成时间戳 */
  completedSteps: Map<string, number>;
  /** 开始流式输出指定内容 */
  startStream: (fullText: string) => void;
  /** 强制停止当前流式输出 */
  stopStream: () => void;
}

/**
 * ============================================================================
 * 高性能流式输出 Hook - 支持 STEP 标记停顿
 * ============================================================================
 *
 * 【使用场景】
 * 用于 AI Agent 对话场景，模拟真实的流式打字效果，让 AI 响应看起来更有节奏感。
 *
 * 【核心优化】
 * 1. 双 Buffer 机制    - 使用 Ref 作为写缓冲，定期同步到 State，避免频繁 setState 触发 Re-render
 * 2. 固定渲染频率     - 锁定约 20-33FPS，避免高频率渲染阻塞主线程
 * 3. 块处理          - 每次输出 2-5 个字符（而非单字符），减少定时器调用次数
 * 4. 节流更新        - 无论内容多长，渲染频率恒定，性能可控
 * 5. 智能速度        - 根据内容类型动态调整：长内容/代码块时加速，避免用户等待过久
 * 6. STEP 标记停顿   - 遇到 [STEP: xxx | loading] 时自动暂停 2-4 秒，模拟任务执行耗时
 *
 * 【工作流程】
 * startStream → 初始化状态 → 启动定时器 → 逐块输出内容 → 遇到 STEP 标记则暂停 → 继续输出 → 结束回调
 *
 * @param onFinished - 流式输出完成后的回调函数（可选）
 */
export const useStreaming = (onFinished?: () => void): UseStreamingReturn => {
  // ==================== State 定义 ====================
  /** 当前已渲染到前端的内容 */
  const [displayContent, setDisplayContent] = useState("");
  /** 是否正在流式输出中 */
  const [isStreaming, setIsStreaming] = useState(false);
  /** 是否处于暂停状态 */
  const [isPaused, setIsPaused] = useState(false);
  /** 已完成的 STEP 步骤记录（用于 UI 显示步骤完成状态） */
  const [completedSteps, setCompletedSteps] = useState<Map<string, number>>(new Map());

  // ==================== Ref 定义（不触发 Re-render） ====================
  /**
   * 核心：使用 Ref 作为写缓冲区
   * 原因：如果直接用 useState 存储累积内容，每次字符追加都会触发一次 Re-render
   * 解决：先在 Ref 中累积，通过定时器定期同步到 State，大幅减少渲染次数
   */
  const bufferRef = useRef("");

  /** 定时器 ID 引用，用于清理 */
  const timerRef = useRef<number | null>(null);

  /** 当前已处理的字符索引（指向原文本的位置） */
  const indexRef = useRef(0);

  /**
   * 暂停状态 Ref 副本
   * 原因：setInterval 回调形成闭包，直接读取 isPaused 会捕获旧值
   * 解决：使用 ref 保存最新状态，在 processQueue 中直接读取 isPausedRef.current
   */
  const isPausedRef = useRef(false);

  /**
   * 已触发过停顿的步骤集合
   * 用途：确保每个 STEP 标记只触发一次停顿，避免重复处理
   */
  const processedStepsRef = useRef(new Set<string>());

  /**
   * 已完成 STEP 的 Ref 副本
   * 原因：避免频繁调用 setCompletedSteps 导致 Re-render，先在 Ref 中累积
   */
  const completedStepsRef = useRef<Map<string, number>>(new Map());

  // ==================== 同步逻辑 ====================
  /**
   * 当 isPaused state 变化时，同步到 ref
   * 用途：确保 processQueue 能读取到最新的暂停状态
   */
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  /**
   * 使用 ref 保存 onFinished 回调
   * 原因：避免 startStream 因依赖 onFinished 而频繁重新创建
   * 效果：startStream 可以使用 useCallback 缓存，只创建一次
   */
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  // ==================== 配置参数 ====================
  /** 每次输出的字符数：值越小打字效果越细腻，但定时器调用更频繁 */
  const chunkSize = 2;
  /** 定时器间隔：值越小刷新越快，但可能影响性能 */
  const interval = 50;

  // ==================== 停止流式 ====================
  /**
   * 强制停止当前流式输出
   * 使用场景：用户切换对话、取消输出等场景
   */
  const stopStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsStreaming(false);
    setIsPaused(false);
  }, []);

  // ==================== 开始流式 ====================
  /**
   * 开始流式输出指定内容
   * @param text - 要流式输出的完整文本内容
   */
  const startStream = useCallback((text: string) => {
    if (!text) return;

    // 1. 清理之前的定时器（如果存在）
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // 2. 重置所有状态和缓冲区
    setIsStreaming(true);
    setIsPaused(false);
    setDisplayContent("");
    bufferRef.current = "";
    indexRef.current = 0;
    processedStepsRef.current = new Set<string>(); // 重置已处理步骤记录
    completedStepsRef.current = new Map(); // 重置已完成步骤记录
    setCompletedSteps(new Map());

    // 3. 智能速度调节：根据内容类型动态调整
    // 长内容时加快输出速度，避免用户等待过久
    const adaptiveInterval = text.length > 1000 ? 25 : interval;
    // 包含代码块时增加每次输出字符数，加快代码渲染速度
    const adaptiveChunkSize = text.includes('```') ? 5 : chunkSize;

    /**
     * 核心处理函数：每次定时器触发时执行
     * 负责：检查 STEP 标记、处理停顿、追加内容
     */
    const processQueue = () => {
      // 边界检查：如果已处理完所有内容或正在停顿，则跳过本次执行
      if (indexRef.current >= text.length || isPausedRef.current) {
        return;
      }

      // 获取剩余未处理的文本片段
      const remaining = text.slice(indexRef.current);

      /**
       * STEP 标记检测
       * 正则说明：
       * - [\s\S]*?  : 非贪婪匹配任意字符（包括换行符）
       * - [^\]|]+   : 匹配步骤标题，直到遇到 | 或 ]
       * - \s*\|\s*  : 匹配 | 分隔符（允许周围有空格）
       * - loading   : 匹配 loading 状态标记
       */
      const stepMatch = remaining.match(/[\s\S]*?\[STEP: ([^\]|]+)\s*\|\s*loading\]/);

      if (stepMatch) {
        const fullMatch = stepMatch[0];  // 完整匹配的文本（从当前位置到 loading 标记结束）
        const stepTitle = stepMatch[1].trim();  // 提取步骤标题

        // 检查该步骤是否已处理过（避免重复停顿）
        if (!processedStepsRef.current.has(stepTitle)) {
          // === 命中新步骤：执行停顿逻辑 ===

          // 1. 将内容渲染到 STEP 标记处（让用户看到步骤标签）
          const nextChunk = text.slice(indexRef.current, indexRef.current + fullMatch.length);
          bufferRef.current += nextChunk;
          indexRef.current += fullMatch.length;
          setDisplayContent(bufferRef.current);

          // 2. 标记该步骤已处理
          processedStepsRef.current.add(stepTitle);

          // 3. 进入暂停状态
          setIsPaused(true);
          isPausedRef.current = true; // 同步更新 ref（确保定时器能立即读取到）

          // 4. 模拟 2-4 秒的随机执行延迟（增加真实感）
          const delay = Math.floor(Math.random() * 2000) + 2000;
          setTimeout(() => {
            // 延迟结束后恢复
            setIsPaused(false);
            isPausedRef.current = false; // 同步更新 ref

            // 5. 记录 STEP 完成时间（用于 UI 显示步骤完成状态）
            completedStepsRef.current.set(stepTitle, Date.now());
            setCompletedSteps(new Map(completedStepsRef.current));
          }, delay);

          // 本次不继续输出，等待停顿结束
          return;
        }
      }

      // === 正常输出逻辑：追加下一块内容 ===
      const nextChunk = text.slice(indexRef.current, indexRef.current + adaptiveChunkSize);
      bufferRef.current += nextChunk;
      indexRef.current += adaptiveChunkSize;
      setDisplayContent(bufferRef.current);
    };

    // 4. 启动定时器，开始流式输出
    timerRef.current = window.setInterval(() => {
      // 情况 1：正常输出中 → 继续处理
      if (!isPausedRef.current && indexRef.current < text.length) {
        processQueue();
      }
      // 情况 2：已输出完所有内容且不在停顿中 → 结束流式
      else if (indexRef.current >= text.length && !isPausedRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsStreaming(false);
        // 触发完成回调（使用 ref 避免闭包问题）
        onFinishedRef.current?.();
      }
      // 情况 3：正在停顿中 → 等待 setTimeout 结束后自动恢复
    }, adaptiveInterval);
  }, []);

  // ==================== 清理逻辑 ====================
  /**
   * 组件卸载时清理定时器
   * 原因：防止组件销毁后定时器仍在运行，导致内存泄漏或状态更新到已卸载组件
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // ==================== 返回 Hook API ====================
  return { displayContent, isStreaming, isPaused, completedSteps, startStream, stopStream };
};
