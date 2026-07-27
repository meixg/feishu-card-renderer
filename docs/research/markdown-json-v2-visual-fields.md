# Markdown JSON 2.0 视觉字段核对

核对日期：2026-07-27。

事实来源优先使用飞书开放平台的 JSON 2.0 Markdown 组件子文档；开放平台当前页面
同时在“使用自定义机器人发送飞书卡片”的完整 JSON 2.0 示例中展示相同结构：

- `text_size`：可选字符串，默认 `normal`。原生语义值为 `normal`、`notation`、
  `heading`；也可引用 `config.style.text_size` 中的名称，该定义按 `default`、
  `pc`、`mobile` 映射回上述原生语义值。
- `text_align`：可选枚举 `left`、`center`、`right`，默认 `left`。
- `icon`：可选对象。`standard_icon` 使用必填 `token` 和可选 `color`；
  `custom_icon` 使用必填 `img_key`。`img_key` 不是 URL。
- `margin`：可选字符串，默认 `0`；接受 1、2、4 值盒模型语法，每值范围
  `[-99, 99]px`，零值在官方示例中可省略单位。本仓库沿用统一安全策略，规范化
  输出只接受显式 `px`。

实现限制：官方没有定义任意未知标准图标 token 的 Web 图形。本渲染器只使用
本地映射，未知 token 使用稳定占位；不会根据客户端截图猜测图标。自定义图标只
通过宿主 `resolveImage` 解析。卡片原生排版是协议一致的 Web 主题，不宣称与某个
飞书客户端版本逐像素一致。

参考：

- https://open.feishu.cn/document/feishu-cards/card-json-v2-components/content-components/markdown
- https://open.feishu.cn/document/feishu-cards/quick-start/send-message-cards-with-custom-bot
