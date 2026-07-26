# AGENTS.md

本仓库用于实现基于 React + Tailwind CSS 的飞书卡片 JSON 2.0 Web 渲染器。所有自动化代理和贡献者都必须遵守本文件。

## 工作范围

- 只实现飞书卡片 JSON 2.0。
- 不添加 JSON 1.0 兼容层，除非任务明确要求，并且实现与 2.0 代码物理隔离。
- 循环容器只由飞书卡片搭建工具生成，不是可直接消费的 JSON 2.0 运行时组件；不要为它猜测 `tag`。
- 渲染器负责视图、本地交互和标准化事件，不负责飞书鉴权、消息发送、真实回调、图片上传或人员目录查询。
- 协议输入一律视为不可信数据。

## 事实来源

实现前优先核对以下官方文档及其组件子文档：

1. [卡片 JSON 2.0 结构](https://open.larkoffice.com/document/feishu-cards/card-json-v2-structure)
2. [卡片 JSON 2.0 组件概述](https://open.larkoffice.com/document/feishu-cards/card-json-v2-components/component-json-v2-overview)
3. [JSON 2.0 不兼容变更与更新说明](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-breaking-changes-release-notes)
4. 本仓库 [README.md](./README.md) 中的协议摘要

优先级为：最新官方 2.0 组件子文档 > 最新官方整体结构 > README > 现有实现。若官方资料与仓库冲突，先在代码、类型、fixture、README 中同步修正，不要只修一个 React 组件。

不要根据飞书客户端截图反推未记录的协议行为。无法确认的行为应作为显式 limitation 或 extension point，而不是伪装成官方兼容。

## 协议硬约束

- 严格模式要求根对象的 `schema` 为 `"2.0"`。
- JSON 2.0 当前只支持共享卡片，`config.update_multi` 只接受 `true`。
- 单卡最多 200 个组件或元素。
- 容器最多嵌套五层。
- `element_id` 若存在，必须全卡唯一、以字母开头、只含字母/数字/下划线、最多 20 字符。
- `header` 在顶层且最多一个；若存在，`header.title` 必填。
- `form`、`table` 只能直接位于 `body.elements`。
- `form` 不得包含 `form` 或 `table`，并至少包含一个 `form_action_type: "submit"` 按钮。
- `table` 不得包含其它卡片组件。
- `column`、`interactive_container` 不得包含 `form` 或 `table`。
- `collapsible_panel` 不得包含 `form`。
- `multi_select_static`、`multi_select_person` 只能位于 `form`。
- `select_img` 在表单外只能单选，在表单中才能多选。
- JSON 2.0 不使用 `tag: "action"` 交互模块；交互组件直接放入 `elements`。

校验失败分为两类：

- fatal：根值不是对象、严格模式版本错误等，无法可靠解释。
- recoverable：未知 tag、非法枚举、重复 ID、非法嵌套等。输出诊断并用稳定占位继续渲染其它内容。

## 必须覆盖的组件

容器：

- `column_set` 和内部 `column`
- `form`
- `interactive_container`
- `collapsible_panel`

展示：

- 顶层 `header`
- `div`
- `markdown`
- `img`
- `img_combination`
- `person`
- `person_list`
- `chart`
- `table`
- `hr`

交互：

- `input`
- `button`
- `overflow`
- `select_static`
- `multi_select_static`
- `select_person`
- `multi_select_person`
- `date_picker`
- `picker_time`
- `picker_datetime`
- `select_img`
- `checker`

新增组件必须先加入运行时 schema、TypeScript discriminated union、组件注册表、最小 fixture、完整 fixture 和测试，再实现视觉层。

## 推荐目录约定

前端工程初始化后，优先使用以下边界；如现有结构不同，保持等价职责，不要为了目录名大规模重构：

```text
src/
  schema/
    card.ts
    components.ts
    normalize.ts
    validate.ts
    diagnostics.ts
  renderer/
    CardRenderer.tsx
    ComponentRenderer.tsx
    registry.ts
    context.ts
    UnknownComponent.tsx
  components/
    containers/
    content/
    interactive/
    primitives/
  interactions/
    behaviors.ts
    form-state.ts
    url.ts
  adapters/
    image.ts
    person.ts
    icon.ts
    chart.ts
  styles/
    tokens.ts
    lengths.ts
  fixtures/
```

不要创建一个包含所有 tag 的巨大 switch 组件。tag 到组件的分发集中在注册表；组件内部只处理自身协议和渲染。

## 渲染契约

顶层 API 应保持宿主无关，建议形态：

```ts
type CardRendererProps = {
  card: unknown
  locale?: string
  colorScheme?: "light" | "dark"
  device?: "pc" | "mobile"
  strict?: boolean
  resolveImage?: (imgKey: string) => string | Promise<string | undefined>
  resolvePerson?: (id: string) => Person | Promise<Person | undefined>
  onAction?: (action: CardAction) => void
  onDiagnostic?: (diagnostic: CardDiagnostic) => void
}
```

要求：

- 不修改 `card` 输入对象。
- normalization 是纯函数，集中填默认值。
- 递归渲染通过只读 context 传递 locale、主题、设备、表单和容器深度。
- React `key` 优先用合法且唯一的 `element_id`，否则使用稳定路径；禁止随机 key。
- 未知字段原样忽略，便于协议向前兼容。
- 未知 tag 使用 `UnknownComponent`，开发模式展示 tag 和路径，生产模式保持布局稳定。
- 不允许组件直接访问全局 window 配置或发网络请求。

## 样式规则

- 固定协议枚举映射到静态 Tailwind class。
- 运行时 px、RGBA、列权重通过严格解析后写入 CSS 变量或受控 inline style。
- 禁止把输入拼接成动态 Tailwind 类名，例如 `p-${value}` 或 `text-${color}`。
- `padding` 只接受 0–99px 的 1、2、4 值语法。
- `margin` 只接受 -99–99px 的 1、2、4 值语法。
- spacing 支持 `small`、`medium`、`large`、`extra_large` 和合法 px。
- 自定义颜色只接受可验证的 RGBA，并按 light/dark mode 选值。
- 自定义字号通过 `config.style.text_size` 名称解析，未知名称回退 `normal`。
- `width_mode` 必须覆盖 default 600px 上限、compact 400px 和 fill。
- 不依赖飞书站点的私有 CSS 或远程运行时代码。

视觉目标是协议一致和行为稳定，不是逐像素复制某一个飞书版本。所有近似实现都要在测试或文档中可见。

## 文本和 Markdown

- `plain_text` 永远作为文本节点渲染。
- `lark_md` 使用有限语法白名单，不要当成完整 Markdown。
- `markdown` 可支持更完整的飞书富文本语法和扩展标签，但必须解析后消毒。
- 禁止把输入直接交给未配置白名单的 `dangerouslySetInnerHTML`。
- 链接协议只允许明确白名单，如 `https:`、`http:` 和经宿主允许的飞书 deep link。
- `_blank` 链接必须配合 `rel="noopener noreferrer"`。
- 代码块、超长单词、列表和表格在窄屏下不得撑破卡片。
- `lines` 使用可靠的 line-clamp，并保留可访问的完整文本提示策略。

## 资源适配

- `img_key` 不是 URL。只通过 `resolveImage` 解析。
- 图标 token 通过本地映射或注入适配器解析；未知 token 使用固定尺寸占位。
- 人员 ID 通过 `resolvePerson` 解析；无数据时不得编造姓名或头像。
- `chart_spec` 作为纯数据交给 VChart 兼容层，禁止执行其中的 JavaScript。
- 图表、图片、人员解析应支持 loading、error 和 abort/unmount 状态。
- 异步结果需按 key 缓存，避免同一卡片重复请求。

## 交互规则

所有用户动作统一为 `CardAction`，通过 `onAction` 交给宿主。组件不能自行调用业务 API。

- `open_url`: Web 端优先 `pc_url`，回退 `default_url`；旧结构中的 `multi_url` 优先 `url` 规则见 README。
- `callback`: 传出 behavior `value`、组件 tag/name/elementId 和当前必要状态。
- `confirm`: 行为执行前展示确认对话框；取消不产生 action。
- `disabled`: 不响应鼠标、触摸或键盘交互；仍应正确暴露禁用语义。
- `hover_tips` / `disabled_tips`: 鼠标提示不能成为唯一的信息来源。
- 交互容器含交互子元素时，子元素阻止冒泡，避免双重触发。

表单：

- 状态由最近的 `form` provider 管理，以组件 `name` 为键。
- `name` 在全卡表单交互组件中必须唯一。
- 初始值来自 `default_value`、`initial_*`、`selected_values`、`checked` 等协议字段。
- `submit` 先校验必填，再产生一次 `formValue`。
- `reset` 恢复协议初始值，而不是一律清空。
- 表单外的交互组件按各自协议立即触发。
- 日期时间 action 携带浏览器 IANA 时区；不得隐式使用服务端时区。

## 可访问性

- 使用语义 HTML：button、input、select、table，不用可点击 div 代替。
- 所有交互都支持键盘和清晰焦点态。
- 折叠面板使用 `aria-expanded` 和稳定的控制关系。
- 菜单和弹窗需要焦点管理、Esc 关闭和合理的 ARIA 标签。
- 图片使用协议 `alt.content`；缺失时根据装饰性用途使用空 alt，而不是文件 key。
- 颜色不是状态的唯一表达方式。
- 深浅主题下文本和交互控件满足合理对比度。
- `prefers-reduced-motion` 下禁用非必要动画。

## 安全

- JSON、Markdown、URL、RGBA、尺寸、图片地址和图表定义均视为不可信。
- 禁止 `eval`、`new Function`、脚本标签和事件处理属性注入。
- 限制递归深度、元素数量、文本长度和复杂富文本解析成本。
- 不记录完整用户输入、人员 ID 或 callback value 到生产日志。
- 资源加载错误不得暴露鉴权 token 或内部 URL。
- 打开 URL 之前进行协议白名单校验；`lark://msgcard/unsupported_action` 表示禁止动作。

## 测试要求

每个 tag 至少包含：

- 最小合法结构。
- 包含所有支持字段的完整结构。
- 缺失可选字段的默认值。
- 非法枚举、非法长度和未知字段。
- 所有允许与禁止的关键嵌套上下文。
- light/dark、PC/mobile、400px/600px/fill。
- 键盘与指针交互。
- 无适配器、适配成功、适配失败。

全局必须覆盖：

- 非对象输入、版本缺失、版本错误。
- 空卡片。
- 200 元素边界和超限。
- 五层容器边界和超限。
- 重复或非法 `element_id`。
- 未知 tag 不导致整卡崩溃。
- 输入对象在渲染前后深度相等。
- form submit/reset/required。
- confirm、disabled、URL fallback 和事件冒泡。
- Markdown XSS、危险 URL、非法 RGBA 和非法 px 输入。

优先使用单元测试验证 normalization、校验和事件；使用组件测试验证交互；使用视觉回归验证布局和主题。不要只依赖快照测试。

## 变更流程

1. 阅读相关官方 2.0 子文档和 README 对应章节。
2. 明确变更属于协议、normalization、视图、交互还是适配层。
3. 先补或更新 fixture 与测试。
4. 实现最小范围改动，避免顺手重构无关组件。
5. 运行类型检查、lint、单测、组件测试和受影响视觉用例。
6. 若协议认识发生变化，同步更新 README 和本文件中的硬约束。

不要覆盖用户未提交的无关改动。不要为了让测试通过而静默放宽安全校验或删除诊断。

## 完成定义

一个组件或协议能力只有在以下条件全部满足时才算完成：

- 运行时 schema 和 TypeScript 类型已覆盖。
- 默认值与非法值策略明确。
- 在所有官方允许的容器上下文中可渲染。
- 非法嵌套有诊断。
- light/dark、PC/mobile 和三种宽度模式可用。
- 键盘和屏幕阅读器语义合理。
- 交互通过统一 `CardAction` 输出。
- 不执行输入中的代码，不绕过 URL/HTML/样式白名单。
- fixture、行为测试和必要的视觉回归已加入。
- README 与官方文档链接保持同步。

## Agent 技能

### Issue tracker

本仓库使用 GitHub Issues 跟踪需求和任务。详见 `docs/agents/issue-tracker.md`。

### 分诊标签

本仓库使用 Matt Pocock 工程技能的默认五类分诊标签。详见 `docs/agents/triage-labels.md`。

### 领域文档

本仓库采用单上下文布局，在根目录维护 `CONTEXT.md`，在 `docs/adr/` 中维护架构决策记录。详见 `docs/agents/domain.md`。
