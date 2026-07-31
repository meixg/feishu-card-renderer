---
"feishu-card-renderer": patch
---

完成交互视觉迁移的最终收缩：移除共享样式中的旧选择控件主题，固定唯一的 scoped
shadcn `base-nova` 视觉 owner，并加强公开包、样式作用域与来源清单契约。消费者继续
只需引入预编译 `styles.css`；窄屏关闭态选择器会安全截断长值与占位文本，选择状态
图标统一使用具名 Lucide 组合。现有 JSON 2.0、`CardRenderer`、主题变量和动作接口不变。
