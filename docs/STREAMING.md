# 流式输出渲染逻辑详解

## 整体架构

```
用户发送消息
    ↓
App.tsx handleSendMessage()
    ↓
添加 assistant 消息 (isStreaming: true)
    ↓
ChatMessage 组件
    ↓
useStreaming Hook (startStream)
    ↓
MessageRenderer 组件
    ↓
ReactMarkdown 渲染
```

## 数据流

### 1. App.tsx - 消息管理
```typescript
// 添加用户消息和 assistant 消息
setMessages((prev) => [
  ...prev,
  { role: 'user', content: userInput },
  { ...response, isStreaming: true },  // 关键：isStreaming 标记
]);
```

### 2. ChatMessage.tsx - 流式状态管理
```typescript
// 每条消息自己管理自己的流式状态
const { displayContent, isStreaming, completedSteps, startStream } = useStreaming();

// 当消息内容变化时，启动流式
useEffect(() => {
  if (!isUser && message.content && message.isStreaming) {
    startStream(message.content);
  }
}, [message.content, message.isStreaming]);

// 流式期间使用 displayContent，完成后使用完整 content
const displayText = isStreaming ? displayContent : message.content;
```

### 3. useStreaming.ts - 核心流式逻辑

#### 3.1 状态管理
```typescript
// Ref 缓冲区（避免频繁 setState）
const bufferRef = useRef("");
const indexRef = useRef(0);  // 当前输出位置
const timerRef = useRef<number | null>(null);

// State
const [displayContent, setDisplayContent] = useState("");
const [isStreaming, setIsStreaming] = useState(false);
const [completedSteps, setCompletedSteps] = useState<Map<string, number>>(new Map());
```

#### 3.2 流式启动
```typescript
const startStream = useCallback((text: string) => {
  setIsStreaming(true);
  setDisplayContent("");
  bufferRef.current = "";
  indexRef.current = 0;

  // 定时器开始输出
  timerRef.current = window.setInterval(() => {
    if (!isPausedRef.current && indexRef.current < text.length) {
      processQueue();
    }
  }, adaptiveInterval);  // 50ms
}, []);
```

#### 3.3 块处理逻辑
```typescript
const processQueue = () => {
  // 每次输出 2 个字符（chunkSize = 2）
  const nextChunk = text.slice(indexRef.current, indexRef.current + 2);
  bufferRef.current += nextChunk;
  indexRef.current += 2;
  setDisplayContent(bufferRef.current);
};
```

#### 3.4 STEP 停顿机制
```typescript
// 检查是否遇到 loading 标记
const stepMatch = remaining.match(/[\s\S]*?\[STEP: ([^\]|]+)\s*\|\s*loading\]/);

if (stepMatch && !processedStepsRef.current.has(stepTitle)) {
  // 渲染到标记处
  const nextChunk = text.slice(indexRef.current, indexRef.current + fullMatch.length);
  bufferRef.current += nextChunk;
  indexRef.current += fullMatch.length;
  setDisplayContent(bufferRef.current);

  // 停顿 2-4 秒
  setIsPaused(true);
  setTimeout(() => {
    setIsPaused(false);
    completedStepsRef.current.set(stepTitle, Date.now());
    setCompletedSteps(new Map(completedStepsRef.current));
  }, delay);
  return;
}
```

### 4. MessageRenderer.tsx - 内容解析

#### 4.1 内容预处理
```typescript
// 流式期间清理未闭合的标签
const cleanContent = isStreaming
  ? content.replace(/\[[A-Z]+:?[^\]]*$/g, '')
  : content;

// 解析 STEP 标记，移除 | 状态 部分
const { text, steps } = parseContent(cleanContent);
```

#### 4.2 parseContent 函数
```typescript
function parseContent(content: string): ParsedData {
  const steps: { title: string; status: string | null }[] = [];
  let text = content;

  // 将 [STEP: 标题 | 状态] 替换为 [STEP: 标题]
  text = text.replace(stepRegex, (fullMatch, title, status) => {
    steps.push({ title: title.trim(), status });
    return `[STEP: ${title.trim()}]`;  // 移除 | 状态
  });

  return { steps, text };
}
```

