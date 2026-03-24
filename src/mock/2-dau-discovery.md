role: assistant
content:
**DauAssetDiscoveryExpert → PlanManager**

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
- **时间窗口**：dt = '${bizdate}'
