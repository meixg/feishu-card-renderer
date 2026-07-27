# 基于 shadcn/ui（Base UI）的卡片交互升级规格

> 状态：已确认
> 日期：2026-07-27
> 相关研究：[shadcn/ui（Base UI）交互层研究](../research/shadcn-base-ui-interactions.md)
> 上位规格：[React 飞书卡片 JSON 2.0 渲染器规格](./react-card-renderer.md)

## 1. 背景

当前渲染器使用原生表单控件和自有实现完成确认框、图片预览、overflow 菜单、
焦点陷阱、键盘导航与提示信息。协议行为已经集中在 renderer、interaction 和
form state 中，但视图层交互较简陋，复杂浮层也重复维护了容易出错的焦点、
定位和可访问性逻辑。

本变更引入最新稳定的 shadcn/ui Base UI 组件源码，并以 Base UI 作为 headless
primitive。核对本规格时，shadcn/ui 已将 Base UI 设为新项目默认，Base UI
稳定版为 1.6.0。

这不是把渲染器改造成通用 shadcn 应用。shadcn/Base UI 只作为内部交互视图
实现，飞书卡片 JSON 2.0 协议、normalization、form state 和 `CardAction`
继续由现有模块拥有。

官方依据：

- [shadcn/ui：Base UI 成为默认 primitive](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- [shadcn/ui CLI](https://ui.shadcn.com/docs/cli)
- [shadcn/ui components.json](https://ui.shadcn.com/docs/components-json)
- [Base UI 可访问性](https://base-ui.com/react/overview/accessibility)
- [Base UI composition](https://base-ui.com/react/handbook/composition)

## 2. 目标

- 用 Base UI 已验证的 ARIA、键盘导航、焦点管理、浮层定位和关闭语义替代手写
  复杂交互。
- 保持飞书卡片的紧凑密度、协议语义和 light/dark 视觉语言，同时改善焦点态、
  选中态、错误态、空状态、触控热区、阴影和动效。
- 为单选、多选和人员选择提供仅针对已有 options 的本地搜索。
- 为移动端选择器提供适合软键盘和触控的 Drawer 体验。
- 将所有 shadcn/Base UI 知识收敛到一个内部 UI module，避免协议组件直接依赖
  primitive 细节。
- 继续发布宿主无需 Tailwind 配置的单一预编译 CSS。

## 3. 非目标

- 不增加人员目录查询、远程搜索或其它业务网络请求。
- 不把 shadcn 组件、Base UI 类型、provider 或内部 context 作为公共导出。
- 不引入 React Hook Form、Zod 或第二套表单状态。
- 不为 time/datetime 自建一套日期时间模型。
- 不在本次引入 `@tanstack/react-virtual`。
- 不提供 legacy interaction mode。
- 不承诺兼容旧的内部 DOM、未文档化 CSS class 或视觉快照。
- 不照搬 shadcn 演示站的默认品牌主题。

## 4. 已确认的设计决策

### 4.1 内部实现

shadcn 生成源码归仓库所有，放在内部 UI 目录并允许修改。包入口不导出 Button、
Dialog、Select 等通用 UI。

`CardRenderer`、schema 纯函数和标准化 `CardAction` 仍是调用方使用的 interface。
实现不新增 shadcn/Base UI 相关 props。

### 4.2 视觉方向

采用“飞书语义与密度 + shadcn 交互质感”：

- 保留 `--fcr-*` 语义 token、卡片字号、紧凑间距和主题选择。
- 使用 shadcn `base-nova` 作为源码和结构起点。
- 将颜色、圆角、阴影、焦点、错误和动画映射到 renderer-owned token。
- 不引入全局 shadcn `:root`、`.dark` 或 reset。
- 所有非必要动画在 `prefers-reduced-motion` 下禁用。

### 4.3 不保留旧内部实现兼容层

迁移后的 DOM、内部 class 和辅助节点可以改变。不保留旧对话框、菜单、select
或焦点逻辑的运行时开关，也不同时维护两套实现。

协议输入、form value、required/reset/confirm/disabled 语义和 `CardAction`
仍必须遵守上位规格；允许改变的是内部实现，不是协议含义。

## 5. 工具链和依赖

### 5.1 Tailwind 4 前置迁移

加入 shadcn 组件前，先独立完成 Tailwind CSS 3.4 到 4.x 的迁移。

迁移后的可观察要求：

- 不启用全局 preflight。
- 所有生成样式保持 `fcr` 命名空间和 `.fcr-root` 作用域。
- 不向宿主注入通用 `*`、`:root`、`body`、`.dark` 等规则。
- 继续只发布一个 `dist/styles.css`。
- 宿主无需安装、运行或配置 Tailwind。
- Tailwind 迁移前后的既有视觉用例除明确批准项外保持一致。

不得为了让 shadcn 生成代码通过编译而移除 CSS 隔离。

### 5.2 shadcn 配置

使用当前 CLI，并显式指定 Base UI：

```sh
pnpm dlx shadcn@latest init --base base
```

`components.json` 至少固定：

- Base：`base`
- Style：`base-nova`
- RSC：`false`
- TypeScript：`true`
- CSS variables：`true`
- CSS 入口：`src/styles.css`
- 内部 UI、lib、hooks 和 utils aliases
- `fcr` Tailwind 前缀

运行 `init` 或 `add` 前必须先查看 dry-run/diff；不得无审查覆盖已适配的组件。
后续升级逐组件进行，不使用一条 overwrite 命令覆盖全部内部源码。

### 5.3 发布依赖

- `react`、`react-dom` 继续作为 peer dependencies，并从构建产物 externalize。
- `@base-ui/react` 作为普通 runtime dependency，使用已验证的 1.x 范围，并从
  Vite/Rollup 产物 externalize。
- shadcn wrapper 源码编译进本包。
- `clsx`、`tailwind-merge`、CVA 和实际使用的图标代码可编译进产物。
- Tailwind、PostCSS 和动画 CSS 工具属于构建依赖。
- `dist/index.js` 不得残留源码 alias，也不得打入 React/ReactDOM。
- 构建报告记录迁移前后的 JS/CSS gzip 体积；异常增长必须先定位再合入。

## 6. 模块和 seam

内部 UI module 是协议视图与 Base UI 之间唯一的 seam：

```text
normalized JSON element
          │
          ▼
┌─────────────────────────────┐
│ protocol view               │
│ form state + CardAction     │
└──────────────┬──────────────┘
               │ renderer-owned values/events
               ▼
┌─────────────────────────────┐
│ internal UI module          │  ← small interface
│ fields, overlays, choices   │
│ portal, focus, positioning  │  ← deep implementation
└──────────────┬──────────────┘
               ▼
          Base UI primitives
```

建议目录职责：

```text
src/
  components/
    ui/                 # 可修改的 shadcn Base UI wrapper
    interactive/        # 协议元素到内部 UI interface 的映射
    primitives/         # renderer-specific 组合，如图片预览
  renderer/
    portal.tsx          # 每卡 portal host/context
  interactions/
    form-state.ts       # 协议表单状态，保持 Base UI 无感
```

规则：

- 协议组件拥有 option token、form state、required、confirm 和动作生成。
- UI module 拥有浮层、焦点、键盘、positioning、视觉状态和 ARIA 组合。
- UI module 不接收完整原始卡片 JSON，也不生成 `CardAction`。
- Base UI 的 `render` composition 必须正确转发 ref 和全部 props。
- 禁止产生 button-inside-button 等无效嵌套。
- 测试以可观察角色、值、焦点和 `CardAction` 穿过 module interface；不锁定
  Base UI 内部状态。

## 7. 每卡 portal host

每个成功渲染的 `CardRenderer` 在 `.fcr-root` 内建立稳定的 portal host，并由
只读 context 提供给所有 overlay：

- Alert Dialog
- Dialog
- Dropdown Menu
- Tooltip
- Popover
- Select/Combobox
- mobile Drawer

要求：

- portal 内容继承所属卡片的主题、字体和 `--fcr-*` token。
- 多张卡片的 overlay 生命周期和主题互不共享。
- SSR 渲染和包导入阶段不得读取 `document`。
- portal host 只在客户端 DOM 可用后交给 Base UI。
- 卸载卡片时清理其全部 overlay、监听器和焦点恢复任务。
- portal 中的 React 事件仍沿 React 树传播；交互元素必须阻止触发父
  `interactive_container`，避免产生两个 action。
- overlay z-index 使用 renderer-owned token，不假设宿主页面层级。

## 8. 组件映射

| 飞书能力 | 内部 shadcn/Base UI 组合 | 约束 |
| --- | --- | --- |
| `input` | Field + Input | 保持默认值、max length 和即时字段状态 |
| multiline `input` | Field + Textarea | 保持 rows、required 和窄屏布局 |
| `button` | Button | 协议层仍处理 submit/reset/callback/open_url |
| `checker` | Field + Checkbox | 保持 label 关联和 checked 初始值 |
| `select_static` | Select 或 Combobox | 少量选项用 Select，达到搜索阈值改用 Combobox |
| `select_person` | Combobox | 只搜索已有 option/resolved person 数据 |
| `multi_select_static` | multiple Combobox | 使用 chips，值由协议 token 映射 |
| `multi_select_person` | multiple Combobox | 不查询人员目录 |
| `overflow` | Dropdown Menu | 支持 Arrow/Home/End/Esc、outside press 和 disabled |
| `confirm` | Alert Dialog | 取消不产生 action，确认只执行一次 |
| `date_picker` | PC Date Picker / mobile native date | 值格式不变 |
| `picker_time` | styled native time input | PC/mobile 都保留原生模型 |
| `picker_datetime` | styled native datetime-local | 动作携带浏览器 IANA 时区 |
| `select_img` | Radio/Checkbox semantics | 图片视觉仍由资源 adapter 和 renderer 组合 |
| `collapsible_panel` | Collapsible | 保持稳定控制关系和默认展开状态 |
| 图片预览 | Dialog | 支持缩略图、方向键、关闭和焦点返回 |
| hover/disabled tips | Tooltip/Popover/inline text | Tooltip 不作为唯一重要信息来源 |

`interactive_container` 和 `form` 不套通用 shadcn 外壳；它们继续作为协议行为和
状态容器。

## 9. 选择器行为

### 9.1 值模型

Base UI 的内部 value 不得取代协议 option value：

- 继续为每个 option 使用稳定 path/index token。
- string、number、boolean 和对象型 JSON value 都通过现有安全序列化与结构比较
  映射。
- disabled 或不可序列化的 option 不可选。
- 展示过滤不改变原始 options，不修改 card 输入。
- form state 和 `CardAction` 输出协议值，不输出内部 token。

### 9.2 本地搜索

- 选项少于 8 个时，单选默认使用 Select。
- 选项达到 8 个时，单选使用可搜索 Combobox。
- 多选始终使用可搜索 multiple Combobox。
- 搜索只过滤 JSON 中已有 options，以及 adapter 已解析出的显示信息。
- 搜索不产生 `CardAction`。
- 比较使用 renderer `locale`，并提供一致的大小写与空白处理。
- 无匹配、禁用、人员信息 loading/error 都有可访问状态。

### 9.3 大列表

- 每次最多展示前 100 个匹配项。
- 超过 100 个匹配项时提示用户继续输入以缩小范围。
- 过滤仍针对完整集合，任一合法 option 都可通过搜索找到。
- 已选值不因过滤或 100 项上限丢失。
- 本次不引入虚拟列表；若性能测试证明仍有问题，另立变更。

### 9.4 多选 chips

- 已选项以可移除 chips 呈现。
- chips 过多时限制可见数量，并显示剩余计数，避免撑破 400px 卡片。
- 移除 chip 与从列表取消选择使用同一值更新路径。
- required multi-select 的空数组视为缺失。

## 10. PC/mobile 交互

分支只依据 renderer context 的 `device`，不得读取全局 window 配置决定协议视图。

### 10.1 PC

- Select、Combobox、Dropdown 和 Date Picker 使用锚定 popup。
- popup 必须碰撞检测并保持在可视区域内。
- 400px 卡片和窄 viewport 不产生横向溢出。

### 10.2 Mobile

- 单选、多选和人员选择使用 Base UI 版 shadcn Drawer。
- Drawer 内复用相同 Combobox 数据和值逻辑。
- 搜索输入使用 Base UI virtual keyboard 适配，避免软键盘遮挡结果。
- 单选后自动关闭。
- 多选保持打开并提供“完成”按钮。
- 多选修改即时进入字段状态；关闭 Drawer 不回滚已明确选择的值。
- Drawer 支持下滑、关闭按钮和 Esc 退出，并保持可访问名称。
- date 使用原生移动日期控件；time/datetime 继续原生。

## 11. 表单和校验

保留现有最近 `form` provider，不引入 React Hook Form 或 Zod。UI 按 shadcn
Field 推荐结构组合：

- Field
- FieldLabel
- FieldDescription
- FieldError

required 行为：

1. 初次渲染不显示错误。
2. submit 标记所有缺失的必填字段。
3. 字段设置 `aria-invalid`，错误通过 `aria-describedby` 关联。
4. 聚焦并滚动到第一个无效字段。
5. 用户修正后立即清除该字段错误。
6. reset 恢复协议初始值并清除全部错误。
7. 可提供简短 `role="alert"` 汇总，但不使用 Toast。

不得自行添加协议未定义的 email、日期范围、业务格式等校验。

## 12. Overlay 与动作语义

### 12.1 Confirm

- 使用 Alert Dialog，而不是普通 Dialog 或 `window.confirm`。
- title、description、取消和确认按钮具有可访问名称。
- 取消、Esc 和 outside dismiss 不产生 action。
- 确认后恰好执行一次原待处理动作。
- 关闭后焦点返回原 trigger；trigger 已卸载时使用安全回退。
- Dropdown option 触发 confirm 时，先正确结束菜单状态，再打开 Alert Dialog。

### 12.2 Overflow

- 使用 Dropdown Menu 的 roving focus 和定位能力。
- 覆盖 pointer、Enter/Space、ArrowUp/Down、Home/End、Esc 和 outside press。
- disabled option 不响应任何输入。
- option callback/open_url 继续由 interaction module 生成。

### 12.3 Tooltip

- hover tips 可使用 Tooltip。
- disabled tips 和重要信息必须同时通过 inline text、可聚焦 trigger 或移动端
  Popover 提供，不能只依赖 hover。
- Tooltip 内容不充当缺失的 accessible name。
- 触屏环境不假定 hover 可用。

### 12.4 Dialog 和预览

- Dialog 负责 modal、focus trap、Esc 和焦点返回。
- renderer 继续拥有图片解析、缩略图、当前索引和左右切换。
- 所有图片保持协议 alt 策略，不显示 `img_key`。

## 13. 安全和性能

- 所有 label、description、option text 和错误文本作为 React 文本节点渲染。
- 不把 JSON 字段拼接成 Tailwind class。
- 不执行 option value、callback value、chart spec 或任何输入代码。
- portal 不绕过 URL、Markdown、RGBA、尺寸和资源 URL 白名单。
- 搜索对超长文本和大 options 集合保持有界。
- overlay 数量随当前打开状态有界，关闭/卸载后不得残留 DOM。
- 不记录完整 options、人员 ID、搜索词或 callback value 到生产日志。
- 所有 Base UI 自定义 `render` 节点必须保留库注入的事件和 ARIA props。

## 14. 实施阶段

每个阶段必须独立保持主分支可发布，且通过第 15 节质量门槛后才能进入下一阶段。

### 阶段 1：Tailwind 4 隔离迁移

- 迁移 Tailwind/PostCSS 配置和 CSS 入口。
- 保持 preflight 关闭、`fcr` 前缀、`.fcr-root` 作用域和单一 CSS 产物。
- 添加宿主 CSS 污染测试。
- 固化迁移前后 bundle 和视觉基线。

### 阶段 2：UI module 与 portal foundation

- 添加 `components.json`、内部 `cn` 和最小 Base UI shadcn 源码。
- 建立每卡 portal host/context。
- 验证 SSR import、hydration、多卡片、light/dark 和卸载。
- 加入 Button、Field 等无 overlay 基础 wrapper。

### 阶段 3：Dialog、Alert Dialog、Dropdown、Tooltip

- 替换确认框和图片预览。
- 替换 overflow 菜单。
- 统一 hover/disabled tips。
- 删除被替代的手写焦点、菜单和对话框实现及其过时测试。

### 阶段 4：Select、Combobox 与 mobile Drawer

- 先迁移单选。
- 再迁移 multi-select 和 person variants。
- 加入本地搜索、100 项上限、chips 和移动 Drawer。
- 覆盖对象 option value、required、reset、confirm 和事件冒泡。

### 阶段 5：其余表单控件

- 迁移 Input、Textarea、Checkbox、select_img 和 Field error。
- PC date picker 使用 Popover + Calendar。
- time/datetime 保留原生输入并统一视觉。
- 迁移 Collapsible。

### 阶段 6：整体验收和文档

- 完成 light/dark、PC/mobile 和三种宽度模式视觉回归。
- 记录依赖与 bundle 变化。
- 更新 README、integration、compatibility matrix 和 release notes。
- 删除未使用的旧 CSS、旧 primitive 和测试辅助代码。

## 15. 质量门槛

每阶段必须通过：

- `pnpm typecheck`
- `pnpm lint`
- `pnpm unit`
- `pnpm component`
- `pnpm accessibility`
- `pnpm visual`
- `pnpm build`
- `pnpm site:build`

额外必须覆盖：

### 15.1 SSR 和构建

- Node/SSR 环境可导入包。
- import 阶段不访问 `window` / `document`。
- React/ReactDOM 未打入 bundle。
- 产物没有未解析 alias。
- 消费者只需导入预编译 `styles.css`，无需 Tailwind。

### 15.2 交互

- pointer、键盘和触控等价路径。
- Tab、Shift+Tab、Enter、Space、Arrow、Home、End、Esc。
- 初始焦点、焦点陷阱、关闭后焦点返回。
- outside press、disabled 和 confirm。
- portal 中子交互不触发父 `interactive_container`。
- 多卡片同时打开/关闭 overlay 时相互隔离。

### 15.3 表单

- required 字段级错误、首个错误聚焦和修正后清除。
- submit 只产生一次正确 `formValue`。
- reset 恢复协议初始值。
- 单选、多选、对象 option value 和 chips。
- mobile Drawer 与 PC popup 产生相同协议值。
- date/time/datetime 保持协议格式和 IANA timezone。

### 15.4 可访问性

- 自动 axe 检查。
- 语义 label、description、error 和 live region。
- modal、menu、listbox、combobox、checkbox、radio 和 collapsible 角色正确。
- light/dark 对比度与可见 focus ring。
- reduced motion。
- 至少在真实浏览器中验证关键焦点流程，不只依赖 jsdom。

### 15.5 视觉

- light/dark。
- PC/mobile。
- 400px、600px、fill。
- popup collision、Drawer + soft keyboard、错误态、disabled、空状态和长列表。
- 视觉快照只更新本规格明确改变的交互区域。

## 16. 文档和发布说明

实现完成时同步更新：

- README 的交互能力、依赖和视觉说明。
- `docs/integration.md` 的 CSS、SSR、portal 和宿主集成说明。
- compatibility matrix 中各交互 tag 的支持字段和行为证据。
- release notes 中的 Tailwind 4、Base UI runtime dependency、DOM/视觉变化和体积变化。

研究文档记录外部事实；本规格记录已确认的项目决策。后续官方版本变化若改变上述
事实，先更新研究，再提出规格变更，不直接静默覆盖生成组件。

## 17. 完成定义

只有同时满足以下条件，本 initiative 才算完成：

- 全部第 8 节交互面已迁移，不只完成首批 overlay。
- shadcn/Base UI 保持私有实现，没有公共 UI 导出。
- Tailwind 4 与 overlay CSS 不污染宿主。
- 每卡 portal host 在 SSR、多卡片、主题和卸载场景下稳定。
- form state 和 `CardAction` 仍由协议模块拥有。
- PC/mobile 采用本规格确认的 popup/Drawer/native 混合策略。
- 本地搜索、100 项上限、对象 option value 和多选 chips 可用。
- 无 legacy 模式或重复旧实现残留。
- 第 15 节全部质量门槛通过。
- 文档、兼容矩阵、构建体积和发布说明已同步。
