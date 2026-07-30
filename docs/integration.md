# Public preview 集成指南

## 安装

```bash
pnpm add feishu-card-renderer react react-dom
```

项目在线站点直接从最新 `main` 部署，可能展示尚未正式发布的能力。生产集成应以
npm `latest` 指向的不可变版本及其随包文档为准，不要把在线站点当作版本化制品。

包仅发布 ESM、TypeScript 声明和预编译 CSS。React/ReactDOM 是 peer
dependencies。`@base-ui/react`、`react-day-picker`、CVA、`clsx` 和
`tailwind-merge` 是包的 runtime dependencies，由包管理器自动安装；它们没有
公共 provider 或类型契约。Tailwind CSS 4 和 PostCSS 只在本仓库构建时使用，
宿主不需要安装、扫描或配置 Tailwind。应用入口必须加载一次样式：

```tsx
import {
  CardRenderer,
  type CardAction,
  type CardDiagnostic,
  type CardJsonV2,
  type Person,
} from "feishu-card-renderer";
import "feishu-card-renderer/styles.css";
```

不依赖 React 的校验、normalization 和协议类型从独立子路径导入：

```ts
import {
  normalizeCard,
  validateCard,
  type Card,
  type CardJsonV2,
  type CardDiagnostic,
} from "feishu-card-renderer/schema";
```

稳定类型 `CardJsonV2` 可从包根导入；纯 schema 使用者也可从
`feishu-card-renderer/schema` 导入。它与 `Card` 表示同一个 JSON 2.0 根类型。

## 最小集成

```tsx
function CardHost({ payload }: { payload: unknown }) {
  return (
    <CardRenderer
      card={payload}
      locale="zh_cn"
      colorScheme="light"
      device="pc"
      onAction={(action: CardAction) => {
        console.log(action.type);
      }}
      onDiagnostic={(diagnostics: readonly CardDiagnostic[]) => {
        // 生产日志只记录 code/path，不记录完整卡片或 callback value。
        diagnostics.forEach(({ code, path }) => console.warn(code, path));
      }}
    />
  );
}
```

`card` 是 `unknown`，渲染器不会修改输入。渲染器始终要求根对象显式声明
`"schema": "2.0"`，不提供关闭版本边界的开关。fatal 错误可通过 `fallback` 定制整卡降级；
recoverable 错误保留稳定占位和诊断，公共 API 不允许逐 tag 绕过校验。

## 公共 API

1. 包根 React 入口：`CardRenderer`、`CardRendererProps`，以及稳定协议类型
   `CardJsonV2`。
2. `feishu-card-renderer/schema` 纯函数：`validateCard`、
   `normalizeCard`、`isCardElement`、`isCardComponentTag`、`childPath`。
3. 协议与宿主类型：`Card`（别名 `CardJsonV2`）、`CardElement`、`CardComponentTag`、
   `CardDiagnostic`、`ValidationResult`、`CardAction`、`Person`。
4. 资源 seam：`resolveImage(imgKey, signal)`、
   `resolvePerson(id, signal)`；允许同步或异步返回，也允许返回 `undefined`
   表示不可解析。resolver 必须把 `AbortSignal` 传给自身的 fetch/SDK 请求，并在
   `signal.aborted` 或 `abort` 事件发生后尽快停止工作。

没有公共的鉴权、网络请求、上传、人员目录、消息发送或真实回调 API。

## 资源与动作

`img_key` 不是 URL，人员 ID 也不是显示名。只通过宿主 resolver 解析。
resolver 返回同样按不可信资源处理；失败、缺失和卸载会得到稳定占位，同一卡片按
resolver 身份与 key 缓存解析结果。宿主切换 resolver（例如租户/session 变化）时，
渲染器会隔离新缓存并 abort 旧 resolver 的未完成请求。`CardAction` 是可序列化的本地动作，不包含租户、操作者、消息、
token 等飞书平台上下文。`open_url` 已通过协议白名单，但最终导航仍由宿主决定。

```tsx
<CardRenderer
  card={payload}
  resolveImage={async (imgKey, signal) => {
    const response = await fetch(`/card-images/${imgKey}`, { signal });
    return response.ok ? response.url : undefined;
  }}
  resolvePerson={async (id, signal) => {
    return directoryClient.lookup(id, { signal });
  }}
/>
```

## SSR 与构建

