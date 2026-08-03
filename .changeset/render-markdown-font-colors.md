---
"feishu-card-renderer": patch
---

修复独立 Markdown 组件将飞书 `<font color="…">` 扩展显示为原始标签的问题；合法颜色现在安全渲染并适配主题，非法属性和未知颜色继续使用可见原文降级，消费者无需修改现有卡片 JSON。
