role: assistant
content:
**调度配置专家 → PlanManager**

收到。接下来我将针对DWD层和DWS层的表产出逻辑，配置任务的依赖关系与执行周期，以保证数据的及时性。

[STEP: 调度配置专家 | loading]

任务调度已完成配置

- **依赖关系**：ods_user_login_log & ods_user_active_event -> dwd_user_event_detail_di -> dws_user_dau_dd。
- **执行周期**：日调度 (Daily)，凌晨 00:30 开始执行。