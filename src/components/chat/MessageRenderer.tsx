import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AgentStep } from './AgentStep';
import { Copy, Check } from 'lucide-react';
import { RequirementCard, Tab } from './RequirementCard';

interface MessageRendererProps {
  content: string;
  onConfirm?: () => void;
  isStreaming?: boolean;
}

interface ParsedData {
  steps: { title: string; status: 'success' | 'loading' | 'pending' }[];
  text: string;
  confirmText: string | null;
  requirementData: Tab[] | null;
}

// 解析 [STEP: 标题 | 状态] 语法，返回步骤和剩余文本
function parseContent(content: string): ParsedData {
  const steps: { title: string; status: 'success' | 'loading' | 'pending' }[] = [];
  let confirmText: string | null = null;
  let requirementData: Tab[] | null = null;

  // 提取 STEP 标记
  const stepRegex = /\[STEP: ([^\]|]+)\s*\|\s*(success|loading|pending)\]/g;
  let match;
  while ((match = stepRegex.exec(content)) !== null) {
    steps.push({
      title: match[1].trim(),
      status: match[2] as 'success' | 'loading' | 'pending',
    });
  }

  // 提取 CONFIRM 标记
  const confirmRegex = /\[CONFIRM: ([^\]]+)\]/;
  const confirmMatch = confirmRegex.exec(content);
  if (confirmMatch) {
    confirmText = confirmMatch[1].trim();
  }

  // 提取 REQUIREMENT 数据块
  const requirementRegex = /\[REQUIREMENT\]([\s\S]*?)\[\/REQUIREMENT\]/;
  const requirementMatch = requirementRegex.exec(content);
  if (requirementMatch) {
    try {
      requirementData = JSON.parse(requirementMatch[1].trim()) as Tab[];
    } catch (e) {
      console.error('Failed to parse requirement data:', e);
    }
  }

  // 清理标记，保留原始文本格式
  let text = content
    .replace(/\[STEP: [^\]]+\]/g, '')
    .replace(/\[CONFIRM: [^\]]+\]/g, '')
    .replace(/\[REQUIREMENT\][\s\S]*?\[\/REQUIREMENT\]/g, '')
    .trim();

  return { steps, text, confirmText, requirementData };
}

export const MessageRenderer = React.memo(function MessageRenderer({ content, onConfirm, isStreaming = false }: MessageRendererProps) {
  const [copiedCodeIndex, setCopiedCodeIndex] = React.useState<number | null>(null);
  const [renderedContent, setRenderedContent] = React.useState<React.ReactNode>(null);

  // 使用 useMemo 缓存解析结果
  const { steps, text, confirmText, requirementData } = React.useMemo(
    () => parseContent(content),
    [content]
  );

  // 流式期间使用简化的纯文本渲染，避免昂贵的 Markdown 解析
  React.useEffect(() => {
    if (isStreaming) {
      // 流式期间只渲染纯文本
      setRenderedContent(
        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</div>
      );
    } else {
      // 流式完成后渲染完整 Markdown
      setRenderedContent(null); // 让下面的 JSX 重新计算
    }
  }, [isStreaming, text]);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  let codeBlockIndex = 0;

  // 定义 memoized components 对象
  const markdownComponents = React.useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      const codeContent = String(children).replace(/\n$/, '');
      const currentIndex = codeBlockIndex++;

      if (!inline && language === 'sql') {
        const isComplete = !isStreaming || codeContent.includes('```') || codeContent.length > 500;

        return (
          <div className="my-3">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 border-b-0 rounded-t-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">SQL</span>
              </div>
              <button
                onClick={() => handleCopyCode(codeContent, currentIndex)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copiedCodeIndex === currentIndex ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="border border-gray-200 border-t-0 rounded-b-lg bg-white">
              {isComplete ? (
                <SyntaxHighlighter
                  language={language}
                  style={oneLight as any}
                  customStyle={{ background: 'transparent', padding: '16px', fontSize: '12px' } as any}
                  showLineNumbers={true}
                  wrapLines
                  lineNumberStyle={{ color: '#9ca3af', fontSize: '12px', paddingRight: '12px' }}
                >
                  {codeContent}
                </SyntaxHighlighter>
              ) : (
                <div className="p-4 font-mono text-sm text-gray-600 whitespace-pre">
                  {codeContent}
                </div>
              )}
            </div>
          </div>
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
    p({ children }: { children?: React.ReactNode }) {
      if (!children || String(children).trim() === '') return null;
      return (
        <p className="text-gray-700 leading-relaxed mb-2">
          {children}
        </p>
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
      return (
        <li className="text-gray-700">
          {children}
        </li>
      );
    },
    table({ children }: { children?: React.ReactNode }) {
      return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full border-collapse">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: { children?: React.ReactNode }) {
      return <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>;
    },
    th({ children }: { children?: React.ReactNode }) {
      return (
        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200 border-r last:border-r-0">
          {children}
        </th>
      );
    },
    td({ children }: { children?: React.ReactNode }) {
      return (
        <td className="px-4 py-2.5 text-sm text-gray-700 border-b border-gray-100 border-r last:border-r-0 whitespace-nowrap">
          {children}
        </td>
      );
    },
    tr({ children }: { children?: React.ReactNode }) {
      return <tr className="hover:bg-gray-50 last:border-b-0">{children}</tr>;
    },
  }), [isStreaming, copiedCodeIndex]);

  return (
    <div className="w-full space-y-3">
      {/* 渲染步骤条 */}
      {steps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <AgentStep key={index} title={step.title} status={step.status} />
          ))}
        </div>
      )}

      {/* 渲染需求确认卡片 */}
      {requirementData && requirementData.length > 0 && (
        <RequirementCard tabs={requirementData} onConfirm={onConfirm} onCancel={onConfirm} />
      )}

      {/* 渲染内容：流式期间使用纯文本，完成后使用 Markdown */}
      {text && (
        <div className="prose prose-sm max-w-none">
          {isStreaming && renderedContent ? (
            // 流式期间：纯文本渲染（高性能）
            renderedContent
          ) : (
            // 流式完成后：完整 Markdown 渲染
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {text}
            </ReactMarkdown>
          )}
        </div>
      )}

      {/* 渲染确认按钮 */}
      {confirmText && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // 只有当内容、确认回调或流式状态变化时才重新渲染
  return (
    prevProps.content === nextProps.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.onConfirm === nextProps.onConfirm
  );
});
