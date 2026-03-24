
#### **Role**
你是一个资深的前端架构师，擅长使用 React、Tailwind CSS 构建高审美、高性能的 AI Agent 交互界面。

#### **Project Goal**
参考上传的图片（Astro 风格），构建一个高度解耦的 Agent 对话流 Demo。
1. **核心逻辑**：纯前端 Mock 驱动，实现流式（Streaming）输出效果。
2. **UI 元素**：支持 Agent 执行步骤条、SQL 代码高亮（带标题栏）、Markdown 表格、用户确认按钮。
3. **视觉风格**：紫色调 Agent 头像（Cpu Icon）、蓝色调用户头像、简约灰色侧边栏。

#### **Dependencies**
请确保项目已安装：
`npm install react-markdown react-syntax-highlighter lucide-react clsx tailwind-merge @tailwindcss/typography`

---

#### **File 1: `src/types/chat.ts`**
定义消息协议。
```typescript
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export type StepStatus = 'success' | 'loading' | 'pending';
```

#### **File 2: `src/data/mockData.ts`**
完全还原图片中的业务逻辑数据。
```typescript
import { Message } from '../types/chat';

export const MOCK_CONVERSATION: Message[] = [
  {
    role: 'user',
    content: '帮我建设 DAU 数据资产，数据源来自用户登录日志和活跃事件。'
  },
  {
    role: 'assistant',
    content: `**Planner → PlanManager**\n已为您制定数据资产建设方案，将通过以下步骤执行：\n\n1. 从指定数据源中定位相关的源据表，并分析其元数据。\n[STEP: DAU 数据资产发现专家 | success]\n\n2. 编写高质量的数据仓库分层SQL代码，包括DWD层加工和DWS层汇总统计。\n[STEP: DAU 代码生成专家 | loading]\n\n3. 设计数据任务的调度依赖和执行策略。\n[STEP: DAU 调度配置专家 | pending]\n\n[CONFIRM: 确认执行]`
  },
  {
    role: 'assistant',
    content: `**DauAssetDiscoveryExpert → PlanManager**\n[STEP: DauAssetDiscoveryExpert | success]\n\n🔍 **数据资产发现结果**\n数据源：**AstroDB-Production**\n\n| 表名 | Schema | 说明 | 分区 | 日切量 |\n| :--- | :--- | :--- | :--- | :--- |\n| ods_user_login_log | ods | 用户登录日志原始表 | dt | ~500万/天 |\n| ods_user_active_event | ods | 用户活跃事件流式表 | dt | ~2000万/天 |\n| dim_user_profile | dim | 用户画像维度表 | - | - |\n\n**推荐口径：**\n- **DAU 定义**：当日有登录或活跃事件的去重 user_id 数。`
  },
  {
    role: 'assistant',
    content: `**DAU 代码生成专家 → PlanManager**\n好的，为您生成DWD层和DWS层的高质量SQL代码。\n[STEP: DAU 代码生成专家 | success]\n\n#### **第一步：DWD层宽表加工**\n\`\`\`sql\nCREATE TABLE IF NOT EXISTS dwd.dwd_user_event_detail_di (\n  user_id BIGINT COMMENT '用户唯一ID',\n  event_time TIMESTAMP COMMENT '事件发生时间'\n) COMMENT '用户事务明细宽表';\n\nINSERT OVERWRITE TABLE dwd.dwd_user_event_detail_di PARTITION (dt = '\${bizdate}')\nSELECT user_id, event_time FROM ods_user_login_log;\n\`\`\``
  }
];
```

#### **File 3: `src/components/chat/AgentStep.tsx`**
渲染带有状态的执行步骤。
- 支持 `success` (绿色勾选), `loading` (蓝色旋转), `pending` (灰色圆圈)。

#### **File 4: `src/components/chat/MessageRenderer.tsx`**
核心解析引擎。
- 使用 `react-markdown` 渲染文本。
- **自定义组件映射**：
    - 拦截 `[STEP: 标题 | 状态]` 并渲染 `AgentStep`。
    - 拦截 `[CONFIRM: 文字]` 并渲染漂亮的 `Button`。
    - 使用 `react-syntax-highlighter` 渲染 SQL，添加 Mac 风格代码头。
    - 渲染标准的 Markdown Table，使用 Tailwind 给 `table` 添加边框和浅色表头。

#### **File 5: `src/hooks/useStreaming.ts`**
实现流式模拟逻辑。
- 输入一条完整的消息内容，通过 `setInterval` 或 `requestAnimationFrame` 逐字更新消息 state。
- 模拟“打字机”效果。

#### **File 6: `src/App.tsx`**
整体布局。
- **左侧边栏**：固定宽度，展示“历史对话”列表（Mock 样式）。
- **中心区域**：消息列表容器，具备自动滚动到底部的功能（`useEffect` 监听消息变化）。
- **底部输入框**：展示图片中的样式，但处于 Disabled 状态，点击“发送”图标可重置并重新触发流式演示。

---

### **Prompt to Claude**
请根据上述 `claude.md` 的架构和数据，依次生成代码。
1. 保持代码整洁，使用 Tailwind CSS 实现所有样式。
2. 确保 `MessageRenderer` 能够完美处理文本、步骤条和代码块混排的情况。
3. 流式效果要自然，消息之间要有合理的停顿（例如 800ms）。