SSR 可安全输出卡片结构；图表只输出稳定占位，浏览器挂载后才懒加载独立 VChart
chunk。宿主 CSP 应继续禁止非预期脚本来源。不要全局覆盖 `.fcr-*` 内部样式。
发布构建固定使用 Markdown 字符实体解码器的无 DOM 条件导出；根 ESM 入口在没有
`document` 的 Node 环境可直接导入，导入期间不会发起 `fetch` 或其它网络请求。

每张成功渲染的卡片会在自己的 `.fcr-root` 内输出一个稳定 portal host。服务端只
输出空 host 和关闭状态的 overlay 树；hydration 复用同一 host，客户端 effect
取得 DOM 后，Alert Dialog、Dialog、Menu、Select/Combobox、Drawer 和 Popover
才把内容放入其中。这样 portal 继承所属卡片的 light/dark、字体和 `--fcr-*`
token，多张卡片不会共享 host。卸载一张打开 overlay 的卡片会同时移除其 portal、
焦点陷阱和 inert 状态，不影响页面中的其它卡片。

宿主主题只通过文档化变量定制，例如：

```css
.my-card-theme.fcr-root {
  --fcr-color-primary: oklch(0.6 0.2 250);
  --fcr-color-primary-contrast: oklch(0.98 0 0);
  --fcr-color-surface: oklch(0.96 0.02 250);
  --fcr-color-text: oklch(0.2 0.03 250);
  --fcr-color-text-secondary: oklch(0.45 0.03 250);
  --fcr-color-border: oklch(0.82 0.03 250);
  --fcr-color-danger: oklch(0.58 0.22 25);
  --fcr-radius-card: 0.625rem;
  --fcr-interaction-primary: oklch(0.6 0.2 250);
  --fcr-interaction-primary-foreground: oklch(0.98 0 0);
  --fcr-interaction-focus: oklch(0.65 0.03 250);
  --fcr-interaction-danger: oklch(0.58 0.22 25);
}
```

把 `my-card-theme` 作为 `CardRenderer.className` 传入后，卡片 root 与该卡自己的
portal 内容会同步继承这些值。未在本文档列出的内部 `--fcr-ui-*` 映射、原始
shadcn token 和 Base UI `data-*` 都不是公共接口。

`--fcr-color-*` 保持既有卡片内容、Markdown、Chart 与容器主题；Button 和后续
interaction view 使用独立、稳定的 `--fcr-interaction-background`,
`-foreground`, `-primary`, `-primary-foreground`, `-secondary`,
`-secondary-foreground`, `-muted`, `-border`, `-input`, `-focus`,
`-danger`, `-radius`。默认值为 base-nova neutral，其中 focus ring 在 light 为
`oklch(0.708 0 0)`、dark 为 `oklch(0.556 0 0)`，不会隐式跟随 primary。

confirm 使用文档级单活动 modal 协调。正常用户输入只能到达当前 modal；若宿主
程序化请求另一张卡的 confirm，renderer 会先取消旧 confirm（不产生 action），
再激活新 confirm。退出动画期间两个 portal DOM 可以短暂同时挂载，但只有新
modal 保持 focus trap，旧 modal 不会把新卡互相设为 inert。

发布构建只有一个 `dist/styles.css`，所有普通选择器均受 `.fcr` 命名空间约束，
不包含 Tailwind preflight、通用 `:root`、`body` 或未作用域 reset。库构建将
React/ReactDOM、Base UI、Calendar、CVA、`clsx` 和 `tailwind-merge`
externalize；包内 shadcn wrapper 仍会编译进 `dist/index.js`，且产物不得含
`@/` 或 `#` 源码 alias。Lucide 只通过具名 import 使用，并由构建器 tree-shake
进包；消费者不需要 shadcn、Tailwind 或 Lucide 配置。

## Base UI 交互集成

- PC 的菜单、选择器和日期使用锚定 popup；mobile 选择器使用 Drawer，time 与
  datetime 保持浏览器原生输入。
- 本地搜索不发出 `CardAction`，最多展示前 100 个匹配项；协议 option value
  始终经过内部 opaque token 往返，对象值不会变成 DOM 字符串。
- 所有 overlay 仍通过协议层生成动作。portal 中的子交互会阻止父
  `interactive_container` 冒泡，confirm 取消不产生 action。
- required submit 聚焦第一个错误字段；修正后清除字段错误；reset 恢复协议初始值。

