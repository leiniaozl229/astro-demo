import { MessageSquare, Plus, Home, MessageCircle, Brain, LayoutGrid, Star, ChevronRight, Settings, Send } from 'lucide-react';
import { cn } from '../../utils/cn';

const MENU_ITEMS = [
  { icon: Home, label: '首页', path: '/' },
  { icon: MessageCircle, label: '问答', path: '/qa', active: true },
  { icon: Brain, label: '智能体', path: '/agent' },
  { icon: LayoutGrid, label: '工作台', path: '/workbench' },
];

const HISTORY_SECTIONS = [
  {
    title: '我的收藏',
    icon: Star,
    items: []
  },
  {
    title: '历史对话',
    icon: MessageSquare,
    collapsible: true,
    items: [
      { date: '今天', items: ['建设 DAU 数据资产'] },
      { date: '2024 年中交客产业务分析', items: ['处理数据分类分级和标准映射', '系统关键数据分析'] },
      { date: '本周', items: ['2024 年中交客产业务分析业务...', '处理数据分类分级和标准映射...', '系统关键数据分析', '关键数据分析'] },
    ]
  }
];

export function Sidebar() {
  return (
    <div className="w-[280px] bg-white border-r border-gray-200 flex flex-col h-full">
      {/* 顶部 Logo 区域 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-lg font-semibold text-gray-800">Astro</span>
        </div>
      </div>

      {/* 新建对话按钮 */}
      <div className="p-3">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-purple-700 rounded-xl text-sm font-medium transition-all border border-purple-100">
          <Plus className="w-4 h-4" />
          新建对话
        </button>
      </div>

      {/* 主菜单 */}
      <nav className="px-2 py-2">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.path}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5',
              item.active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <item.icon className={cn('w-4 h-4', item.active ? 'text-blue-600' : 'text-gray-500')} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 收藏和历史对话 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {HISTORY_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <button className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700">
              <div className="flex items-center gap-2">
                {section.icon && <section.icon className="w-3.5 h-3.5" />}
                <span>{section.title}</span>
              </div>
              {section.collapsible && <ChevronRight className="w-3 h-3" />}
            </button>
            {section.items && section.items.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {section.items.map((group, idx) => (
                  <div key={idx}>
                    {group.date && (
                      <div className="px-3 py-1.5 text-xs text-gray-400">{group.date}</div>
                    )}
                    {group.items && group.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span className="truncate text-left flex-1">{item}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部设置 */}
      <div className="p-3 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          <span>设置</span>
        </button>
      </div>
    </div>
  );
}
