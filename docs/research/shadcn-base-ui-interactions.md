# shadcn/ui（Base UI）交互层研究

核对日期：2026-07-27。

## 结论

可以引入，但这不是“安装一个 shadcn/ui 运行时包”这么简单。shadcn/ui 的交付模型是：
CLI 根据项目配置把可编辑的组件源码、依赖和主题样式写进仓库；组件在本项目中继续维护。
截至核对日期，shadcn/ui 已把 Base UI 设为新项目默认 primitive，官方说明当前稳定版
Base UI 为 1.6.0；Base UI 自身是无样式、无 CSS bundle 的 headless 组件库。
shadcn/ui 官方也明确它不是传统 component library：生成源码成为项目的一部分，
调用方拥有并维护这些代码。

- shadcn/ui 当前状态与 Base UI 默认：
  https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- shadcn/ui 的代码分发模型：
  https://ui.shadcn.com/docs
- Base UI 1.6.0 发布记录：
  https://base-ui.com/react/overview/releases
- Base UI 的 headless/无内置 CSS 定位：
  https://base-ui.com/react/overview/about
- CLI 的 `init` / `add` 行为：
  https://ui.shadcn.com/docs/cli

对本仓库，推荐把采用过程分成两个可独立验证的阶段：

1. 先把 Tailwind 3.4 的隔离方案迁移到 Tailwind 4，并证明发布的 `styles.css`
   不污染宿主页面。
2. 再按交互组件逐个加入 Base UI 版 shadcn 源码，先处理
   Alert Dialog、Dropdown Menu、Select/Combobox、Tooltip/Popover，
   不一次替换所有原生控件。

最新 shadcn Vite/手工安装路径使用 Tailwind 4 的 `@import "tailwindcss"`、
`tw-animate-css` 和 `shadcn/tailwind.css`。官方同时说明旧 Tailwind 3 /
React 18 项目仍可工作，但这只能说明旧项目受支持，不能保证把当前 Base UI
registry 的最新输出直接放进 Tailwind 3 可完整生成样式。

- Vite 安装：
  https://ui.shadcn.com/docs/installation/vite
- 手工安装：
  https://ui.shadcn.com/docs/installation/manual
- Tailwind 4 与 React 19 说明：
  https://ui.shadcn.com/docs/tailwind-v4

## 初始化与 `components.json`

已有 Vite 项目应使用当前 CLI，并显式锁定 Base UI，避免默认值未来变化：

```sh
pnpm dlx shadcn@latest init --base base
pnpm dlx shadcn@latest add button alert-dialog dropdown-menu select combobox \
  checkbox radio-group input textarea field tooltip popover collapsible dialog
```

`init` 会安装依赖、加入 `cn` 工具并配置 CSS variables；`add` 会把组件源码放到
`aliases.ui` 指定的位置。`components.json` 不是运行时配置，只在使用 CLI
增加/更新组件时必需。官方来源：

- https://ui.shadcn.com/docs/cli
- https://ui.shadcn.com/docs/components-json