Base UI 是私有实现细节。本版本不兼容旧的内部 DOM、未文档化 `.fcr-*` class、
Base UI `data-*` 属性或历史视觉快照，也不提供旧交互模式。公共 React props、
schema 子路径、协议值和 `CardAction` 才是集成兼容边界。

Input、Textarea、Field、Label、Checkbox、RadioGroup、Checker、原生
time/datetime 与 `select_img` 的视觉来自固定 `base-nova` 适配。宿主不应覆盖这些
内部 wrapper class；品牌色只通过 `--fcr-interaction-*` 调整。表单说明和
placeholder 的次要前景色可在目标 `.fcr-root` 上覆盖
`--fcr-interaction-muted-foreground`，覆盖只作用于该卡且不需要定义任何
`--fcr-color-*` 内容 token。图片选择中的图片、
文字、resolver loading/error 占位和卡片宽度布局仍由 renderer 管理，shadcn
wrapper 只负责选择状态。原生 time/datetime 仍输出浏览器 IANA 时区，宿主无需也
不能通过样式 token 改变协议值。

## Public preview 限制

- 仅支持 JSON 2.0；不读取 1.0 根级 `elements` 或 `i18n_elements`。
- 不模拟 7.20 以前客户端，不支持搭建工具专用循环容器。
- Web 视觉目标是协议一致，不承诺复制某个飞书客户端版本的私有设计 token。
- 同一页面只应让最上层 modal 接受用户输入；Base UI 会按标准模态语义把其它内容
  设为 inert。宿主切换 confirm 时 renderer 会执行单活动 modal handoff；卸载
  当前卡片后，其 modal 状态会清理，剩余卡片可继续交互。
- mobile Drawer 自动化用例在桌面 Chrome 中注入可派发 `resize` 的
  `visualViewport`，验证 390×844 layout viewport 收缩到 390×420 visual
  viewport 后的 bounds、横向 overflow、焦点保持和关闭后焦点返回。这是确定性的
  viewport/inset 模拟证据，不会启动真实 iOS/Android 键盘、IME、浏览器地址栏或
  Safari viewport 行为；发布到移动宿主前仍需真实设备人工验证这些 OS 集成差异。
- 独立 `markdown` 与 `lark_md` 使用不同解析路径；后者仍仅支持既有有限语法。
  原始 HTML 和未知飞书扩展标签不会执行，而是显示可见原文；远程 Markdown
  图片不会加载，只保留 alt 文本。代码语言仅显示文本标签，不提供语法高亮。
- 官方没有形式化 200 元素和五层容器的完整计数算法；实现采用 README 所述保守规则。
- 官方对 `form` 内 `chart` 的文档存在冲突；当前版本保守拒绝并产生 recoverable 诊断。
- VChart 兼容范围是飞书文档列出的基线，不等同于 npm 最新 VChart 的全部 spec；
  不复制飞书未公开的默认 media 规则，也不支持其列出的移动端受限图形能力。
- 资源失败 UI、未知字段降级和 fatal/recoverable 分类是本仓库契约，不代表飞书
  客户端的逐像素行为。
- 当前版本会透传但不宣称支持尚未形成完整类型与渲染语义的官方视觉字段：
  `column_set.direction/flex_mode/background_style`、`div.width/icon`、
  `img.scale_type/size/transparent/preview`、
  `img_combination.combination_transparent` 与图片项 `transparent`、
  `person.style`、`person_list.drop_invalid_user_id`、`chart.color_theme`、
  `table.freeze_first_column/header_style`、
  `checker.checked_style/button_area`，以及 multi-select/date-time picker 当前
  未消费的 `placeholder`、`select_img.required`。它们不在当前版本
  `completeFields` 中；宿主不得把
  未知字段原样保留误解为渲染兼容。

## 从 JSON 1.0 或早期占位版迁移

1. 把正文从根级 `elements` 移到 `body.elements`，添加 `"schema": "2.0"`。
2. 删除 `tag: "action"` 容器，把交互组件直接放入 `elements`。
3. 把旧回调/跳转转换为 2.0 `behaviors`；通过 `onAction` 接收标准化动作。
4. 不再把 `img_key` 当 URL，也不从人员 ID 猜姓名；改为注入 resolver。
5. 显式引入 `styles.css`，按 discriminated `CardAction.type` 处理动作。
6. 上线前运行 `validateCard`；版本边界和安全校验不可关闭，不要通过放宽校验迁移旧输入。
