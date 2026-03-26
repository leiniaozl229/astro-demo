import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot } from 'lucide-react';

interface ChatInputProps {
  disabled?: boolean;
  onSend?: (value: string) => void;
}

export function ChatInput({ disabled = false, onSend }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevDisabledRef = useRef(disabled);

  // 流式输出结束后，恢复焦点到输入框
  useEffect(() => {
    // 从 disabled=true 变为 disabled=false 时，恢复焦点
    if (prevDisabledRef.current && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend?.(input);
    setInput('');
    // 发送后保持焦点
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#f5f7fa] p-6 pb-8">
      <div className="max-w-[1000px] mx-auto">
        {/* 卡片式输入框 */}
        <div className="relative bg-white rounded-[20px] border border-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入需求，多Agent自动规划并执行最优数据任务路径"
            disabled={disabled}
            rows={3}
            className="w-full h-12 bg-transparent border-none outline-none resize-none text-sm text-gray-700 placeholder-gray-400"
          />

          {/* 底部工具栏 */}
          <div className="flex items-center justify-between border-t border-gray-50">
            {/* 左侧标签按钮 */}
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-medium transition-colors">
                <Bot className="w-3.5 h-3.5" />
                <span>数据导航</span>
              </button>
            </div>

            {/* 右侧按钮组 */}
            <div className="flex items-center gap-2">
              <button
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="知识库"
              >
                <Bot className="w-5 h-5" />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="附件"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                onClick={handleSend}
                disabled={disabled || !input.trim()}
                className="p-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-300 text-blue-600 rounded-full transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