适合本仓库的配置形态如下；具体 style 应在实现前确定，关键是使用 `base-*`
样式（当前 schema 支持 Base UI 的 Vega、Nova、Maia、Lyra、Mira、Luma、
Sera、Rhea）：

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": false,
  "tsx": true,
  "iconLibrary": "lucide",
  "tailwind": {
    "config": "",
    "css": "src/styles.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": "fcr-"
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks",
    "utils": "@/lib/utils"
  }
}
```

注意：

- Tailwind 4 的 `tailwind.config` 留空；`tailwind.css` 指向实际入口。
- `style`、`baseColor`、`cssVariables` 初始化后不应随意改；官方说明部分选项
  变更需要删除并重新安装组件。
- `rsc: false` 适合当前通用 Vite 库；若为 `true`，CLI 会给 client component
  加 `"use client"`。Base UI 版 popup/form 控件本身仍依赖客户端交互。
- aliases 必须同时能被 TypeScript 和 Vite 解析。当前仓库没有 `@/*` alias，
  实现时必须补齐，或按官方支持的 `package.json#imports` 方案改用 `#...`。
- `prefix` 必须通过实际生成结果验证。当前仓库依赖 `fcr-` 前缀和
  `.fcr-root` 作用域，不能接受未加前缀的通用 utility 或全局 reset。

配置字段和当前允许的 style 值以官方 schema 为准：
https://ui.shadcn.com/schema.json 。alias 与 package imports 的官方说明：
https://ui.shadcn.com/docs/components-json 。

## 源码、依赖与样式机制

shadcn/ui 生成的是项目拥有的 React 源码，不是从一个封装好的 `shadcn/ui`
组件运行时导入。当前 Base UI 版组件源码直接从例如
`@base-ui/react/dialog`、`@base-ui/react/select`、`@base-ui/react/menu`
导入 primitives，再用 Tailwind class、`data-slot` 和状态 data attributes
组成设计系统层：

- 官方 Base UI Dialog 源码：
  https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/dialog.tsx
- 官方 Base UI Select 源码：
  https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/select.tsx
- 官方 Base UI Dropdown Menu 源码：
  https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/bases/base/ui/dropdown-menu.tsx
- Base UI 状态样式 hooks：
  https://base-ui.com/react/handbook/styling

当前手工安装列出的公共依赖包括 `shadcn`、`class-variance-authority`、`clsx`、
`tailwind-merge`、图标库和 `tw-animate-css`；加入具体 Base UI 组件时 CLI
还会加入 `@base-ui/react`。`shadcn/tailwind.css` 提供 Tailwind 4 的共享
状态 variants 与动画；官方 `eject` 可把它内联后移除 `shadcn` 依赖：
https://ui.shadcn.com/docs/cli#eject 。

Base UI 的元素组合 API 使用 `render`，不是 Radix 的 `asChild`。被传给
`render` 的自定义组件必须转发 ref，并把收到的 props 展开到底层 DOM；否则
Base UI 提供的事件、键盘和 ARIA props 会丢失。实现时还要检查默认生成元素，
避免 `button` 嵌套 `button`：
https://base-ui.com/react/handbook/composition 。

本仓库当前情况：

- Tailwind `3.4.17`，使用 `@tailwind` 指令、`tailwind.config.js`、
  `prefix: "fcr-"`、`important: ".fcr-root"`、禁用 preflight。
- Vite library build 生成一个 `dist/styles.css`；包声明所有 CSS 有 side effect，
  并要求消费者显式导入 `@meixg/feishu-card-renderer/styles.css`。
- React / React DOM 是 `>=18.2 <20` peer，开发环境是 React 19.1。
- 当前没有 shadcn、Base UI、CVA、clsx、tailwind-merge、动画或图标依赖。

因此不能直接运行 `init` 后接受所有覆盖。应先提交/记录现有文件，再审查
`package.json`、CSS 入口、Tailwind 配置和每个生成文件的 diff。官方也明确警告
覆盖式更新会覆盖已定制组件：
https://ui.shadcn.com/docs/tailwind-v4 。

## 与现有交互的组件映射

| 卡片能力 / 现状 | 首选 shadcn（Base UI） | 采用说明 |
| --- | --- | --- |
| `button` | Button | 保留现有 `CardAction`、表单 submit/reset、disabled 和冒泡契约，只替换 view primitive。 |
| `confirm` | Alert Dialog | 语义比普通 Dialog 准确；交由 primitive 处理 modal、焦点圈、Esc 和返回焦点。 |
| `overflow` 手写 menu | Dropdown Menu | 替换当前手写箭头/Home/End/Esc/focus 逻辑，并利用 positioning/collision。 |
| `select_static` | Select | 值仍须经过现有 opaque token 映射，不能把对象值直接放进 DOM 字符串。 |
| `multi_select_*` | Combobox（multiple）或直接组合 Base UI multiple Select | shadcn 没有简单的原生 `<select multiple>` 等价视觉；应先做键盘、读屏和窄屏原型再选。 |
| `select_person` | Combobox | 适合搜索/长列表；仍只能显示宿主 `resolvePerson` 提供的数据，不得引入目录查询。 |
| `input` | Field + Input / Textarea | 保留最近 form provider、required 和初始值/reset 语义。 |
| `checker` | Checkbox | 原生 label 关联仍必须存在。 |
| `select_img` | Radio Group / Checkbox 组合 | 图片卡片视觉由仓库实现，primitive 只负责选择语义。 |
| date | Popover + Calendar（可选） | 只适合日期；不能擅自改变协议值格式。 |
| time / datetime | Input（原生 `time` / `datetime-local`） | shadcn 当前无必要引入一套非协议时间模型；继续附带浏览器 IANA timezone。 |
| `hover_tips` / `disabled_tips` | Tooltip，必要时 Popover/inline text | 只作为补充；重要或触屏必须可见/可点。 |
| `collapsible_panel` | Collapsible | 保留稳定的控制关系、默认展开和 reduced-motion 测试。 |
| 图片预览 | Dialog | 可替代当前手写 focus trap；长内容和缩略图仍是仓库业务组合。 |

shadcn 当前组件目录：
https://ui.shadcn.com/docs/components 。Base UI 的官方组件 API：

- Alert Dialog：https://base-ui.com/react/components/alert-dialog
- Dialog：https://base-ui.com/react/components/dialog
- Menu：https://base-ui.com/react/components/menu
- Select：https://base-ui.com/react/components/select
- Combobox：https://base-ui.com/react/components/combobox
- Checkbox：https://base-ui.com/react/components/checkbox
- Tooltip：https://base-ui.com/react/components/tooltip
- Popover：https://base-ui.com/react/components/popover
- Collapsible：https://base-ui.com/react/components/collapsible

Base UI 明确指出 Tooltip 在触摸设备上禁用，且不能替代 accessible name 或重要
说明；重要提示应 inline，空间受限时使用 Popover：
https://base-ui.com/react/components/tooltip 。

## React 18 / 19、SSR、Portal 与可访问性

Base UI 官方支持 React 17 及以上；当前包的 React 18/19 peer 范围可继续保持。
`@base-ui/react` 当前 package manifest 也把 React、React DOM 和相应类型声明为
17/18/19 peers：

- https://base-ui.com/react/overview/about
- https://github.com/mui/base-ui/blob/master/packages/react/package.json

但需要覆盖以下边界：

1. **SSR import 与 hydration**：保持顶层模块在无 `window` / `document` 环境可导入。
   只有 effect 或用户事件可以访问 DOM。Base UI 组件应保持当前官方
   `"use client"` 边界；不要在库入口把整个 schema/validator 变成 client-only。
2. **Portal 容器**：Dialog、Menu、Select、Tooltip、Popover 默认 portal 到
   `body`。本仓库的 CSS variables 和 Tailwind important selector 都在
   `.fcr-root` 下，默认 portal 会丢失主题继承和 scoped selector。
   Base UI Portal 提供 `container`，可传 `HTMLElement`、`ShadowRoot` 或 ref；
   渲染器应通过 context 提供每张卡片的 portal host，所有 popup 统一传入。
   Dialog Portal API：
   https://base-ui.com/react/components/dialog#portal 。
3. **Portal host 必须客户端存在**：官方 Dialog 文档也提醒 SSR 时 portal
   container 必须在客户端存在。服务端首屏不要构造 DOM container：
   https://base-ui.com/react/components/dialog 。
4. **焦点与关闭**：Base UI 处理基础 ARIA、键盘和焦点，但可见
   `:focus-visible`、对比度、label 和实际辅助技术测试仍是调用方责任：
   https://base-ui.com/react/overview/accessibility 。
5. **modal 可退出**：Dialog modal/trap-focus 内必须包含 Close，尤其保证触屏
   读屏用户能退出；确认框要有明确 title/description，取消不产生 action。
6. **嵌套交互和事件**：React 官方说明 portal 只改变物理 DOM 位置，context
   不变，事件仍沿 React tree 冒泡。必须继续验证 interactive container
   子组件阻止冒泡，且不能因 Trigger 包装生成嵌套 button：
   https://react.dev/reference/react-dom/createPortal 。
7. **ID 稳定**：继续使用 React `useId` 或协议稳定 path，不生成随机 ID；
   SSR 与客户端必须使用相同树结构。

## 作为 npm 组件库发布的风险

### 依赖边界

- React / React DOM 继续作为 peer dependencies，避免宿主出现第二份 React。
- 若不向公共 API 暴露 Base UI 类型或 provider，建议将 `@base-ui/react` 作为
  普通 runtime dependency，并在 Vite/Rollup 中 externalize；若要求宿主共享
  Base UI provider 或锁定单一实例，才考虑 peer。无论哪种都应固定已验证的
  1.x 范围，不能使用 `latest`。生成的 UI 源码是本包内部实现，不应把 shadcn
  wrapper 暴露为公共 API。Base UI 自身把 React 声明为 peer，且
  `sideEffects: false`：
  https://github.com/mui/base-ui/blob/master/packages/react/package.json 。
- `class-variance-authority`、`clsx`、`tailwind-merge`、图标库若仍存在于编译后
  JS，应作为 runtime dependency 或明确 bundle；Tailwind、PostCSS、
  `tw-animate-css` 和已 eject 的 shadcn CSS 可作为 build-time dev dependency。
- 构建校验必须检查 `dist/index.js` 没有未解析的 `@/` / `#...` alias，
  也没有把 React 或 React DOM 打入 bundle。

### CSS 与宿主隔离

- 不允许 shadcn 默认的全局 `:root`、`.dark`、`*` border/reset 或 preflight
  污染宿主；所有 theme tokens 应映射/收敛到 `.fcr-root`。
- portal host 要位于主题作用域内，否则 light/dark、字体、颜色、圆角和
  utility selector 会失效。
- `fcr-` 前缀、`.fcr-root` important、`data-slot`/`data-*` variants 和
  Tailwind 4 生成结果必须用构建产物而不是源码推测验证。
- 仍只发布一个明确导入的 `styles.css`，保留 package `sideEffects` 声明；
  不要求消费者运行 Tailwind 扫描本包源码。
- 动画必须保留 `prefers-reduced-motion`；popup 的 z-index 不能假定宿主层级，
  最好允许渲染器级 portal host / z-index token 配置。

### 语义与 API 风险

shadcn 组件是内部 view layer，不能改变飞书 JSON 2.0 的 normalization、
diagnostics、表单状态或 `CardAction`。尤其不能让 Base UI 的 internal value
serialization 取代当前对任意 JSON option value 的安全 token 映射。异步人员/
图片解析也仍由现有 adapter 和 cache 管理。

## 建议的落地顺序与验收

1. Tailwind 4 隔离迁移：保持单 CSS 产物、无 preflight、`fcr-` / `.fcr-root`
   作用域；跑全部现有单测、组件、a11y、视觉与 SSR build import。
2. 加入 `components.json` 与最小生成组件；固定 Base UI style，审查生成依赖。
3. 建立统一 `UiPortalProvider` / portal host，先用 Alert Dialog 和 Dialog
   验证 SSR、主题、焦点返回、嵌套 dialog 与 z-index。
4. 替换 Overflow 为 Dropdown Menu；覆盖 pointer、Enter/Space、
   Arrow/Home/End、Esc、outside click、禁用项、confirm 和事件冒泡。
5. 替换单选，再为多选/person 做 Combobox 原型；保证对象 option value、
   required、reset 和 400px/mobile 不回归。
6. 最后统一 Input/Checkbox/Button/Tooltip/Collapsible 的视觉；Tooltip 只做
   非关键补充信息。
7. 构建产物额外验证：Node/SSR 可导入、React 未被打包、alias 全部解析、
   CSS 无宿主污染、portal 同时支持 light/dark、多卡片和卸载清理。

这条路线能获得 Base UI 已实现的键盘导航、焦点管理、popup positioning 和
ARIA 基础，同时保留本仓库真正的核心：不可信协议输入、稳定 normalization、
统一事件和宿主无关适配器。
