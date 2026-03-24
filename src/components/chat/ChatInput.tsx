import { useState } from 'react';
import { Send, Paperclip, Box } from 'lucide-react';

interface ChatInputProps {
  disabled?: boolean;
  onSend?: (value: string) => void;
}

export function ChatInput({ disabled = false, onSend }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend?.(input);
    setInput('');
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="你有数据问题，我有专业解法"
            disabled={disabled}
            rows={3}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-gray-700 placeholder-gray-400"
            style={{ minHeight: '120px' }}
          />

          {/* 底部工具栏 */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            {/* 左侧标签按钮 */}
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-medium transition-colors">
                <Box className="w-3.5 h-3.5" />
                <span>数据血缘</span>
              </button>
            </div>

            {/* 右侧按钮组 */}
            <div className="flex items-center gap-2">
              <button
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="知识库"
              >
                <Box className="w-5 h-5" />
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
                className="p-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 text-blue-600 disabled:text-gray-300 rounded-full transition-colors"
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
