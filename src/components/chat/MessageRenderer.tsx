import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AgentStep } from './AgentStep';
import { Copy, Check } from 'lucide-react';

interface MessageRendererProps {
  content: string;
  onConfirm?: () => void;
}

// 解析 [STEP: 标题 | 状态] 语法，返回步骤和剩余文本
function parseContent(content: string): {
  steps: { title: string; status: 'success' | 'loading' | 'pending' }[];
  text: string;
  confirmText: string | null;
} {
  const steps: { title: string; status: 'success' | 'loading' | 'pending' }[] = [];
  let confirmText: string | null = null;

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

  // 清理标记，保留原始文本格式
  let text = content
    .replace(/\[STEP: [^\]]+\]/g, '')
    .replace(/\[CONFIRM: [^\]]+\]/g, '')
    .trim();

  return { steps, text, confirmText };
}

export function MessageRenderer({ content, onConfirm }: MessageRendererProps) {
  const [copiedCodeIndex, setCopiedCodeIndex] = React.useState<number | null>(null);
  const { steps, text, confirmText } = parseContent(content);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  let codeBlockIndex = 0;

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

      {/* 渲染 Markdown 内容 */}
      {text && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : 'text';
                const codeContent = String(children).replace(/\n$/, '');
                const currentIndex = codeBlockIndex++;

                if (!inline && language === 'sql') {
                  return (
                    <div className="my-3 rounded-xl overflow-hidden border border-gray-200">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
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
                      <SyntaxHighlighter
                        language={language}
                        style={oneLight}
                        customStyle={{ margin: 0, borderRadius: 0, background: '#ffffff', padding: '16px' }}
                        showLineNumbers
                        {...props}
                      >
                        {codeContent}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              h4({ children }) {
                return (
                  <h4 className="text-sm font-semibold text-gray-800 mt-4 mb-2">
                    {children}
                  </h4>
                );
              },
              strong({ children }) {
                return (
                  <strong className="text-gray-900 font-semibold">
                    {children}
                  </strong>
                );
              },
              p({ children }) {
                if (!children || String(children).trim() === '') return null;
                return (
                  <p className="text-gray-700 leading-relaxed mb-2">
                    {children}
                  </p>
                );
              },
              ul({ children }) {
                return (
                  <ul className="list-disc list-outside text-gray-700 space-y-1 my-2 pl-5">
                    {children}
                  </ul>
                );
              },
              li({ children }) {
                return (
                  <li className="text-gray-700">
                    {children}
                  </li>
                );
              },
              table({ children }) {
                return (
                  <div className="my-4 overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full border-collapse">
                      {children}
                    </table>
                  </div>
                );
              },
              thead({ children }) {
                return <thead className="bg-gray-50">{children}</thead>;
              },
              th({ children }) {
                return (
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className="px-4 py-2.5 text-sm text-gray-700 border-b border-gray-100 last:border-b-0 whitespace-nowrap">
                    {children}
                  </td>
                );
              },
              tr({ children }) {
                return <tr className="hover:bg-gray-50 last:border-b-0">{children}</tr>;
              },
            }}
          >
            {text}
          </ReactMarkdown>
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
}
