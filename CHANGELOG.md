# 更新日志

## 0.0.2

### Patch Changes

- 35706ad: 明确在线站点展示最新 `main`，而 npm `latest` 才是消费者应采用的正式不可变发布版本。

本文件记录 `feishu-card-renderer` 面向使用者的版本变化。项目从 `0.0.1` 开始记录，
不补写不存在的历史版本。后续版本由 Changesets Release PR 聚合维护；版本级别与
发布说明以 `.changeset/*.md` 为唯一事实来源。

## 0.0.1

首个 public preview，提供可安装的 React 飞书卡片 JSON 2.0 Web 渲染器。

### 已提供

- 严格校验、纯 normalization、可恢复诊断，以及 200 元素、五层容器等安全边界。
- JSON 2.0 标题、容器、展示与交互组件的 React 渲染，支持表单状态、
  `CardAction`、light/dark、PC/mobile 和三种宽度模式。
- 有界且消毒的 Markdown、本地交互、图片与人员 resolver，以及纯数据 VChart
  兼容层。
- ESM 根入口、独立纯 schema 子路径、TypeScript 声明和单一预编译 CSS；
  React 18.2–19 作为 peer dependency，根入口支持 SSR 导入。

### 已知限制

- 只支持飞书卡片 JSON 2.0，不兼容 JSON 1.0、旧 `tag: "action"` 或搭建工具循环容器。
- 不负责飞书鉴权、消息发送、真实回调、图片上传或人员目录查询。
- Web 视觉目标是协议一致和行为稳定，不承诺逐像素复制飞书客户端。
- 部分官方视觉字段、真实移动端软键盘/IME/Safari viewport 差异和飞书未公开的
  VChart 默认行为仍属明确限制，详见集成指南与兼容矩阵。

### 0.x 兼容策略

`0.x` 是 public preview。补丁版本用于兼容修复和小幅改进；次版本用于新增公共能力，
也可能包含明确记录的破坏性变更。公共兼容边界包括文档化 exports、React props、
TypeScript 类型、schema 行为、动作与诊断、CSS 入口和支持的 JSON 2.0 语义。
内部 DOM、未文档化 class、Base UI 属性、fixture 与像素级快照不属于兼容承诺。
稳定 `1.0` 将在未来单独明确承诺，不由本版本暗示。
