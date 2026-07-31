# Feishu Card Renderer

一个用于在 React 应用中渲染飞书卡片 JSON 2.0 的 Web 渲染器。

适合在管理后台、消息归档、卡片编辑器或 Web 预览页中展示飞书卡片，提供运行时校验、组件渲染、主题适配、表单状态和本地交互能力。你只需要传入卡片 JSON。

项目主页与全部组件实时演示：
[meixg.github.io/feishu-card-renderer](https://meixg.github.io/feishu-card-renderer/)

主页内置 Playground，可直接粘贴卡片 JSON，实时查看 Light/Dark、PC/Mobile
渲染效果、协议诊断和本地交互结果。输入只在当前浏览器中处理，不会上传。

> 本项目是 Web 渲染器，不是飞书消息 SDK。它不会发送消息、上传图片、查询人员目录或调用飞书业务回调；这些能力由你的应用接入。

## 安装

```bash
pnpm add feishu-card-renderer react react-dom
```

项目发布 ESM、TypeScript 类型和预编译 CSS，支持 React 18.2 至 19。复杂交互由
包内私有的 shadcn/Base UI 视图层实现，相关运行时依赖会随本包安装；使用者不需要
安装、扫描或配置 Tailwind CSS。

## 快速开始

在应用入口加载一次样式，然后把飞书卡片 JSON 传给 `CardRenderer`：

```tsx
import { CardRenderer } from "feishu-card-renderer";
import "feishu-card-renderer/styles.css";

const card = {
  schema: "2.0",
  header: {
    title: {
      tag: "plain_text",
      content: "今日进展",
    },
    template: "blue",
  },
  body: {
    elements: [
      {
        tag: "markdown",
        content: "**3 项任务**已完成，剩余 1 项。",
      },
      {
        tag: "button",
        text: {
          tag: "plain_text",
          content: "查看详情",
        },
        behaviors: [
          {
            type: "open_url",
            default_url: "https://example.com/tasks",
          },
        ],
      },
    ],
  },
};

export function CardPreview() {
  return (
    <CardRenderer
      card={card}
      locale="zh_cn"
      colorScheme="light"
      device="pc"
      onAction={(action) => {
        if (action.type === "open_url") {
          window.open(action.url, "_blank", "noopener,noreferrer");
        }
      }}
    />
  );
}
```

渲染器不会自动打开链接或发送回调。所有业务动作都会先转换为 `CardAction`，再交给 `onAction`，由宿主应用决定如何处理。

## 接入图片和人员信息

飞书协议中的 `img_key` 不是图片 URL，人员 ID 也不包含姓名和头像。通过 resolver 把它们解析成你的应用可以访问的数据：

```tsx
<CardRenderer
  card={card}
  resolveImage={async (imgKey, signal) => {
    const response = await fetch(`/api/card-images/${imgKey}`, { signal });
    return response.ok ? response.url : undefined;
  }}
  resolvePerson={async (id, signal) => {
    const response = await fetch(`/api/people/${id}`, { signal });
    if (!response.ok) return undefined;

    const person = await response.json();
    return {
      id,
      name: person.name,
      avatarUrl: person.avatarUrl,
    };
  }}
/>
```

resolver 可以同步或异步返回结果。请求失败或没有配置 resolver 时，渲染器会显示稳定占位；组件卸载或 resolver 变化时，传入的 `AbortSignal` 会被取消。

## 处理动作和异常输入

`onAction` 会收到两类标准化动作：

```ts
type CardAction =
  | {
      type: "open_url";
      source: ActionSource;
      url: string;
    }
  | {
      type: "callback";
      source: ActionSource;
      value?: unknown;
      formValue?: Record<string, unknown>;
      timezone?: string;
    };
```

- `open_url`：已经按 Web 端规则选择并校验过的链接，是否跳转仍由宿主决定。
- `callback`：按钮、选择器或表单提交产生的数据。它不包含租户、操作者、消息 ID 或 token 等飞书服务端上下文。

卡片输入会被视为不可信数据。致命错误会显示默认降级内容，局部错误会尽量保留其余卡片，并通过 `onDiagnostic` 返回诊断：

```tsx
<CardRenderer
  card={payload}
  fallback={(diagnostics) => (
    <p>这张卡片暂时无法显示（{diagnostics.length} 个问题）</p>
  )}
  onDiagnostic={(diagnostics) => {
    diagnostics.forEach(({ code, path }) => {
      // 生产环境建议只记录 code/path，不记录完整卡片或 callback value。
      console.warn(code, path);
    });
  }}
/>
```

## `CardRenderer` 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `card` | `unknown` | 必填 | 飞书卡片 JSON 2.0；渲染器不会修改原对象 |
| `locale` | `string` | `"zh_cn"` | 卡片使用的语言 |
| `colorScheme` | `"light" \| "dark"` | `"light"` | 浅色或深色主题 |
| `device` | `"pc" \| "mobile"` | `"pc"` | 使用桌面端或移动端布局 |
| `className` | `string` | — | 添加到卡片根元素的 class |
| `resolveImage` | `(key, signal) => string \| Promise<string \| undefined> \| undefined` | — | 把 `img_key` 解析为图片地址 |
| `resolvePerson` | `(id, signal) => Person \| Promise<Person \| undefined> \| undefined` | — | 把人员 ID 解析为姓名和头像 |
| `onAction` | `(action: CardAction) => void` | — | 接收链接和回调动作 |
| `onDiagnostic` | `(diagnostics: readonly CardDiagnostic[]) => void` | — | 接收校验和降级诊断 |
| `fallback` | `ReactNode \| ((diagnostics) => ReactNode)` | `"无法显示此卡片"` | 自定义整卡无法渲染时的内容 |

完整类型可从包根导入：

```ts
import type {
  CardAction,
  CardDiagnostic,
  CardJsonV2,
  CardRendererProps,
  Person,
} from "feishu-card-renderer";
```

## 支持范围

项目聚焦飞书卡片 JSON 2.0：

- 卡片根对象必须包含 `"schema": "2.0"`。
- 支持标题、分栏、表单、交互容器和折叠面板。
- 支持文本、Markdown、图片、多图、人员、图表、表格和分隔线。
- 支持输入框、按钮、菜单、静态选项、人员选择、日期时间、图片选择和勾选器。
- 支持选择器本地搜索、100 项展示上限、多选 chips、PC popup 和 mobile Drawer；
  搜索只使用卡片已有选项及 resolver 已返回的人员显示信息，不查询人员目录。
- mobile Drawer 消费 Base UI 的 visual viewport keyboard inset；自动化证据模拟
  `visualViewport` 收缩，不等同于真实 iOS/Android 软键盘验证。
- 支持 light/dark、PC/mobile，以及 compact、default、fill 三种宽度模式。
- 支持 SSR；每张成功渲染的卡片拥有自己的主题作用域 portal host，overlay 只在
  客户端挂载后进入该 host，卡片卸载时一并清理。图表也只在浏览器挂载后加载。
- 同页 confirm 保持单一活动 modal；宿主程序化切换到另一张卡的 confirm 时，旧
  modal 先取消并退出，避免两个独立 focus trap 互相 inert。
- 不支持 JSON 1.0、旧版 `tag: "action"` 交互模块或卡片搭建工具专用的循环容器。

为了避免异常输入拖垮页面，渲染器还会执行 JSON 2.0 的主要边界检查，包括 200 个元素上限、五层容器上限、`element_id` 唯一性和组件嵌套限制。未知字段会被忽略，未知组件会稳定降级，不会让整张卡片白屏。

独立 `markdown` 使用有界 CommonMark 白名单，当前基础语义包括标题、段落、强调、
粗体、删除线、安全链接、嵌套列表、引用和分隔线。它与有限语法 `lark_md`
保持隔离。原始 HTML 和尚未实现的飞书扩展标签显示为可见原文；Markdown 图片
只显示 alt，不加载网络资源。单个 Markdown 限制为 20,000 字符、12 层语法深度、
1,000 个语法节点和 200 个链接/图片/列表项，超限时保留安全前缀并通过
`onDiagnostic` 报告 recoverable diagnostic。行内代码可在窄卡片中安全断行；
围栏与缩进代码块保留空白并仅在代码块内部横向滚动，围栏语言以文本标签呈现，
不做语法高亮。GFM 任务列表呈现只读状态，不可编辑且不会产生 `CardAction`。
Markdown 表格保留 `table`、表头、行和单元格语义，并支持 GFM 列对齐。表格默认
使用紧凑布局；宽度不足时只有表格容器横向滚动，不会猜测主列或转换成移动卡片。
除上述全局上限外，每个 Markdown 内容最多保留 50 个表体行、12 列和 600 个表格
语法节点；超限时显示安全前缀与截断提示，并报告 recoverable diagnostic。

独立 `markdown` 支持 JSON 2.0 的 `text_size`、`text_align`、`icon` 和 `margin`。
字号可使用 `normal`、`notation`、`heading`，或引用
`config.style.text_size` 中经校验的名称；自定义颜色仅接受 light/dark RGBA 配置。
标准图标使用本地图形映射，未知 token 使用固定占位；自定义图标的 `img_key`
只经 `resolveImage` 解析。宿主可覆盖 `--fcr-markdown-*` 语义 CSS 变量定制字号、
行高、块间距、列表缩进、引用、代码和表格主题，卡片 JSON 不能注入任意 CSS。
这些默认样式追求协议一致、稳定的卡片原生排版，不是对某个飞书客户端版本的
逐像素复刻。

当前 npm 包为 `0.0.1` public preview，尚不承诺 1.0 稳定性。`0.x` 补丁版本用于
兼容修复和小幅改进；次版本用于新增公共能力，也可能包含明确记录的破坏性变更。
逐组件和字段级支持情况请查看 [public preview 兼容矩阵](docs/compatibility-matrix.md)。
未来稳定 `1.0` 会单独明确兼容承诺。官方协议仍可能演进；如文档存在冲突，以最新的
飞书 JSON 2.0 组件子文档为准。

## 交互实现兼容性

确认框、图片预览、overflow、选择器、日期选择、表单字段、图片选择、折叠面板和表格分页已迁移
到 shadcn/Base UI 交互层。飞书 JSON 2.0 输入、normalization、表单值、
required/reset/confirm/disabled 和 `CardAction` 契约保持不变；shadcn 组件、
provider、context 和类型不属于公共 API。

这次升级不兼容旧的内部 DOM、未文档化 `.fcr-*` class 或视觉快照，也不提供 legacy
interaction mode。集成方应只依赖本 README 和公共类型中声明的接口；品牌定制使用
文档化的 `--fcr-*` 语义变量，不要查询或覆盖 Base UI 的 `data-*` 内部状态。
Button 默认采用 scoped shadcn `base-nova` neutral 主题；`type`、`size` 与
`width` 会映射到内部 variant、标准尺寸和 fill 布局。宿主主题变量与 portal
继承示例见 [集成指南](docs/integration.md)。

Input、Textarea、Field、Label、Checkbox、RadioGroup、Checker、原生
time/datetime 和 `select_img` 同样采用该固定快照。`select_img` 的图片和文字仍是
协议内容布局，只有单选/多选状态分别交给 RadioGroup/Checkbox；不再使用旧的飞书式
选中边框。required、invalid、disabled、placeholder、说明和错误反馈保持可见及
ARIA 关联，表单 submit/reset、confirm、表单外即时动作、图片 resolver 三态与
日期时间动作中的浏览器 IANA 时区不变。
Button 与表单控件的上游输入及本地摘要分别固定在
[Button provenance](docs/specs/shadcn-base-nova-baseline.md) 和
[form-control provenance](docs/specs/shadcn-base-nova-form-controls-baseline.md)，
菜单与确认框见
[overlay provenance](docs/specs/shadcn-base-nova-overlays-baseline.md)。
移动端文本选择 Drawer 见
[mobile Drawer provenance](docs/specs/shadcn-base-nova-mobile-drawer-baseline.json)；
Base UI 提供无样式 primitive 与虚拟键盘行为，固定 shadcn wrapper/Nova 快照提供
结构和默认视觉，renderer 只适配逐卡 portal、viewport 与滚动。
折叠面板与交互容器的状态适配见
[container interaction provenance](docs/specs/shadcn-base-nova-containers-baseline.md)；
`collapsible_panel` 组合 scoped Collapsible、Button 与 Lucide chevron，
`interactive_container` 只使用逐卡作用域的 focus ring token，不引入 Card 外壳。
表格分页见
[table pagination provenance](docs/specs/shadcn-base-nova-table-pagination-baseline.md)：
保留本地 `page_size` 行切片与语义 table，使用 shadcn Pagination/Button composition
和具名 Lucide chevron；表格内容可独立横向滚动，分页控件保持在卡片宽度内。

最终收缩以可执行的
[legacy interaction inventory](docs/specs/legacy-interaction-inventory.json)
为准：共享 `styles.css` 不再拥有选择控件的颜色、边框、圆角、阴影、字体、
focus、selected 或旧 34px 密度；这些视觉只存在于固定快照的内部 Nova owner。
共享样式继续负责卡片/Markdown/table/media 等协议内容，以及宽度、overflow、
truncation、portal 层级、碰撞和响应式 placement 等集成布局。`pnpm ui:verify`
通过 TypeScript AST、CSS AST 和精确 provenance key/hash 检查阻止旧 selector、
第二套 wrapper、Base UI 越界 import 与 owner 漂移；共享 `styles.css` 本身不作为
wrapper provenance 哈希，避免把无关内容样式变化绑进交互快照。

Issue #75 补齐了此前 compatibility matrix 标为缺口、现已由官方资料验证的
Button `type/size/width` 协议支持。枚举与视觉类别
依据[飞书新版卡片按钮说明](https://open.feishu.cn/document/feishu-cards/feishu-card-cardkit/configure-card-variables?lang=zh-CN)，
`size/width` 依据
[CardKit JSON 2.0 Button 示例](https://open.feishu.cn/document/cardkit-v1/card-element/create)。
具体 shadcn 功能映射和 laser limitation 见
[兼容矩阵](docs/compatibility-matrix.md)。

## 只使用校验和类型

如果不需要 React 渲染，可以从独立入口使用 schema API：

```ts
import {
  normalizeCard,
  validateCard,
  type CardJsonV2,
} from "feishu-card-renderer/schema";

const validation = validateCard(payload);
const normalized = normalizeCard(payload);
```

这个入口提供纯函数和 TypeScript 类型，不负责网络请求或平台鉴权。

## 更多文档

- [集成指南](docs/integration.md)：公共 API、资源适配、SSR、限制和从 JSON 1.0 迁移
- [兼容矩阵](docs/compatibility-matrix.md)：组件、字段、交互、资源和视觉验收范围
- [飞书卡片 JSON 2.0 结构](https://open.larkoffice.com/document/feishu-cards/card-json-v2-structure)
- [飞书卡片 JSON 2.0 组件概述](https://open.larkoffice.com/document/feishu-cards/card-json-v2-components/component-json-v2-overview)
- [JSON 2.0 不兼容变更与更新说明](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-breaking-changes-release-notes)

## 本地开发

如果你要参与项目开发：

```bash
pnpm install
pnpm check
```

`pnpm check` 会依次执行类型检查、lint、单元测试、组件测试、可访问性测试、视觉测试、
库构建和项目主页构建。视觉测试使用与锁定 Playwright 版本配套的 managed Chromium；
首次运行前执行 `pnpm exec playwright install chromium`，Linux CI 使用
`pnpm exec playwright install --with-deps chromium` 安装浏览器及系统依赖，然后运行
`pnpm visual`。本机 Google Chrome 不参与自动化基线，只可作为可选的手工兼容检查。

本地查看项目主页使用 `pnpm site:dev`；只验证 GitHub Pages 静态构建可使用
`pnpm site:build`。`main` 分支更新后由 `.github/workflows/pages.yml` 自动发布，
Pull Request 只执行站点构建检查。因此在线站点展示的是最新 `main`，可能先于正式
发布；消费者安装和版本比较应以 npm `latest` 指向的不可变发布版本为准。

安全漏洞请不要提交公开 Issue。支持范围、私密报告入口和协调披露规则见
[安全政策](https://github.com/meixg/feishu-card-renderer/security/policy)。
