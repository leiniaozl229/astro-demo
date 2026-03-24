import { useState, useEffect, useRef } from 'react';
import { Message } from './types/chat';
import { Sidebar } from './components/layout/Sidebar';
import { ChatList } from './components/chat/ChatList';
import { ChatInput } from './components/chat/ChatInput';

// Mock 的 assistant 回复数据
const ASSISTANT_RESPONSES: Omit<Message, 'isStreaming'>[] = [
  {
    role: 'assistant',
    content: `**Planner → PlanManager**

已为您制定数据资产建设方案，将通过以下步骤执行：

1. 从指定数据源中定位相关的源数据表，并分析其元数据。
[STEP: DAU 数据资产发现专家 | success]

2. 编写高质量的数据仓库分层 SQL 代码，包括 DWD 层加工和 DWS 层汇总统计。
[STEP: DAU 代码生成专家 | success]

3. 设计数据任务的调度依赖和执行策略。
[STEP: DAU 调度配置专家 | pending]

[CONFIRM: 确认执行]`
  },
  {
    role: 'assistant',
    content: `**DauAssetDiscoveryExpert → PlanManager**

[STEP: DauAssetDiscoveryExpert | success]

🔍 **数据资产发现结果**

数据源：**AstroDB-Production**

| 表名 | Schema | 说明 | 分区 | 日切量 |
| --- | --- | --- | --- | --- |
| ods_user_login_log | ods | 用户登录日志原始表 | dt | ~500 万/天 |
| ods_user_active_event | ods | 用户活跃事件流式表 | dt | ~2000 万/天 |
| dim_user_profile | dim | 用户画像维度表 | - | - |

**推荐口径：**

- **DAU 定义**：当日有登录或活跃事件的去重 user_id 数。
- **主表**：ods_user_login_log UNION ods_user_active_event
- **去重键**：user_id
- **时间窗口**：dt = '\${bizdate}'`
  },
  {
    role: 'assistant',
    content: `**DAU 代码生成专家 → PlanManager**

好的，为您生成 DWD 层和 DWS 层的高质量 SQL 代码。

[STEP: DAU 代码生成专家 | success]

#### **第一步：DWD 层（数据明细层）宽表加工**

目标：关联清洗 ODS 层，形成 dwd_user_event_detail_di

\`\`\`sql
CREATE TABLE IF NOT EXISTS dwd.dwd_user_event_detail_di (
  user_id BIGINT COMMENT '用户唯一 ID',
  event_time TIMESTAMP COMMENT '事件发生时间',
  event_type STRING COMMENT '事件类型'
) COMMENT '用户事务明细宽表';

-- 数据加工逻辑（INSERT 语句）
INSERT OVERWRITE TABLE dwd.dwd_user_event_detail_di PARTITION (dt = '\${bizdate}')
SELECT
  COALESCE(login.user_id, active.user_id) AS user_id,
  COALESCE(login.event_time, active.event_time) AS event_time,
  CASE WHEN active.event_type IS NOT NULL THEN active.event_type ELSE 'login' END AS event_type
FROM ods_user_login_log login
FULL OUTER JOIN ods_user_active_event active ON login.user_id = active.user_id;
\`\`\`

#### **第二步：DWS 层（数据服务层）汇总统计**

目标：计算 DAU 指标，形成每日汇总 dws_user_dau_dd

\`\`\`sql
CREATE TABLE IF NOT EXISTS dws.dws_user_dau_dd (
  dt STRING COMMENT '统计日期',
  dau_count BIGINT COMMENT '日活跃用户数 (DAU)',
  login_user_count BIGINT COMMENT '当日登录用户数',
  active_user_count BIGINT COMMENT '当日活跃用户数'
) COMMENT 'DAU 日汇总统计表';

INSERT OVERWRITE TABLE dws.dws_user_dau_dd
SELECT
  '\${bizdate}' AS dt,
  COUNT(DISTINCT user_id) AS dau_count,
  COUNT(DISTINCT CASE WHEN event_type = 'login' THEN user_id END) AS login_user_count,
  COUNT(DISTINCT CASE WHEN event_type != 'login' THEN user_id END) AS active_user_count
FROM dwd.dwd_user_event_detail_di
WHERE dt = '\${bizdate}';
\`\`\``
  }
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送用户消息并触发 assistant 回复
  const handleSendMessage = (userInput: string) => {
    if (!userInput.trim() || isStreaming) return;

    // 添加用户消息
    const userMessage: Message = {
      role: 'user',
      content: userInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    // 获取当前应该使用的回复
    const responseIndex = currentResponseIndex;
    const response = ASSISTANT_RESPONSES[responseIndex % ASSISTANT_RESPONSES.length];

    // 立即添加空的 assistant 消息
    setMessages((prev) => [
      ...prev,
      {
        ...response,
        isStreaming: true,
        content: '',
      },
    ]);

    // 流式输出内容
    const fullContent = response.content;
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex >= fullContent.length) {
        clearInterval(interval);
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            ...response,
            isStreaming: false,
          };
          return newMessages;
        });
        setIsStreaming(false);
        setCurrentResponseIndex((prev) => prev + 1);
        return;
      }

      const chunkSize = Math.floor(Math.random() * 3) + 1;
      currentIndex = Math.min(currentIndex + chunkSize, fullContent.length);

      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...response,
          content: fullContent.slice(0, currentIndex),
          isStreaming: true,
        };
        return newMessages;
      });
    }, 30);
  };

  // 确认执行按钮处理
  const handleConfirm = () => {
    if (isStreaming) return;
    handleSendMessage('确认执行数据资产建设方案');
  };

  return (
    <div className="h-screen flex bg-[#f5f7fa]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部标题栏 */}
        <div className="px-6 py-3">
          <h1 className="text-base font-semibold text-gray-700">建设 DAU 数据资产</h1>
        </div>

        <ChatList messages={messages} onConfirm={handleConfirm} />
        <div ref={messagesEndRef} />
        <ChatInput disabled={isStreaming} onSend={handleSendMessage} />
      </div>
    </div>
  );
}
