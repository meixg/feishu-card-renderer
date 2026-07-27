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
pnpm add @meixg/feishu-card-renderer react react-dom
```

项目发布 ESM、TypeScript 类型和预编译 CSS，支持 React 18.2 至 19。使用者不需要安装或配置 Tailwind CSS。

## 快速开始

在应用入口加载一次样式，然后把飞书卡片 JSON 传给 `CardRenderer`：

```tsx
import { CardRenderer } from "@meixg/feishu-card-renderer";
import "@meixg/feishu-card-renderer/styles.css";

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
} from "@meixg/feishu-card-renderer";
```

## 支持范围

项目聚焦飞书卡片 JSON 2.0：

- 卡片根对象必须包含 `"schema": "2.0"`。
- 支持标题、分栏、表单、交互容器和折叠面板。
- 支持文本、Markdown、图片、多图、人员、图表、表格和分隔线。
- 支持输入框、按钮、菜单、静态选项、人员选择、日期时间、图片选择和勾选器。
- 支持 light/dark、PC/mobile，以及 compact、default、fill 三种宽度模式。
- 支持 SSR；图表会在浏览器挂载后加载。
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

逐组件和字段级支持情况请查看 [1.0 兼容矩阵](docs/compatibility-matrix.md)。官方协议仍可能演进；如文档存在冲突，以最新的飞书 JSON 2.0 组件子文档为准。

## 只使用校验和类型

如果不需要 React 渲染，可以从独立入口使用 schema API：

```ts
import {
  normalizeCard,
  validateCard,
  type CardJsonV2,
} from "@meixg/feishu-card-renderer/schema";

const validation = validateCard(payload);
const normalized = normalizeCard(payload);
```

这个入口提供纯函数和 TypeScript 类型，不负责网络请求或平台鉴权。

## 更多文档

- [集成指南](docs/integration.md)：公共 API、资源适配、SSR、限制和从 JSON 1.0 迁移
- [兼容矩阵](docs/compatibility-matrix.md)：组件、字段、交互、资源和视觉验收范围
- [发布检查清单](docs/release-checklist.md)：安全与发布验收
- [飞书卡片 JSON 2.0 结构](https://open.larkoffice.com/document/feishu-cards/card-json-v2-structure)
- [飞书卡片 JSON 2.0 组件概述](https://open.larkoffice.com/document/feishu-cards/card-json-v2-components/component-json-v2-overview)
- [JSON 2.0 不兼容变更与更新说明](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-breaking-changes-release-notes)

## 本地开发

如果你要参与项目开发：

```bash
pnpm install
pnpm check
```

`pnpm check` 会依次执行类型检查、lint、单元测试、组件测试、可访问性测试、视觉测试、库构建和项目主页构建。视觉测试需要本机安装 Google Chrome。

本地查看项目主页使用 `pnpm site:dev`；只验证 GitHub Pages 静态构建可使用
`pnpm site:build`。`main` 分支更新后由 `.github/workflows/pages.yml` 自动发布，
Pull Request 只执行站点构建检查。
