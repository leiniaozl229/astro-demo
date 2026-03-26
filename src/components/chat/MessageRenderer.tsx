import React, { memo, useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AgentStep } from './AgentStep';
import { Copy, Check } from 'lucide-react';
import { RequirementCard, Tab } from './RequirementCard';

interface MessageRendererProps {
  content: string;
  fullContent?: string; // 完整内容，用于解析 steps 和 confirm
  onConfirm?: () => void;
  isStreaming?: boolean;
  completedSteps?: Map<string, number>; // 记录已完成的 STEP 标题
}

interface ParsedData {
  steps: { title: string; status: 'success' | 'loading' | 'pending' | null }[];
  text: string;
  confirmText: string | null;
  requirementData: Tab[] | null;
}

// 解析 [STEP: 标题 | 状态] 语法，返回步骤和清理后的文本
// 支持两种格式：[STEP: 标题 | 状态] 和 [STEP: 标题]（无状态）
function parseContent(content: string, convertLoadingToSuccess: boolean = false): ParsedData {
  const steps: { title: string; status: 'success' | 'loading' | 'pending' | null }[] = [];
  let confirmText: string | null = null;
  let requirementData: Tab[] | null = null;

  // 提取 STEP 标记并记录状态，同时清理文本
  const stepRegex = /\[STEP: ([^\]|]+)(?:\s*\|\s*(success|loading|pending))?\]/g;
  let match;
  let text = content;

  // 使用 replace 替代 exec+replace，确保替换所有匹配项
  text = text.replace(stepRegex, (fullMatch, title, status) => {
    steps.push({ title: title.trim(), status: status ? (status as 'success' | 'loading' | 'pending') : null });
    // 将 [STEP: 标题 | 状态] 替换为 [STEP: 标题]，移除 | 状态部分
    // 这样 markdown 不会将其解析为表格
    return `[STEP: ${title.trim()}]`;
  });

  // 提取 CONFIRM 标记
  const confirmRegex = /\[CONFIRM: ([^\]]+)\]/g;
  const confirmMatch = confirmRegex.exec(text);
  if (confirmMatch) {
    confirmText = confirmMatch[1].trim();
  }

  // 提取 REQUIREMENT 数据块
  const requirementRegex = /\[REQUIREMENT\]([\s\S]*?)\[\/REQUIREMENT\]/;
  const requirementMatch = requirementRegex.exec(text);
  if (requirementMatch) {
    try {
      requirementData = JSON.parse(requirementMatch[1].trim()) as Tab[];
    } catch (e) {
      console.error('Failed to parse requirement data:', e);
    }
  }

  return { steps, text, confirmText, requirementData };
}

// 优化的 SQL 代码块组件 - 独立 memo，减少流式期间重渲染
interface SqlCodeBlockProps {
  code: string;
  index: number;
  copiedCodeIndex: number | null;
  onCopy: (code: string, index: number) => void;
  isStreaming?: boolean;
}

