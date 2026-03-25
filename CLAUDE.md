# Astro Demo 项目文档

## 项目概述
基于 React + Tailwind CSS 的 AI Agent 对话流 Demo，模拟数据资产建设场景。

## 技术栈
- **React 18.3** + TypeScript
- **Tailwind CSS** 样式
- **react-markdown** + **remark-gfm** Markdown 渲染
- **react-syntax-highlighter** 代码高亮
- **lucide-react** 图标库

## 项目结构
```
src/
├── components/
│   ├── chat/
│   │   ├── AgentStep.tsx       # 步骤状态组件（success/loading/pending）
│   │   ├── ChatInput.tsx       # 底部输入框（带工具栏）
│   │   ├── ChatMessage.tsx     # 消息气泡组件
│   │   ├── MessageRenderer.tsx # 核心渲染引擎（STEP/CONFIRM 解析）
│   │   ├── RequirementCard.tsx # 需求确认卡片（Tab 选择）
│   │   └── ChatList.tsx
│   └── layout/
│       └── Sidebar.tsx         # 左侧边栏（菜单 + 历史记录）
├── hooks/
│   └── useStreaming.ts         # 流式输出 Hook（打字机效果）
├── mock/
│   └── mockLoader.ts           # Mock 数据加载器
├── types/
│   └── chat.ts                 # 消息类型定义
├── utils/
│   └── cn.ts                   # 样式工具
├── App.tsx                     # 主应用入口
└── main.tsx
public/
└── mock/
    ├── 1-planner-response.md   # Planner 响应
    ├── 2-dau-discovery.md      # 数据资产发现
    ├── 3-dau-codegen.md        # SQL 代码生成
    └── 4-requirement-confirm.md
docs/
└── STREAMING.md                # 流式输出渲染逻辑详解
```

## Mock 数据加载
Mock 文件位于 `public/mock/*.md`，通过 `mockLoader.ts` 动态加载：
```typescript
// App.tsx
useEffect(() => {
  loadAllMockResponses().then((responses) => {
    setMockResponses(responses as Omit<Message, 'isStreaming'>[]);
  });
}, []);
```

## 核心组件说明

### 1. MessageRenderer.tsx
**功能**：解析并渲染 Agent 消息内容

**支持的标记语法**：
- `[STEP: 标题 | 状态]` → 渲染为 `AgentStep` 组件
  - 支持三种状态：`success`、`loading`、`pending`
  - 无状态标记显示为 pending（灰色）
  - `| 状态` 部分在渲染前被移除，不显示在页面上
- `[CONFIRM: 按钮文字]` → 渲染为确认按钮
- `[REQUIREMENT]JSON 数据[/REQUIREMENT]` → 渲染为需求卡片

**Markdown 自定义组件**：
- `p` - 拦截 STEP/CONFIRM 标记
- `li` - 拦截列表中的 STEP 标记
- `table/thead/th/td/tr` - 带完整边框的表格
- `code` - SQL 代码块带标题栏和复制按钮
- `h4/strong/ul` - 基础文本样式

### 2. useStreaming.ts
**功能**：流式输出 Hook

**参数**：
- `chunkSize: 2` - 每次输出字符数
- `interval: 50ms` - 刷新频率

**特性**：
- 支持 STEP 标记停顿（遇到 `| loading` 时暂停 2-4 秒）
- 使用 Ref 缓冲区避免频繁 setState
- 自动追踪已完成的 STEP 步骤

### 3. AgentStep.tsx
**功能**：渲染执行步骤状态

**样式**：
- `success` - 绿色勾选图标，绿色背景
- `loading` - 蓝色旋转图标，蓝色背景
- `pending` - 灰色圆圈，灰色背景

### 4. App.tsx
**功能**：主应用布局

**特性**：
- 自动滚动到底部（流式期间每 300ms 触发）
- 历史消息使用 memo 避免流式期间重渲染
- Mock 数据循环播放

## Mock 数据格式
位于 `public/mock/*.md`，格式：
```markdown
role: assistant
content:
**发送者 → 接收者**

正文内容...

[STEP: 步骤名称 | 状态]

[CONFIRM: 确认执行]
```

**加载逻辑**：`mockLoader.ts` 解析 md 文件，提取 role 和 content 字段

## 依赖
```json
{
  "react-markdown": "latest",
  "remark-gfm": "latest",
  "react-syntax-highlighter": "latest",
  "lucide-react": "latest",
  "clsx": "latest",
  "tailwind-merge": "latest"
}
```

## 开发命令
```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
```

## 最近修改
- 删除废弃的 `src/data/mockData.ts`（改用 public/mock/*.md 动态加载）
- 移除 STEP 标记中的 `| status` 显示（防止 markdown 解析为表格）
- 表格添加完整边框
- SQL 代码块始终高亮（移除流式期间简化渲染）
- 移除流式光标
- 降低初始流式速度（chunkSize: 2, interval: 50ms）
