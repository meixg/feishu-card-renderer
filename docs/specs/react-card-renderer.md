# React 飞书卡片 JSON 2.0 渲染器规格

> 状态：已确认
> 日期：2026-07-26
> 协议依据：[飞书卡片 JSON 2.0 Web 渲染器研究](../research/feishu-card-json-v2-renderer.md)

## 1. 目标

提供一个面向 Web 宿主的 React 组件库。宿主向唯一渲染入口传入不可信的飞书卡片 JSON 2.0 完整快照，组件库负责：

- 运行时校验与纯 normalization。
- 协议组件渲染。
- 本地 UI 与表单交互。
- 安全 URL、Markdown、样式和 VChart 处理。
- 向宿主输出标准化动作与诊断。

视觉目标是协议语义一致、行为稳定，并覆盖 PC、mobile、light、dark 与三种宽度模式；不承诺逐像素复制某一版飞书客户端。

## 2. 非目标

- 不支持卡片 JSON 1.0。
- 不支持私有 `tag` 或自定义 tag 注册。
- 不负责飞书鉴权、发消息、真实回调、图片上传或人员目录查询。
- 不伪造完整的 `card.action.trigger` webhook。
- 不直接打开 URL，不直接访问业务网络。
- 不提供命令式 patch、流连接或组件级更新接口。
- 不公开内部 tag 渲染器、React context、注册表或 DOM 结构。
- 不支持输入中的原始 HTML、JavaScript 或任意 CSS。
- 不提供 ECharts 兼容层。

## 3. 发布和运行环境

- React `18.2+` 与 React `19` 为 peer dependency。
- 发布 ESM、TypeScript 类型声明和预编译 CSS。
- 首版不发布 CommonJS，不支持 IE。
- Tailwind 只作为组件库内部开发工具；宿主无需配置 Tailwind。
- `CardRenderer` 必须 SSR-safe，但不是 React Server Component。
- 首个可安装版本为 `0.0.1` public preview；全部规定组件达到完成定义不自动等同于
  稳定性承诺，未来稳定 `1.0` 由单独版本明确承诺。

## 4. 公共接口

`CardRenderer` 是唯一 React 渲染入口：

```ts
export type CardRendererProps = {
  card: unknown
  locale?: string
  colorScheme?: "light" | "dark"
  device?: "pc" | "mobile"
  className?: string
  resolveImage?: ResourceResolver<string>
  resolvePerson?: ResourceResolver<Person>
  onAction?: (action: CardAction) => void
  onDiagnostic?: (diagnostics: readonly CardDiagnostic[]) => void
  fallback?: React.ReactNode | FatalFallback
}

export type ResourceResolver<T> = (
  key: string,
  signal: AbortSignal,
) => T | undefined | Promise<T | undefined>

export type FatalFallback = (
  diagnostics: readonly CardDiagnostic[],
) => React.ReactNode
```

包额外公开纯函数与稳定类型：

```ts
export { CardRenderer } from "@package/feishu-card-renderer"
export { validateCard, normalizeCard } from "@package/feishu-card-renderer/schema"
export type {
  CardAction,
  CardDiagnostic,
  CardJsonV2,
  CardRendererProps,
  Person,
  ValidationResult,
} from "@package/feishu-card-renderer"
```

不公开：

- 单个协议 React 组件。
- 内部组件注册表。
- 渲染 context。
- 表单状态实现。
- VChart 实例。
- 内部 CSS 类名与 DOM 结构。

不提供 `strict` 开关。根对象必须显式声明 `"schema": "2.0"`。

## 5. 动作契约

动作必须可序列化，不包含 DOM 节点或 React 事件：

```ts
export type ActionSource = {
  tag: string
  elementId?: string
  name?: string
  path: string
}

export type CardAction =
  | {
      type: "callback"
      source: ActionSource
      value?: unknown
      formValue?: Record<string, unknown>
      timezone?: string
    }
  | {
      type: "open_url"
      source: ActionSource
      url: string
    }
```

要求：