const SqlCodeBlock = memo(function SqlCodeBlock({ code, index, copiedCodeIndex, onCopy, isStreaming }: SqlCodeBlockProps) {
  const [localCopied, setLocalCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    onCopy(code, index);
    setLocalCopied(true);
    setTimeout(() => setLocalCopied(false), 2000);
  }, [code, index, onCopy]);

  const isCurrentCopied = copiedCodeIndex === index || localCopied;

  // 流式期间：始终使用 SyntaxHighlighter 高亮
  const shouldUseHighlighter = true;

  return (
    <div className="my-3">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 border-b-0 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">SQL</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          {isCurrentCopied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      <div className="border border-gray-200 border-t-0 rounded-b-lg bg-white">
        {shouldUseHighlighter ? (
          <SyntaxHighlighter
            language="sql"
            style={oneLight as any}
            customStyle={{ background: 'transparent', padding: '16px 20px', fontSize: '12px' } as any}
            showLineNumbers={true}
            wrapLines
            lineNumberStyle={{ color: '#9ca3af', fontSize: '12px', paddingRight: '16px', minWidth: '35px' }}
          >
            {code}
          </SyntaxHighlighter>
        ) : (
          // 流式期间使用简化的 pre 渲染，避免 SyntaxHighlighter 的高开销
          <pre className="bg-transparent p-4 text-sm font-mono overflow-x-auto">
            <code className="language-sql text-gray-800">{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}, (prev: SqlCodeBlockProps, next: SqlCodeBlockProps) => {
  // 只在代码变化超过阈值或流式状态变化时才重新渲染
  // 这避免了流式期间每个字符都触发高亮重算
  if (prev.isStreaming !== next.isStreaming) return false;
  if (prev.copiedCodeIndex !== next.copiedCodeIndex) return false;
  // 流式期间：每 20 个字符才重新渲染一次
  if (prev.isStreaming || next.isStreaming) {
    return Math.abs(next.code.length - prev.code.length) < 20;
  }
  return prev.code === next.code;
});

export const MessageRenderer = React.memo(function MessageRenderer({ content, fullContent, onConfirm, isStreaming = false, completedSteps }: MessageRendererProps) {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const codeBlockIndexRef = React.useRef(0);

  // 使用 streaming content 解析正文文本
  // 流式期间清理未闭合的标签（如半截的 [STEP: ...）
  const cleanContent = isStreaming ? content.replace(/\[[A-Z]+:?[^\]]*$/g, '') : content;
  // 流式完成后，将 loading 状态的步骤转为 success
  const { text, steps, confirmText, requirementData } = useMemo(
    () => parseContent(cleanContent, !isStreaming),
    [cleanContent, isStreaming]
  );

  const handleCopyCode = useCallback((code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
  }, []);

  // 使用 useMemo 缓存 markdown components
  // 注意：不依赖 text，避免每次内容变化都重新创建 components
  const markdownComponents = useMemo(() => {
    // 使用闭包变量而非 ref 来追踪代码块索引
    let codeBlockIndex = 0;

    return {
      // 自定义 p 组件，用于拦截包含 STEP 标记的段落
      p({ children, ...props }: any) {
        const childStr = String(children || '');

        // 检查是否包含 CONFIRM 标记
        const confirmMatch = childStr.match(/\[CONFIRM: ([^\]]+)\]/);
        if (confirmMatch) {
          const confirmText = confirmMatch[1].trim();
          const beforeText = childStr.replace(/\[CONFIRM: [^\]]+\]/, '').trim();

          return (
            <div className="my-2">
              {beforeText && <p className="text-gray-700 leading-relaxed mb-2">{beforeText}</p>}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={onConfirm}
                  className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                  {confirmText}
                </button>
                <button
                  className="px-5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          );
        }

        // 检查是否包含 STEP 标记（已清理，没有 | 状态）
        const stepMatch = childStr.match(/\[STEP: ([^\]]+)\]/);
        if (stepMatch) {
          const fullMatch = stepMatch[0];
          const stepTitle = stepMatch[1].trim();

          // 从原始内容中查找这个 STEP 的状态
          // 因为 parseContent 已经记录了 steps，我们需要找到对应的状态
          const stepInfo = steps.find(s => s.title === stepTitle);
          const originalStatus = stepInfo?.status;

          // 无状态的 STEP 显示为 pending（灰色），有状态的根据 completedSteps 判断
          let stepStatus: 'success' | 'loading' | 'pending' = 'pending';
          if (originalStatus) {
            const isStepCompleted = completedSteps?.has(stepTitle);
            stepStatus = isStepCompleted ? 'success' : originalStatus;
          }

          // 使用相同的正则来分割文本
          const parts = childStr.split(/\[STEP: [^\]]+\]/);
          const beforeText = parts[0]?.trim();
          const afterText = parts[1]?.trim() || '';

          return (
            <div className="my-2">
              {beforeText && <p className="text-gray-700 leading-relaxed mb-2">{beforeText}</p>}
              <AgentStep title={stepTitle} status={stepStatus} />
              {afterText && <p className="text-gray-700 leading-relaxed mb-2">{afterText}</p>}
            </div>
          );
        }

        // 普通段落
        if (!children || String(children).trim() === '') return null;
        return <p className="text-gray-700 leading-relaxed mb-2" {...props}>{children}</p>;
      },
      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : 'text';
        const codeContent = String(children).replace(/\n$/, '');
        const currentIndex = codeBlockIndex++;

        if (!inline && language === 'sql') {
          return (
            <SqlCodeBlock
              code={codeContent}
              index={currentIndex}
              copiedCodeIndex={copiedCodeIndex}
              onCopy={handleCopyCode}
              isStreaming={isStreaming}
            />
          );
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      h4({ children }: { children?: React.ReactNode }) {
        return (
          <h4 className="text-sm font-semibold text-gray-800 mt-4 mb-2">
            {children}
          </h4>
        );
      },
      strong({ children }: { children?: React.ReactNode }) {
        return (
          <strong className="text-gray-900 font-semibold">
            {children}
          </strong>
        );
      },
      ul({ children }: { children?: React.ReactNode }) {
        return (
          <ul className="list-disc list-outside text-gray-700 space-y-1 my-2 pl-5">
            {children}
          </ul>
        );
      },
      li({ children }: { children?: React.ReactNode }) {
        const childStr = String(children || '');

        // 检查是否包含 STEP 标记
        const stepMatch = childStr.match(/\[STEP: ([^\]]+)\]/);
        if (stepMatch) {
          const stepTitle = stepMatch[1].trim();
          const stepInfo = steps.find(s => s.title === stepTitle);
          const originalStatus = stepInfo?.status;

          let stepStatus: 'success' | 'loading' | 'pending' = 'pending';
          if (originalStatus) {
            const isStepCompleted = completedSteps?.has(stepTitle);
            stepStatus = isStepCompleted ? 'success' : originalStatus;
          }

          const parts = childStr.split(/\[STEP: [^\]]+\]/);
          const beforeText = parts[0]?.trim();
          const afterText = parts[1]?.trim() || '';

          return (
            <li className="text-gray-700">
              <span>{beforeText}</span>
              <AgentStep title={stepTitle} status={stepStatus} />
              <span>{afterText}</span>
            </li>
          );
        }

        return (
          <li className="text-gray-700">
            {children}
          </li>
        );
      },
      table({ children }: { children?: React.ReactNode }) {
        return (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border border-gray-200 text-sm">
              {children}
            </table>
          </div>
        );
      },
      thead({ children }: { children?: React.ReactNode }) {
        return <thead className="bg-gray-50">{children}</thead>;
      },
      th({ children }: { children?: React.ReactNode }) {
        return (
          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border border-gray-200">
            {children}
          </th>
        );
      },
      td({ children }: { children?: React.ReactNode }) {
        return (
          <td className="px-4 py-2.5 text-sm text-gray-700 border border-gray-200">
            {children}
          </td>
        );
      },
      tr({ children }: { children?: React.ReactNode }) {
        return <tr className="hover:bg-gray-50 last:border-b-0">{children}</tr>;
      },
    };
  }, [copiedCodeIndex, handleCopyCode, isStreaming, completedSteps, onConfirm, steps, text]);

  return (
    <div className="w-full space-y-3">
      {/* 渲染需求确认卡片 - 流式期间也渲染 */}
      {requirementData && requirementData.length > 0 && (
        <RequirementCard tabs={requirementData} onConfirm={onConfirm} onCancel={onConfirm} />
      )}

      {/* 渲染内容：流式期间也使用 Markdown，但简化渲染 */}
      {text && (
        <div className="prose prose-sm max-w-none relative">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {text}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // 只有当内容、完整内容、确认回调或流式状态变化时才重新渲染
  return (
    prevProps.content === nextProps.content &&
    prevProps.fullContent === nextProps.fullContent &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.onConfirm === nextProps.onConfirm
  );
});
