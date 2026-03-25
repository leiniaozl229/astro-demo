
# 方案文档：AI 流式输出的“步骤执行”停顿与平滑渲染优化

## 1. 核心需求描述
在 AI 助手回复过程中，当文本流（Stream）中出现 `[STEP: 标题 | loading]` 标记时，前端渲染需要：
1. **暂停打字机效果**：停止后续文本的渲染显示。
2. **模拟执行耗时**：保持 `STEP` 组件的 Loading 动画，随机持续 2-4 秒。
3. **平滑恢复**：等待结束后，继续以打字机节奏渲染后续缓冲区内容。
4. **性能保障**：避免 ReactMarkdown 因为高频更新导致的组件闪烁或性能抖动。

---

## 2. 整体架构设计



采用 **“生产者-消费者”** 模型：
* **生产者**：后端 SSE/WebSocket 流，不断将原始文本推入 `rawContent`。
* **缓冲区 (Buffer)**：保存所有已接收但尚未显示的文本。
* **消费者 (SmoothStream Hook)**：按照固定频率（约 30ms）从缓冲区提取字符并更新 UI，遇到特定标签时触发异步阻塞。

---

## 3. 核心代码实现

### A. 逻辑控制器：`useSmoothStream` Hook
这个 Hook 是整个方案的“大脑”，负责节奏控制和停顿拦截。

```tsx
import { useState, useEffect, useRef } from 'react';

export function useSmoothStream(rawContent: string, isStreaming: boolean) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  
  const bufferRef = useRef('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processedSteps = useRef(new Set<string>()); // 记录已触发过停顿的步骤

  useEffect(() => {
    bufferRef.current = rawContent;
  }, [rawContent]);

  useEffect(() => {
    const processQueue = () => {
      // 1. 如果已追平进度或正在停顿，则停止执行
      if (displayedContent.length >= bufferRef.current.length || isPaused) {
        return;
      }

      const currentLen = displayedContent.length;
      // 2. 检查即将渲染的片段中是否包含 loading 标记
      const remaining = bufferRef.current.slice(currentLen);
      const stepMatch = remaining.match(/^.*?\[STEP: ([^\]|]+)\s*\|\s*loading\]/);

      if (stepMatch) {
        const fullMatch = stepMatch[0];
        const stepTitle = stepMatch[1].trim();

        if (!processedSteps.current.has(stepTitle)) {
          // 命中新步骤：先渲染到标记处，然后停顿
          setDisplayedContent(bufferRef.current.slice(0, currentLen + fullMatch.length));
          setIsPaused(true);
          processedSteps.current.add(stepTitle);

          // 模拟 2-4 秒的随机执行延迟
          const delay = Math.floor(Math.random() * 2000) + 2000;
          setTimeout(() => setIsPaused(false), delay);
          return;
        }
      }

      // 3. 正常打字效果输出（步长设为 5-8 字符增加流畅度）
      const stepSize = remaining.startsWith('\n') ? 1 : 8;
      setDisplayedContent(bufferRef.current.slice(0, currentLen + stepSize));
    };

    if (!isPaused && (displayedContent.length < bufferRef.current.length || isStreaming)) {
      timerRef.current = setTimeout(processQueue, 30);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [displayedContent, isPaused, isStreaming]);

  return { displayedContent, isPaused };
}
```

---

### B. UI 渲染层：`MessageRenderer` 性能优化
为了配合高频更新，我们需要优化 `ReactMarkdown` 的配置。

```tsx
// 1. 将 SQL 代码块抽离为独立组件，避免重复创建
const SqlBlock = React.memo(({ code, isCopied, onCopy }: any) => (
  <div className="my-3 border rounded-lg overflow-hidden bg-white">
    <div className="flex justify-between px-4 py-2 bg-gray-50 border-b text-xs text-gray-500 font-medium">
      <span>SQL</span>
      <button onClick={() => onCopy(code)} className="hover:text-blue-500">
        {isCopied ? '已复制' : '复制'}
      </button>
    </div>
    <SyntaxHighlighter language="sql" style={oneLight} customStyle={{ padding: '16px', fontSize: '12px' }}>
      {code}
    </SyntaxHighlighter>
  </div>
));

export const MessageRenderer = React.memo(({ content, onConfirm, isStreaming }: any) => {
  // 解析逻辑保持不变，但增加对未闭合标签的清理
  const { steps, text, confirmText, requirementData } = React.useMemo(() => {
    // 增加正则处理，防止末尾出现半截标签 [STEP: ...
    const cleanContent = content.replace(/\[[A-Z]+:?[^\]]*$/g, '');
    return parseContent(cleanContent);
  }, [content]);

  // 使用稳定的 components 配置
  const markdownComponents = React.useMemo(() => ({
    code: (props: any) => {
      /* 使用上文提及的 SqlBlock */
      if (!props.inline && props.className?.includes('language-sql')) {
        return <SqlBlock code={String(props.children)} />;
      }
      return <code {...props} />;
    },
    // 其他 h4, p, ul 保持原样...
  }), []);

  return (
    <div className="space-y-3 relative">
      {/* 渲染 Steps */}
      {steps.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-in fade-in">
          {steps.map((s, i) => <AgentStep key={i} {...s} />)}
        </div>
      )}

      {/* 渲染正文 + 打字机光标 */}
      {text && (
        <div className="prose prose-sm max-w-none relative">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {text}
          </ReactMarkdown>
          {(isStreaming) && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
          )}
        </div>
      )}
      
      {/* 确认卡片和按钮逻辑... */}
    </div>
  );
});
```

---

## 4. 关键改进点总结

1.  **语法敏感度**：通过 `remaining.match` 确保停顿点精确落在 `[STEP]` 标签结束位置，不会在文本中间突兀停止。
2.  **状态隔离**：使用 `processedSteps` 确保同一步骤不会因为组件重绘或流式重连而反复触发 loading。
3.  **视觉补丁**：
    * **光标 (Caret)**：在 `text` 结尾处手动添加 `animate-pulse` 的小方块，增强“AI 正在思考”的代入感。
    * **平滑截断**：在 `parseContent` 前清理掉末尾不完整的 `[` 标签，防止 Markdown 将其误认为普通文本。
4.  **性能优化**：将 Markdown 的子组件（如 `SqlBlock`）外部化并使用 `React.memo`，极大减少高频更新时的 CPU 占用。

---

## 5. 给 Claude 的操作建议
当您将此代码同步到项目中时，请确保：
* **AgentStep 组件**：已处理 `status="loading"` 时的动画（例如旋转图标）。
* **容器高度**：对话列表容器建议开启 `scroll-behavior: smooth`，以配合打字机节奏。

**您现在可以直接把这段方案粘贴给您的 Claude Code 或 Cursor。** 还需要我在某个特定环节（比如处理多个并发步骤的逻辑）进行更深度的重构吗？