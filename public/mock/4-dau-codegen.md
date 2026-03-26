role: assistant
content:
**DAU 代码生成专家 → PlanManager**

好的，为您生成 DWD 层和 DWS 层的高质量 SQL 代码。

[STEP: DAU 代码生成专家 | loading]

#### **第一步：DWD 层（数据明细层）宽表加工**

目标：关联清洗 ODS 层，形成 dwd_user_event_detail_di

```sql
CREATE TABLE IF NOT EXISTS dwd.dwd_user_event_detail_di (
  user_id BIGINT COMMENT '用户唯一 ID',
  event_time TIMESTAMP COMMENT '事件发生时间',
  event_type STRING COMMENT '事件类型'
) COMMENT '用户事务明细宽表';

-- 数据加工逻辑（INSERT 语句）
INSERT OVERWRITE TABLE dwd.dwd_user_event_detail_di PARTITION (dt = '${bizdate}')
SELECT
  COALESCE(login.user_id, active.user_id) AS user_id,
  COALESCE(login.event_time, active.event_time) AS event_time,
  CASE WHEN active.event_type IS NOT NULL THEN active.event_type ELSE 'login' END AS event_type
FROM ods_user_login_log login
FULL OUTER JOIN ods_user_active_event active ON login.user_id = active.user_id;
```

#### **第二步：DWS 层（数据服务层）汇总统计**

目标：计算 DAU 指标，形成每日汇总 dws_user_dau_dd

```sql
CREATE TABLE IF NOT EXISTS dws.dws_user_dau_dd (
  dt STRING COMMENT '统计日期',
  dau_count BIGINT COMMENT '日活跃用户数 (DAU)',
  login_user_count BIGINT COMMENT '当日登录用户数',
  active_user_count BIGINT COMMENT '当日活跃用户数'
) COMMENT 'DAU 日汇总统计表';

INSERT OVERWRITE TABLE dws.dws_user_dau_dd
SELECT
  '${bizdate}' AS dt,
  COUNT(DISTINCT user_id) AS dau_count,
  COUNT(DISTINCT CASE WHEN event_type = 'login' THEN user_id END) AS login_user_count,
  COUNT(DISTINCT CASE WHEN event_type != 'login' THEN user_id END) AS active_user_count
FROM dwd.dwd_user_event_detail_di
WHERE dt = '${bizdate}';
```