#### 4.3 Markdown 组件拦截
```typescript
const markdownComponents = useMemo(() => ({
  // 拦截段落中的 STEP 标记
  p({ children }: any) {
    const childStr = String(children);
    const stepMatch = childStr.match(/\[STEP: ([^\]]+)\]/);

    if (stepMatch) {
      // 从 steps 数组中查找状态
      const stepInfo = steps.find(s => s.title === stepMatch[1]);
      const stepStatus = stepInfo?.status
        ? (completedSteps?.has(stepInfo.title) ? 'success' : stepInfo.status)
        : 'pending';

      // 分割文本并渲染
      const parts = childStr.split(/\[STEP: [^\]]+\]/);
      return (
        <div>
          {parts[0] && <p>{parts[0]}</p>}
          <AgentStep title={stepInfo.title} status={stepStatus} />
          {parts[1] && <p>{parts[1]}</p>}
        </div>
      );
    }
    return <p>{children}</p>;
  },

  // SQL 代码块始终高亮
  code({ inline, className, children }: any) {
    if (!inline && language === 'sql') {
      return <SqlCodeBlock code={children} isStreaming={isStreaming} />;
    }
    return <code>{children}</code>;
  }
}), [steps, isStreaming, completedSteps]);
```

## 关键优化

### 1. Ref 缓冲区
```typescript
// ❌ 避免：每次更新都触发重渲染
const [currentIndex, setCurrentIndex] = useState(0);

// ✅ 推荐：使用 Ref 追踪位置，只在需要时更新 displayContent
const indexRef = useRef(0);
const bufferRef = useRef("");
```

### 2. 固定渲染频率
```typescript
const interval = 50;  // 50ms ≈ 20FPS
const chunkSize = 2;  // 每次 2 个字符
```

### 3. Memo 缓存
```typescript
// MessageRenderer 使用 React.memo
export const MessageRenderer = React.memo(function MessageRenderer(props) {
  // ...
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

// HistoryMessage 使用 React.memo
const HistoryMessage = React.memo(function HistoryMessage(props) {
  // ...
}, (prev, next) => {
  return (
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming
  );
});
```

### 4. STEP 停顿与状态同步
```typescript
// useStreaming 追踪已完成的 STEP
completedStepsRef.current.set(stepTitle, Date.now());
setCompletedSteps(new Map(completedStepsRef.current));

// MessageRenderer 根据 completedSteps 更新显示状态
const stepStatus = completedSteps?.has(title)
  ? 'success'
  : (originalStatus || 'pending');
```

## 渲染流程图

```
消息创建 (isStreaming: true)
    ↓
useStreaming.startStream(fullContent)
    ↓
┌─────────────────────────────────────┐
│  setInterval (每 50ms)              │
│    ↓                                │
│  追加 2 个字符到 bufferRef           │
│    ↓                                │
│  检查是否包含 [STEP: xxx | loading] │
│    ↓ 是                             │
│  停顿 2-4 秒                         │
│  标记 STEP 完成                      │
│    ↓                                │
│  setDisplayContent(bufferRef)       │
└─────────────────────────────────────┘
    ↓
MessageRenderer 重新渲染
    ↓
parseContent 预处理（移除 | 状态）
    ↓
ReactMarkdown 解析
    ↓
自定义 p 组件拦截 [STEP: xxx]
    ↓
从 steps 数组查找状态 → 渲染 AgentStep
```

## 性能指标

| 指标 | 值 | 说明 |
|------|-----|------|
| chunkSize | 2 字符 | 平衡流畅度和性能 |
| interval | 50ms | 约 20FPS |
| STEP 停顿 | 2000-4000ms | 模拟执行耗时 |
| 重渲染阈值 | 20 字符 | 流式期间减少重渲染 |

## 常见问题

### Q: 为什么使用 Ref 而不是 useState 保存索引？
**A**: Ref 变化不会触发重渲染，避免双重 setState 导致的性能问题。

### Q: STEP 标记为什么会被 markdown 解析为表格？
**A**: remark-gfm 将 `|` 解析为表格分隔符。解决方案是在 parseContent 中移除 `| 状态` 部分。

### Q: 流式期间代码块为什么不闪烁？
**A**: SqlCodeBlock 使用 memo，且比较函数在代码变化<20 字符时返回 true 阻止重渲染。
