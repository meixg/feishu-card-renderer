---
"feishu-card-renderer": patch
---

修正折叠面板的边框语义：未配置 `border` 时不再显示边框，配置边框但省略圆角时使用飞书 JSON 2.0 的默认 `5px` 圆角，消费者无需修改现有配置。
