import React, { useState } from 'react';

export interface Option {
  id: string;
  label: string;
  description?: string;
}

export interface Tab {
  id: string;
  title: string;
  type: 'radio' | 'checkbox';
  options: Option[];
}

export interface RequirementCardProps {
  tabs?: Tab[];
  onConfirm?: (values: Record<string, string[]>) => void;
  onCancel?: () => void;
}

export function RequirementCard({
  tabs = [],
  onConfirm,
  onCancel
}: RequirementCardProps) {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || '');
  const [values, setValues] = useState<Record<string, string[]>>({});

  const handleSelect = (tabId: string, optionId: string, type: 'radio' | 'checkbox') => {
    setValues((prev) => {
      const current = prev[tabId] || [];
      let newValue: string[];

      if (type === 'radio') {
        newValue = [optionId];
      } else {
        newValue = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      }

      return { ...prev, [tabId]: newValue };
    });
  };

  const handleConfirm = () => {
    onConfirm?.(values);
  };

  if (tabs.length === 0) return null;

  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Tab 标题栏 */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="p-4">
        {currentTab && (
          <div className="space-y-3">
            {currentTab.options.map((option) => {
              const isSelected = (values[currentTab.id] || []).includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <input
                    type={currentTab.type}
                    name={currentTab.id}
                    value={option.id}
                    checked={isSelected}
                    onChange={() => handleSelect(currentTab.id, option.id, currentTab.type)}
                    className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-sm text-gray-500 mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          确认执行
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          其他（重新输入需求）
        </button>
      </div>
    </div>
  );
}