- `path` 是稳定协议路径。
- 合法且唯一的 `element_id` 优先用作 React identity；否则使用稳定路径。
- 不生成随机 key。
- callback 的 `value` 保留原始业务含义，渲染器不解释、不记录。
- 日期时间动作在浏览器交互发生时携带 IANA 时区。
- 不模拟飞书服务端身份、租户、消息或 token 字段。

缺少 `onAction` 时：

- callback、表单提交和 open_url 以可访问方式禁用。
- 产生一次去重诊断。
- 折叠、预览与菜单开关等本地交互仍可使用。

## 6. 校验与容错

```ts
export type ValidationResult =
  | {
      ok: true
      card: NormalizedCard
      diagnostics: readonly CardDiagnostic[]
    }
  | {
      ok: false
      diagnostics: readonly CardDiagnostic[]
    }
```

### 6.1 Fatal

以下输入无法可靠解释，整卡进入 fallback：

- 根值不是对象。
- 缺失 `schema`。
- `schema` 不为 `"2.0"`。

fatal fallback：

- 宿主可用 `fallback` 替换整卡错误状态。
- fallback 只接收经过脱敏的诊断，不接收完整原始 JSON。
- 未提供时使用内置、可访问且不泄露输入的默认状态。

### 6.2 Recoverable

以下错误产生局部诊断和稳定占位，继续渲染其余内容：

- 未知 tag。
- 非法枚举、颜色、尺寸或 URL。
- 重复或非法 `element_id`。
- 重复表单字段 `name`。
- 非法嵌套。
- 超过元素或容器深度限制。
- 资源解析失败。

协议错误不得抛出 React 树；只有组件库自身的程序错误交给宿主 Error Boundary。

`onDiagnostic` 应在渲染结果提交后批量、去重通知，避免因 React 重渲染重复刷日志。

## 7. 保守协议算法

### 7.1 200 个组件或元素

从 `header` 与 `body` 遍历协议结构，每个带字符串 `tag` 的协议节点计一次，包括：

- 文本。
- 图标。
- `column`。
- 未知 tag。

无 `tag` 的配置对象、behavior、confirm 和表格行数据不计数。

到达第 201 个节点时停止解释后续节点，对超出部分产生 recoverable 诊断和稳定占位。

### 7.2 五层容器

- `body` 不计入容器深度。
- `column_set`、`column`、`form`、`interactive_container`、`collapsible_panel` 每个分别增加一层。
- 展示与交互组件不增加容器深度。
- 进入第六层容器前停止递归，并显示 recoverable 占位。

### 7.3 官方资料冲突

优先级：

1. 最新具体组件子文档。
2. 最新整体结构和更新说明。
3. 仓库 README。
4. 现有实现。

若同一具体文档仍存在冲突，采用更保守的规则，记录 limitation，并增加独立测试。

当前 `form` 内嵌 `chart` 按禁止处理。

## 8. 模块设计

```text
unknown card snapshot
        │
        ▼
┌──────────────────────────────┐
│ schema module                │
│ validate → normalize → model │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ renderer module              │
│ context → registry → view    │
└───────┬──────────────┬───────┘
        ▼              ▼
 interaction       resource adapters
 module            image/person/VChart
        │              │
        └──────┬───────┘
               ▼
          CardAction / UI
```

### 8.1 Schema module

拥有：

- 运行时 schema 与 TypeScript discriminated union。
- fatal/recoverable 分类。
- 元素计数、容器深度、ID 唯一性和嵌套上下文。
- locale、默认值、尺寸、颜色和枚举 normalization。
- 输入不可变性。

未知字段原样忽略。未知 tag 仅保留诊断和占位所需信息。

### 8.2 Renderer module

拥有：

- `CardRenderer`。
- 只读递归 context。
- `ComponentRenderer`。
- 内部 tag 注册表。
- `UnknownComponent`。

tag 分派必须集中在注册表，不创建包含所有 tag 的巨大 switch。

### 8.3 Interaction module

拥有：

- behavior 解析。
- URL 选择与白名单。
- form state。
- confirm 对话框。
- 统一动作生成。
- 本地交互的焦点与冒泡规则。

### 8.4 Resource adapters

图片和人员解析是宿主能力：

