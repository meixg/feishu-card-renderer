---
"feishu-card-renderer": patch
---

修复独立 Markdown 组件将段落内单个换行符折叠为空格的问题，使多行内容按可见 soft break 渲染，消费者无需修改现有卡片 JSON。
