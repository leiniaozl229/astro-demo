role: assistant
content:
我已理解你的需求，这是我从你的话中提取的业务要素，请确认：

[REQUIREMENT]
[
  {
    "id": "scenario",
    "title": "数据消费场景",
    "type": "radio",
    "options": [
      { "id": "asset", "label": "资产目录", "description": "业务方在数据资产门户中搜索、浏览、查看数据表" },
      { "id": "metric", "label": "指标平台", "description": "在指标平台配置指标供业务方查询" },
      { "id": "report", "label": "数据报表", "description": "生成固定报表供业务方查看" },
      { "id": "api", "label": "API 接口", "description": "提供 API 接口供下游系统调用" },
      { "id": "other", "label": "Other", "description": "" }
    ]
  },
  {
    "id": "dau",
    "title": "DAU 口径",
    "type": "checkbox",
    "options": [
      { "id": "login", "label": "登录用户", "description": "当日有登录行为的用户" },
      { "id": "active", "label": "活跃用户", "description": "当日有活跃事件的用户" },
      { "id": "visit", "label": "访问用户", "description": "当日有页面访问的用户" }
    ]
  },
  {
    "id": "dimension",
    "title": "统计维度",
    "type": "checkbox",
    "options": [
      { "id": "channel", "label": "渠道", "description": "按获客渠道统计" },
      { "id": "region", "label": "地区", "description": "按用户所在地区统计" },
      { "id": "device", "label": "设备", "description": "按设备类型统计" },
      { "id": "version", "label": "版本", "description": "按 App 版本统计" }
    ]
  }
]
[/REQUIREMENT]