- 支持同步或异步结果。
- 接收 `AbortSignal`。
- 同一卡片按 key 缓存。
- key 改变或卸载时取消任务。
- loading、error 与缺少适配器时保持稳定布局。
- 不编造姓名、头像或图片 URL。
- 诊断不暴露资源 key、人员 ID 或内部 URL。

跨卡片缓存由宿主解析器负责，组件库不维护全局多租户缓存。

## 9. 本地状态与更新

- 最近的 `form` provider 以字段 `name` 管理状态。
- submit 先校验 required，再产生一次包含 `formValue` 的动作。
- reset 恢复协议初始值，不是一律清空。
- 表单外交互按协议立即产生动作。
- confirm 取消不产生动作。
- 交互子元素阻止触发父 `interactive_container`。

`card` 是不可变完整快照：

- 宿主通过重新传入新快照更新卡片。
- 不提供 `appendElement()`、`patchCard()` 等命令式接口。
- 字段类型和 form 归属未变时，可按稳定 `name` 保留已编辑值。
- 字段类型或 form 归属变化时恢复新初始值。
- 删除节点时清理其本地状态和异步任务。

## 10. URL 与确认

- 核心包不访问 `window.open`。
- Web/PC 行为优先选择 `pc_url`，再回退 `default_url`。
- 整卡链接遵循官方 `url` 与分端地址优先级。
- `lark://msgcard/unsupported_action` 表示禁止动作。
- 只有白名单协议可形成 `open_url` 动作。

confirm 使用内置可访问对话框：

- 确认后才执行动作。
- 取消和 Esc 不产生动作。
- 管理初始焦点、焦点锁定与焦点恢复。
- 同一时刻最多一个确认框。
- 不使用 `window.confirm`。

## 11. 文本与 Markdown 安全

- `plain_text` 永远作为文本节点。
- `lark_md` 仅实现飞书有限语法。
- `markdown` 解析成结构化节点后按白名单渲染。
- 不支持输入中的原始 HTML。
- 禁止脚本、事件属性、iframe、`javascript:` URL 和任意内联样式。
- `_blank` 链接使用 `rel="noopener noreferrer"`。
- 限制文本长度、嵌套深度、表格规模和解析成本。
- 超长单词、代码块和表格在窄屏内滚动，不撑破卡片。
- `lines` 截断保留可访问的完整文本说明。

基础 Markdown 路径使用 `mdast-util-from-markdown`（CommonMark）和独立的 GFM
删除线扩展。选择依据是：该项目由 unified collective 维护、官方包为 ESM-only、
提供 TypeScript 类型和语法树输出；解析过程不需要 DOM 或网络。没有引入完整 GFM
扩展，因此任务列表与表格不会在此切片中意外启用。语法树只作为内部实现细节，
最终由自有 React 白名单渲染。

有界策略按单个 Markdown 组件计算：最多 20,000 字符、12 层语法深度、1,000
个语法节点，以及合计 200 个链接、图片或列表项。超限保留安全前缀、显示可访问
提示并产生 `markdown_limit_exceeded`；原始/扩展标记、图片和解析失败分别使用
recoverable diagnostic。Markdown 图片从不生成 `img`，只保留 alt 文本。

## 12. VChart

- `chart_spec` 使用 VChart spec，不提供 ECharts 转换。
- `@visactor/vchart` 是正式依赖。
- VChart 构建成独立懒加载 chunk。
- 没有 `chart` 的卡片不加载 VChart。
- SSR 输出稳定占位，客户端挂载后绘制。
- spec 更新时更新或重建实例；卸载时销毁。
- 输入 spec 必须保持纯数据。
- 拒绝函数、危险原型字段、HTML/DOM 扩展和函数注册。
- 不把 npm 最新 VChart 的全部能力宣称为飞书协议兼容范围。

## 13. 图片与图表预览

- `preview: true` 时支持点击和键盘激活。
- 图片使用解析后的资源，不把 `img_key` 当 URL。
- 多图支持上一张、下一张、计数和缩略导航。
- 支持 Esc、焦点锁定和焦点恢复。
- 资源失败仍保持稳定尺寸并呈现可访问替代信息。
- 不提供下载、上传、转发或飞书原图接口。
- 图表预览只放大安全渲染结果。

## 14. 国际化

