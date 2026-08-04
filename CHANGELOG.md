# 更新日志

## 0.1.2

### Patch Changes

- b250aa7: 修复独立 Markdown 组件将飞书 `<font color="…">` 扩展显示为原始标签的问题；合法颜色现在安全渲染并适配主题，非法属性和未知颜色继续使用可见原文降级，消费者无需修改现有卡片 JSON。
- 25bbb91: 修正折叠面板的边框语义：未配置 `border` 时不再显示边框，配置边框但省略圆角时使用飞书 JSON 2.0 的默认 `5px` 圆角，消费者无需修改现有配置。

## 0.1.1

### Patch Changes

- 51c9722: 修复纵向正文与嵌套容器在省略或错误声明间距时内容粘连的问题，统一使用 8px 默认元素流间距，并补充随包发布的兼容性说明；现有显式间距与外边距配置无需迁移。

## 0.1.0

### Minor Changes

- ef24197: 将 PC 静态选择、人员选择和多选字段迁移到固定的 shadcn `base-nova`
  Select 与 Combobox 视觉，同时保留协议值、人员资源状态、本地化、表单行为和无障碍语义。
- f4adf7c: 将移动端静态选择、人员选择和多选迁移到固定的 shadcn `base-nova` Drawer，
  保留本地化搜索、协议值、表单状态、虚拟键盘适配、逐卡主题与焦点语义。

### Patch Changes

- ba46b4d: 将 PC 日期选择的触发器、Popover 与 Calendar 迁移到固定的 scoped shadcn `base-nova` 视觉，同时保留移动端原生日期及全部时间语义。
- de9de9c: 操作菜单与确认对话框采用固定版本、逐卡作用域的 shadcn/ui 默认视觉，同时保持既有动作、焦点管理、本地化文案与明暗主题行为。
- 4a1c370: 移动端与桌面端的静态单选在少于八个选项时不再显示搜索框，八个及以上选项仍可搜索，消费者无需修改现有卡片配置。
- 00c6e1b: 完成交互视觉迁移的最终收缩：移除共享样式中的旧选择控件主题，固定唯一的 scoped
  shadcn `base-nova` 视觉 owner，并加强公开包、样式作用域与来源清单契约。消费者继续
  只需引入预编译 `styles.css`；窄屏关闭态选择器会安全截断长值与占位文本，选择状态
  图标统一使用具名 Lucide 组合。现有 JSON 2.0、`CardRenderer`、主题变量和动作接口不变。
- a9cdffe: 修复静态多选控件高度异常的问题，使电脑端与移动端保持紧凑一致的输入框尺寸。
- 6334322: 将单图、图片组合与图表预览统一到固定的 shadcn `base-nova` Dialog 和 Lucide 导航控件，同时保留媒体 adapter 状态、替代文本、缩略图、逐卡主题与焦点行为。
- 352d316: 补齐经飞书官方资料验证的 Button `type/size/width`，收紧类型枚举，以可测试的 shadcn 语义组映射按钮类型，并用独立公开 interaction token 保持既有卡片内容视觉不变。
- 352d316: 将输入框、多行文本、勾选器、时间与日期时间输入和图片选择统一到固定的 shadcn `base-nova` 视觉，同时保留既有表单值、校验、重置、确认、资源适配和 `CardAction` 行为。
- 9bd3507: 将折叠面板触发器和可点击容器焦点状态迁移到作用域化的 shadcn 默认视觉，同时保持协议布局与动作行为不变。
- d2a61f3: 将表格分页交互迁移到固定 shadcn/ui Base Nova Pagination/Button 组合，使用本地化
  Lucide 图标按钮并保留语义表格、分页数据、键盘操作与窄卡横向滚动边界。

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
- 在线站点展示最新 `main` 源码，npm `latest` 指向消费者应采用的正式不可变版本。

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