- `locale` 由宿主传入，默认稳定为 `zh_cn`。
- 核心不读取 `navigator.language`。
- 精确匹配协议国际化内容。
- 未命中时回退对应字段默认内容。
- 不选择 `i18n_*` 中的第一个语言作为隐式回退。
- 内置 UI 首版提供 `zh_cn` 和 `en_us`。
- 未支持的内置 UI locale 回退 `en_us`。

## 15. 样式与主题

- 发布预编译、带前缀和作用域的 CSS。
- 运行时 px、RGBA、列权重使用校验后的 CSS 变量或受控 inline style。
- 不把协议值拼成动态 Tailwind 类名。
- 不使用 Shadow DOM。
- 内部类名和 DOM 结构不稳定。

公开稳定语义变量，例如：

```css
--fcr-font-family
--fcr-color-text
--fcr-color-text-secondary
--fcr-color-surface
--fcr-color-border
--fcr-color-primary
--fcr-radius-card
--fcr-shadow-card
```

## 16. 可访问性

- 使用语义 `button`、`input`、`select`、`table`。
- 所有交互支持键盘和清晰焦点态。
- 折叠面板使用 `aria-expanded` 和稳定控制关系。
- 菜单、确认框和预览层具备合理 ARIA 与焦点管理。
- 图片使用协议 alt；装饰图片使用空 alt，不暴露 img key。
- 颜色不是状态的唯一表达。
- light/dark 下保持合理对比度。
- `prefers-reduced-motion` 下关闭非必要动画。

## 17. 必须支持的组件

容器：

- `column_set` 与内部 `column`
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

每个新 tag 必须先加入运行时 schema、TypeScript union、内部注册表、最小 fixture、完整 fixture 和测试，再实现视觉层。

## 18. 实施阶段

### 阶段 0：工程基线

- React、TypeScript、Vite library mode、Tailwind。
- ESM、类型声明、CSS 与 peer dependencies。
- Vitest、React Testing Library、axe 和视觉回归。

### 阶段 1：协议内核

- 根结构、类型、诊断、稳定路径。
- 纯校验与 normalization。
- 计数、深度、唯一性和嵌套矩阵。

### 阶段 2：基础渲染

- `CardRenderer`、context、注册表和未知占位。
- header、body、`div`、`markdown`、`img`、`hr`。
- 主题、locale、设备、宽度与图片解析。

### 阶段 3：容器

- `column_set` / `column`。
- `interactive_container`。
- `collapsible_panel`。
- `form` provider 骨架。

### 阶段 4：交互与表单

- 全部交互组件。
- submit/reset/required。
- confirm、URL 与 `CardAction`。

### 阶段 5：复杂展示

- `img_combination`。
- `person`、`person_list`。
- `table`。
- 图片与图表预览。

### 阶段 6：VChart

- spec 安全过滤。
- 懒加载、SSR 占位、更新与销毁。
- 飞书支持图表类型的兼容 fixture。

### 阶段 7：1.0

- 全部组件的协议、行为、无障碍与视觉矩阵。
- 公共类型与集成文档。
- 安全审查与发布检查。

## 19. 验收标准

每个 tag 至少覆盖：

- 最小合法结构。
- 全字段结构。
- 默认值。
- 非法枚举、长度与未知字段。
- 允许和禁止的关键嵌套。
- light/dark、PC/mobile、400px/600px/fill。
- 键盘和指针交互。
- 无资源解析器、解析成功与解析失败。

全局必须覆盖：

- 非对象、版本缺失与版本错误。
- 空卡片。
- 200/201 个 tag 节点。
- 五/六层容器。
- 重复或非法 `element_id`。
- 未知 tag 不导致整卡崩溃。
- 输入对象在渲染前后深度相等。
- form submit/reset/required。
- confirm、disabled、URL fallback 与事件冒泡。
- Markdown XSS、危险 URL、非法 RGBA 与非法 px。
- VChart 函数、原型污染和 DOM 扩展不能执行。
- SSR 与 hydration 骨架稳定。

发布前必须通过：

- TypeScript。
- lint。
- 单元测试。
- 组件测试。
- 无障碍测试。
- 受影响的视觉回归测试。
