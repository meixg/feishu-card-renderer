# Feishu Card Renderer

一个面向 Web 的飞书卡片 JSON 2.0 渲染器。项目计划使用 React + Tailwind CSS，把飞书会话流中的卡片 JSON 转换成尽可能接近飞书客户端的可视界面，并在浏览器中模拟卡片交互。

项目主页与全部组件实时演示：
[meixg.github.io/feishu-card-renderer](https://meixg.github.io/feishu-card-renderer/)

> 1.0 实现覆盖本文列出的 JSON 2.0 运行时组件。协议兼容不等于飞书
> 服务端能力：鉴权、消息发送、图片上传、人员目录和业务回调均由宿主负责。

## 工程基线

安装依赖并运行全部质量检查：

```bash
pnpm install
pnpm check
```

也可独立运行 `pnpm typecheck`、`pnpm lint`、`pnpm unit`、
`pnpm component`、`pnpm accessibility`、`pnpm visual` 和 `pnpm build`。
视觉快照需要本机安装 Google Chrome；基线更新使用 `pnpm visual:update`。

本地查看项目主页使用 `pnpm site:dev`，验证 GitHub Pages 静态构建使用
`pnpm site:build`。`main` 分支更新后由
`.github/workflows/pages.yml` 自动发布，Pull Request 只执行站点构建检查。

安装并在宿主入口引入预编译样式：

```tsx
// pnpm add @meixg/feishu-card-renderer react react-dom
import { CardRenderer } from "@meixg/feishu-card-renderer";
import "@meixg/feishu-card-renderer/styles.css";

export function CardHost() {
  return <CardRenderer card={{ schema: "2.0" }} />;
}
```

发布构建仅输出 ESM、TypeScript 声明和带 `.fcr-root` 作用域的预编译 CSS。
React 与 ReactDOM 保持 peer dependencies，宿主无需安装或配置 Tailwind。
完整公共 API、资源适配、动作集成和 SSR 说明见
[集成指南](docs/integration.md)。逐 tag 验收情况见
[1.0 兼容矩阵](docs/compatibility-matrix.md)。

稳定协议类型从包根导入；纯 schema API 也保留独立子路径：

```ts
import type { CardJsonV2 } from "@meixg/feishu-card-renderer";
import {
  normalizeCard,
  validateCard,
  type CardJsonV2 as SchemaCardJsonV2,
} from "@meixg/feishu-card-renderer/schema";
```

## 什么是飞书卡片

飞书卡片是一种由 JSON 描述、由飞书客户端渲染的结构化消息。它介于普通消息和完整 Web 应用之间：

- 开发者声明内容、布局、样式和交互，不直接编写客户端 UI。
- 飞书在桌面端和移动端根据同一份 JSON 自适应渲染。
- 卡片可以展示文本、图片、人员、图表和表格，也可以收集输入、选择项并触发链接或服务端回调。
- 卡片适合通知、审批、告警、数据摘要、轻量表单和 AI 流式输出等会话内场景。

本项目实现的是同一协议的 Web 渲染层，不负责发送飞书消息、上传飞书图片、查询人员信息或接收真实飞书回调。上述能力应通过宿主应用注入的资源解析器和事件处理器接入。

## 实现范围

只实现卡片 JSON 2.0：

- 卡片必须以 `"schema": "2.0"` 明确声明 2.0。官方协议不声明时默认按 1.0 处理。
- 不兼容或仅属于 JSON 1.0 的结构不作为实现目标。
- JSON 2.0 要求飞书客户端 7.20 及以上；旧客户端只展示标题和升级提示。Web 渲染器不需要模拟旧客户端，但可提供兼容性警告。
- JSON 2.0 当前只支持共享卡片，`config.update_multi` 应为 `true`。
- 一张卡片最多包含 200 个组件或元素，文本对象等元素也计数。
- 循环容器只存在于卡片搭建工具的变量渲染阶段，不支持直接通过卡片 JSON 构建，因此不属于运行时组件注册表。

官方资料：

- [卡片 JSON 2.0 结构](https://open.larkoffice.com/document/feishu-cards/card-json-v2-structure)
- [卡片 JSON 2.0 组件概述](https://open.larkoffice.com/document/feishu-cards/card-json-v2-components/component-json-v2-overview)
- [JSON 2.0 不兼容变更与更新说明](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-breaking-changes-release-notes)

本文基于官方资料于 2026-07-26 整理。协议可能继续演进；实现与本文冲突时，以最新官方 2.0 子文档为准，并同步更新本文和测试夹具。

## JSON 2.0 的整体模型

卡片由全局配置、整体链接、标题和正文组成：

```json
{
  "schema": "2.0",
  "config": {},
  "card_link": {},
  "header": {},
  "body": {
    "elements": []
  }
}
```

官方允许发送 `{}` 作为空白卡片，但这不代表它是 2.0 卡片。Web 渲染器应区分“可容错显示”和“通过 2.0 校验”两个概念。

### 完整结构骨架

```jsonc
{
  "schema": "2.0",
  "config": {
    "streaming_mode": false,
    "streaming_config": {
      "print_frequency_ms": {
        "default": 30,
        "android": 25,
        "ios": 40,
        "pc": 50
      },
      "print_step": {
        "default": 2,
        "android": 3,
        "ios": 4,
        "pc": 5
      },
      "print_strategy": "fast"
    },
    "summary": {
      "content": "聊天列表中的摘要",
      "i18n_content": {
        "zh_cn": "摘要",
        "en_us": "Summary"
      }
    },
    "locales": ["zh_cn", "en_us"],
    "enable_forward": true,
    "update_multi": true,
    "width_mode": "default",
    "use_custom_translation": false,
    "enable_forward_interaction": false,
    "style": {
      "text_size": {
        "cus-0": {
          "default": "normal",
          "pc": "normal",
          "mobile": "large"
        }
      },
      "color": {
        "cus-0": {
          "light_mode": "rgba(5,157,178,0.52)",
          "dark_mode": "rgba(78,23,108,0.49)"
        }
      }
    }
  },
  "card_link": {
    "url": "https://example.com",
    "pc_url": "https://example.com/pc",
    "ios_url": "https://example.com/ios",
    "android_url": "https://example.com/android"
  },
  "header": {
    "title": {
      "tag": "plain_text",
      "content": "主标题"
    },
    "subtitle": {
      "tag": "plain_text",
      "content": "副标题"
    },
    "template": "blue",
    "text_tag_list": [],
    "i18n_text_tag_list": {},
    "icon": {
      "tag": "standard_icon",
      "token": "chat-forbidden_outlined",
      "color": "orange"
    },
    "padding": "12px"
  },
  "body": {
    "direction": "vertical",
    "padding": "12px",
    "horizontal_spacing": "8px",
    "horizontal_align": "left",
    "vertical_spacing": "8px",
    "vertical_align": "top",
    "elements": [
      {
        "tag": "div",
        "element_id": "intro",
        "margin": "0px",
        "text": {
          "tag": "plain_text",
          "content": "正文"
        }
      }
    ]
  }
}
```

### 顶层字段

| 字段 | 作用 | 实现要点 |
| --- | --- | --- |
| `schema` | 协议版本 | 2.0 渲染器只接受 `"2.0"`；宽松模式可显示诊断信息 |
| `config` | 全局行为、宽度、国际化、自定义字号和颜色 | 配置不一定产生可见 DOM，但会影响渲染上下文 |
| `card_link` | 整张卡片的跳转 | `url` 是跨端地址；未设置时才按 PC、iOS、Android 取值 |
| `header` | 唯一的卡片标题区 | 若存在，`title` 必填；不放入 `body.elements` |
| `body` | 正文布局容器 | `elements` 保存组件，默认纵向排列 |

`card_link` 至少要有 `url`，或同时给出 `pc_url`、`ios_url`、`android_url`。按照官方规则，同时配置跨端和分端地址时 `url` 生效；未配置 `url` 时，Web 端使用 `pc_url`。某端不允许跳转时可使用 `lark://msgcard/unsupported_action`。

### 宽度与布局

- `config.width_mode`: `default` 的 PC/iPad 宽度上限为 600px；`compact` 为 400px；`fill` 自适应可用宽度。
- `direction`: `vertical` 或 `horizontal`。
- `horizontal_align`: `left`、`center`、`right`。
- `vertical_align`: `top`、`center`、`bottom`。
- `horizontal_spacing` / `vertical_spacing`: `small` 4px、`medium` 8px、`large` 12px、`extra_large` 16px，也可使用 `[0,99]px`。
- `padding`: `[0,99]px`，支持 CSS 1、2、4 值写法。
- `margin`: `[-99,99]px`，同样支持 CSS 1、2、4 值写法。负外边距是 2.0 中实现图片通栏的方式。
- 容器最多嵌套五层。

解析这些字段时必须限制为协议允许的 token 和 px 数值，不应把任意 JSON 字符串直接注入 `style`。

### `element_id`

除标题外，组件和文本等元素都可以声明 `element_id`，供组件级操作和流式更新定位：

- 在同一卡片中全局唯一。
- 只允许字母、数字和下划线。
- 必须以字母开头。
- 最长 20 个字符。

`element_id` 是业务标识，不等同于 React `key`。React `key` 可优先使用它，但仍要为缺失或重复 ID 的输入提供稳定回退。

## 可复用子结构

### 文本

普通文本对象常用于标题、占位文案、按钮文本和提示：

```json
{
  "tag": "plain_text",
  "content": "文本",
  "element_id": "text_1",
  "text_size": "normal",
  "text_color": "default",
  "text_align": "left",
  "lines": 2
}
```

部分位置允许 `tag: "lark_md"`。它只支持有限 Markdown；完整富文本应使用 `tag: "markdown"` 组件。

字号包括 `heading-0` 至 `heading-4`、`heading`、`normal`、`notation`，以及 `xxxx-large` 至 `x-small`。`config.style.text_size` 可定义 `cus-*` 名称，并分别映射 PC 和移动端字号。

### 图标

```json
{
  "tag": "standard_icon",
  "token": "chat-forbidden_outlined",
  "color": "orange"
}
```

或：

```json
{
  "tag": "custom_icon",
  "img_key": "img_v2_xxx"
}
```

Web 渲染器需要通过可注入的 `resolveImage(imgKey, signal)` 和图标 token
映射表解析资源。`signal` 用于卸载或 resolver 身份切换时取消旧请求。解析失败时
展示尺寸稳定的占位符，不能让布局坍塌。

### 交互行为

JSON 2.0 使用 `behaviors` 描述交互，不再依赖 JSON 1.0 的 `tag: "action"` 容器：

```json
{
  "behaviors": [
    {
      "type": "open_url",
      "default_url": "https://example.com",
      "pc_url": "https://example.com/pc",
      "ios_url": "lark://msgcard/unsupported_action",
      "android_url": "https://example.com/android"
    },
    {
      "type": "callback",
      "value": {
        "action": "approve"
      }
    }
  ]
}
```

同一组件可以同时声明跳转和回调。组件还可能声明：

- `disabled`、`disabled_tips`
- `hover_tips`
- `confirm.title`、`confirm.text`
- `name`：表单项或交互组件标识；在表单中必须全卡唯一
- `required`：只在支持表单校验的上下文生效

Web 版本不应自行请求 JSON 中的回调地址。建议统一向宿主发出标准化事件：

```ts
type CardAction = {
  tag: string
  name?: string
  elementId?: string
  value?: unknown
  formValue?: Record<string, unknown>
  behavior: "callback" | "open_url" | "submit" | "reset" | "local"
}
```

## 组件总览

### 容器

| 组件 | `tag` | 核心字段 | 关键限制 |
| --- | --- | --- | --- |
| 分栏 | `column_set` / `column` | `columns`, `width`, `weight`, `flex_mode`, 布局字段 | 列内不能放 `form`、`table` |
| 表单容器 | `form` | `name`, `elements`, 布局字段 | 只能在正文根级；不能嵌套 `form`、`table`；至少一个提交按钮 |
| 交互容器 | `interactive_container` | `elements`, `behaviors`, 尺寸、边框和布局字段 | 不能内嵌 `form`、`table` |
| 折叠面板 | `collapsible_panel` | `expanded`, `header`, `border`, `elements` | 不能内嵌 `form`；只支持 JSON 构建 |
| 循环容器 | 无运行时 tag | 搭建工具变量和数据源 | 仅搭建工具支持，不进入 JSON 渲染器 |

### 展示组件

| 组件 | `tag` / 位置 | 核心字段 |
| --- | --- | --- |
| 标题 | 顶层 `header` | `title`, `subtitle`, `template`, `icon`, `text_tag_list`, `padding` |
| 普通文本 | `div` | `text`, `icon`, `width`, `margin` |
| 富文本 | `markdown` | `content`, `text_size`, `text_align`, `icon` |
| 图片 | `img` | `img_key`, `alt`, `title`, `scale_type`, `size`, `preview` |
| 多图混排 | `img_combination` | `combination_mode`, `img_list`, `corner_radius` |
| 人员 | `person` | `user_id`, `size`, `show_avatar`, `show_name`, `style` |
| 人员列表 | `person_list` | `persons`, `size`, `lines`, `show_avatar`, `show_name` |
| 图表 | `chart` | `chart_spec`, `aspect_ratio`, `color_theme`, `height`, `preview` |
| 表格 | `table` | `columns`, `rows`, `page_size`, `header_style`, `row_height` |
| 分割线 | `hr` | `margin` |

### 交互组件

| 组件 | `tag` | 核心字段 | 提交方式 |
| --- | --- | --- | --- |
| 输入框 | `input` | `input_type`, `default_value`, `placeholder`, `max_length` | 独立回调或表单 |
| 按钮 | `button` | `text`, `type`, `size`, `behaviors` | 点击触发 |
| 折叠按钮组 | `overflow` | `options`, `behaviors`, `confirm` | 选择项后触发 |
| 下拉单选 | `select_static` | `options`, `initial_option` / `initial_index` | 独立回调或表单 |
| 下拉多选 | `multi_select_static` | `options`, `selected_values` | 只能在表单中 |
| 人员单选 | `select_person` | `options`, `initial_option` | 独立回调或表单 |
| 人员多选 | `multi_select_person` | `options`, `selected_values` | 只能在表单中 |
| 日期选择 | `date_picker` | `initial_date`, `placeholder` | 独立回调或表单 |
| 时间选择 | `picker_time` | `initial_time`, `placeholder` | 独立回调或表单 |
| 日期时间选择 | `picker_datetime` | `initial_datetime`, `placeholder` | 独立回调或表单 |
| 多图选择 | `select_img` | `options`, `multi_select`, `layout`, `aspect_ratio` | 根级单选立即提交；表单内可多选 |
| 勾选器 | `checker` | `checked`, `text`, `checked_style`, `button_area` | 回调或仅本地状态 |

## 各组件 JSON 结构速查

以下示例只保留区分组件所需的核心字段；完整实现还要处理上表及官方子文档中的可选字段。

### 容器组件

#### 分栏 `column_set`

```jsonc
{
  "tag": "column_set",
  "horizontal_spacing": "8px",
  "horizontal_align": "left",
  "flex_mode": "none",
  "background_style": "default",
  "columns": [
    {
      "tag": "column",
      "width": "weighted",
      "weight": 1,
      "direction": "vertical",
      "vertical_align": "top",
      "padding": "0px",
      "elements": []
    }
  ]
}
```

`column.width` 支持自适应、加权和固定宽度语义；`weight` 仅在 `weighted` 时生效。`column_set` 和 `column` 都可以配置点击行为及背景、间距和对齐。

#### 表单 `form`

```json
{
  "tag": "form",
  "name": "form_1",
  "elements": [
    {
      "tag": "input",
      "name": "reason",
      "required": true
    },
    {
      "tag": "button",
      "name": "submit",
      "form_action_type": "submit",
      "text": {
        "tag": "plain_text",
        "content": "提交"
      },
      "behaviors": [
        {
          "type": "callback",
          "value": {
            "action": "save"
          }
        }
      ]
    }
  ]
}
```

表单把各表单项的本地值缓存在浏览器中。`submit` 先做 `required` 校验，再一次性产生 `formValue`；`reset` 恢复所有表单项的初始值。

#### 交互容器 `interactive_container`

```json
{
  "tag": "interactive_container",
  "width": "fill",
  "height": "auto",
  "direction": "vertical",
  "background_style": "default",
  "has_border": true,
  "border_color": "grey",
  "corner_radius": "8px",
  "padding": "12px",
  "behaviors": [
    {
      "type": "callback",
      "value": {
        "action": "open"
      }
    }
  ],
  "elements": []
}
```

容器整体可点击。子交互组件需要阻止事件冒泡，避免一次点击重复触发子项与容器行为。

#### 折叠面板 `collapsible_panel`

```json
{
  "tag": "collapsible_panel",
  "expanded": false,
  "header": {
    "title": {
      "tag": "plain_text",
      "content": "更多信息"
    },
    "position": "top",
    "icon_position": "right"
  },
  "border": {
    "color": "grey",
    "corner_radius": "8px"
  },
  "elements": []
}
```

展开状态是 Web 渲染器的本地状态。初始值来自 `expanded`，除非宿主更新 JSON，否则不应修改输入对象。

### 展示组件

#### 标题 `header`

```json
{
  "header": {
    "title": {
      "tag": "plain_text",
      "content": "主标题"
    },
    "subtitle": {
      "tag": "plain_text",
      "content": "副标题"
    },
    "template": "blue",
    "text_tag_list": [
      {
        "tag": "text_tag",
        "text": {
          "tag": "plain_text",
          "content": "标签"
        },
        "color": "neutral"
      }
    ]
  }
}
```

一张卡片只有一个标题区，后缀标签最多展示三个。主题包括 `blue`、`wathet`、`turquoise`、`green`、`yellow`、`orange`、`red`、`carmine`、`violet`、`purple`、`indigo`、`grey`、`default`。

#### 普通文本 `div`

```json
{
  "tag": "div",
  "width": "fill",
  "text": {
    "tag": "plain_text",
    "content": "普通文本",
    "text_size": "normal",
    "text_color": "default",
    "text_align": "left",
    "lines": 2
  },
  "icon": {
    "tag": "standard_icon",
    "token": "chat-forbidden_outlined",
    "color": "orange"
  }
}
```

`text.tag` 也可为 `lark_md`。其支持换行、粗体、斜体、删除线、链接、@、彩色文本、emoji 和文本标签等有限语法，不等同于完整 CommonMark。

#### 富文本 `markdown`

```json
{
  "tag": "markdown",
  "content": "**标题**\n\n正文",
  "text_size": "normal",
  "text_align": "left"
}
```

富文本支持段落、标题、列表、引用、代码块、链接、图片、分割线、人员和部分飞书扩展标签。必须做白名单解析和 HTML 消毒，不允许直接使用未经处理的 `dangerouslySetInnerHTML`。JSON 2.0 不支持旧的 `[差异化跳转]($urlVal)`，应识别 2.0 的 `<link ...>...</link>` 扩展语法。

#### 图片 `img`

```json
{
  "tag": "img",
  "img_key": "img_v3_xxx",
  "alt": {
    "tag": "plain_text",
    "content": "图片说明"
  },
  "title": {
    "tag": "plain_text",
    "content": "图片标题"
  },
  "scale_type": "crop_center",
  "size": "300px 180px",
  "corner_radius": "8px",
  "transparent": false,
  "preview": true
}
```

应支持当前 `scale_type` / `size`，并兼容读取历史字段 `mode`、`custom_width`、`compact_width`。图片建议不超过 10MB，尺寸在 1500 × 3000px 范围内，高宽比不超过 16:9。

#### 多图混排 `img_combination`

```json
{
  "tag": "img_combination",
  "combination_mode": "double",
  "combination_transparent": false,
  "corner_radius": "12px",
  "img_list": [
    {
      "img_key": "img_v3_a",
      "transparent": false
    },
    {
      "img_key": "img_v3_b"
    }
  ]
}
```

`combination_mode` 决定双图、三图和等分多列布局。实现时应显式枚举模式，不根据图片数量猜测未知模式。

#### 人员 `person`

```json
{
  "tag": "person",
  "user_id": "ou_xxx",
  "size": "medium",
  "show_avatar": true,
  "show_name": true,
  "style": "normal"
}
```

人员 ID 可以来自 open_id、user_id 或 union_id。Web 渲染器通过
`resolvePerson(id, signal)` 获取姓名和头像；无解析器时展示脱敏占位，而不是
伪造人员。

#### 人员列表 `person_list`

```json
{
  "tag": "person_list",
  "persons": [
    {
      "id": "ou_a"
    },
    {
      "id": "ou_b"
    }
  ],
  "drop_invalid_user_id": false,
  "lines": 1,
  "show_name": true,
  "show_avatar": true,
  "size": "medium"
}
```

#### 图表 `chart`

```json
{
  "tag": "chart",
  "aspect_ratio": "16:9",
  "color_theme": "brand",
  "chart_spec": {},
  "preview": true,
  "height": "auto"
}
```

`chart_spec` 使用 VChart 定义，可覆盖折线、面积、柱状、条形、饼图、环图、组合图、漏斗、散点、雷达、进度和词云等。单卡建议最多五个图表。不执行 `chart_spec` 中的 JavaScript。

实现使用正式依赖 `@visactor/vchart`，并隔离在仅由 `chart` 客户端挂载触发的懒加载 chunk 中；SSR 只输出尺寸稳定的占位。输入 spec 会先递归复制并拒绝函数、脚本入口、危险原型字段、HTML/DOM 扩展、函数注册和其它可执行配置。

兼容范围以飞书文档列出的折线、面积、柱/条、饼/环、组合、漏斗、散点、雷达、进度和词云为基线，不等同于当前 npm VChart 的全部能力。飞书说明客户端会默认追加 media，但没有公开完整规则；本渲染器不猜测这组隐式 media，fixture 使用 `media: []` 获得可重复结果。飞书列出的移动端限制（纹理、圆锥渐变、grid 词云、`extensionMark` 图片 repeat、SVG 图元背景）也保留为明确 limitation。`preview: true` 复用图片与图表统一的可访问预览层，并在预览层中重新挂载同一份经过安全过滤的图表结果；关闭预览会销毁对应 VChart 实例。

#### 表格 `table`

```json
{
  "tag": "table",
  "page_size": 5,
  "row_height": "low",
  "freeze_first_column": false,
  "header_style": {
    "text_align": "left",
    "text_size": "normal",
    "background_style": "none",
    "bold": true,
    "lines": 1
  },
  "columns": [
    {
      "name": "amount",
      "display_name": "金额",
      "data_type": "number",
      "width": "120px",
      "format": {
        "symbol": "¥",
        "precision": 2,
        "separator": true
      }
    }
  ],
  "rows": [
    {
      "amount": 168.23
    }
  ]
}
```

列最多 50 个；每页 1–10 行；列类型包括 `text`、`lark_md`、`options`、`number`、`persons`、`date`、`markdown`。单卡最多五个表格。表格只能位于正文根级，且不能包含其它卡片组件。

#### 分割线 `hr`

```json
{
  "tag": "hr",
  "margin": "0px"
}
```

### 交互组件

#### 输入框 `input`

```json
{
  "tag": "input",
  "name": "comment",
  "required": false,
  "placeholder": {
    "tag": "plain_text",
    "content": "请输入"
  },
  "default_value": "",
  "disabled": false,
  "width": "fill",
  "max_length": 1000,
  "input_type": "multiline_text",
  "rows": 3,
  "auto_resize": true,
  "max_rows": 6,
  "label": {
    "tag": "plain_text",
    "content": "评论"
  },
  "label_position": "top"
}
```

`input_type` 为 `text`、`multiline_text` 或 `password`；`max_length` 为 1–1000。`required` 只在表单中参与提交校验。

#### 按钮 `button`

```json
{
  "tag": "button",
  "type": "primary",
  "size": "medium",
  "width": "default",
  "text": {
    "tag": "plain_text",
    "content": "确定"
  },
  "disabled": false,
  "behaviors": [
    {
      "type": "callback",
      "value": {
        "action": "confirm"
      }
    }
  ]
}
```

表单内按钮还需 `name` 和 `form_action_type: "submit" | "reset"`。

#### 折叠按钮组 `overflow`

```json
{
  "tag": "overflow",
  "width": "default",
  "options": [
    {
      "text": {
        "tag": "plain_text",
        "content": "查看详情"
      },
      "multi_url": {
        "url": "https://example.com"
      },
      "value": "detail"
    }
  ],
  "behaviors": [
    {
      "type": "callback",
      "value": {
        "source": "menu"
      }
    }
  ]
}
```

#### 下拉选择

```jsonc
{
  "tag": "select_static", // 多选时为 multi_select_static
  "name": "priority",
  "required": true,
  "disabled": false,
  "placeholder": {
    "tag": "plain_text",
    "content": "请选择"
  },
  "initial_option": "p1",
  "selected_values": ["p1"],
  "options": [
    {
      "text": {
        "tag": "plain_text",
        "content": "P1"
      },
      "value": "p1"
    }
  ]
}
```

单选使用 `initial_option` 或 `initial_index`；多选使用 `selected_values`，且 `multi_select_static` 只能位于表单中。

#### 人员选择

```jsonc
{
  "tag": "select_person", // 多选时为 multi_select_person
  "name": "owner",
  "required": true,
  "placeholder": {
    "tag": "plain_text",
    "content": "请选择人员"
  },
  "initial_option": "ou_a",
  "selected_values": ["ou_a"],
  "options": [
    {
      "value": "ou_a"
    }
  ]
}
```

候选项只接受用户 open_id。`multi_select_person` 只能位于表单中。

#### 日期、时间和日期时间

```jsonc
{
  "tag": "date_picker", // picker_time | picker_datetime
  "name": "start_at",
  "required": false,
  "disabled": false,
  "width": "default",
  "initial_date": "2026-07-26",
  "initial_time": "11:30",
  "initial_datetime": "2026-07-26 11:30",
  "placeholder": {
    "tag": "plain_text",
    "content": "请选择"
  }
}
```

实际组件只使用与其 tag 对应的一个初始值字段。交互事件应包含用户时区；日期时间展示和解析不得默认为服务器时区。

#### 多图选择 `select_img`

```json
{
  "tag": "select_img",
  "name": "cover",
  "multi_select": false,
  "layout": "bisect",
  "required": false,
  "can_preview": true,
  "aspect_ratio": "16:9",
  "options": [
    {
      "img_key": "img_v3_a",
      "value": "a",
      "disabled": false
    }
  ]
}
```

根级或普通容器中只支持单选并立即提交；表单中才支持多选和异步提交。

#### 勾选器 `checker`

```json
{
  "tag": "checker",
  "name": "task_done",
  "checked": false,
  "text": {
    "tag": "plain_text",
    "content": "完成任务"
  },
  "overall_checkable": true,
  "checked_style": {
    "show_strikethrough": true,
    "opacity": 0.6
  },
  "behaviors": [
    {
      "type": "callback",
      "value": {
        "task": "1"
      }
    }
  ]
}
```

未配置 `behaviors` 时仍允许本地勾选，但不产生服务端回调。按钮区最多三个按钮。

## 嵌套规则

实现组件前必须校验所在上下文：

- `form` 和 `table` 只能直接位于 `body.elements`。
- `form` 不能包含 `form` 或 `table`。
- `table` 不包含任何卡片组件。
- `column`、`interactive_container` 不能包含 `form` 或 `table`。
- `collapsible_panel` 不能包含 `form`。
- `multi_select_static` 和 `multi_select_person` 只能位于 `form`。
- `select_img` 在表单外只允许单选；表单内允许单选或多选。
- 常规输入、按钮、折叠按钮组、单选、日期时间选择器可以出现在分栏、表单、折叠面板、交互容器中。
- 最大容器深度为五层。

解析器应报告非法嵌套，但宽松渲染模式可用明确的“不支持组件”占位继续渲染其余内容，不能让整张卡片白屏。

## 国际化和主题

`config.locales` 限制生效语言。标题后缀可通过 `i18n_text_tag_list` 配置；摘要可通过 `summary.i18n_content` 配置。官方还有局部国际化结构，后续实现时应把 locale 解析放在渲染前的 normalization 阶段，而不是散落在每个 React 组件中。

颜色需要同时支持：

- 协议内置颜色 token。
- `config.style.color` 中的自定义颜色名。
- 浅色与深色主题映射。

未知颜色、字号、间距枚举应回退到官方默认值，并产生非阻塞诊断。

## 交互与回调

飞书新版交互事件类型为 `card.action.trigger`。典型回调的重要部分如下：

```json
{
  "schema": "2.0",
  "header": {
    "event_type": "card.action.trigger"
  },
  "event": {
    "operator": {},
    "action": {
      "tag": "button",
      "name": "submit",
      "value": {
        "action": "save"
      },
      "form_value": {
        "comment": "文本"
      },
      "timezone": "Asia/Shanghai"
    },
    "host": "im_message",
    "context": {}
  }
}
```

Web 渲染器只需要产出可映射到 `event.action` 的数据，不应伪造飞书的 `operator`、`token`、消息 ID 等服务端上下文。

## React + Tailwind 实现建议

推荐的数据流：

```text
未知 JSON
  → 结构校验
  → 2.0 normalization 与默认值
  → locale/theme/device 渲染上下文
  → tag 注册表递归渲染
  → 本地交互/表单状态
  → 标准化 CardAction 事件
```

建议分层：

- `schema/`: TypeScript 类型、运行时校验、默认值、诊断信息。
- `renderer/`: `CardRenderer`、组件注册表、未知组件边界、递归上下文。
- `components/`: 按协议 tag 拆分的纯视图组件。
- `interactions/`: behavior 分发、确认弹窗、URL 选择、表单状态。
- `adapters/`: 图片、人员、图标、图表等外部资源解析。
- `styles/`: 协议 token 到 CSS/Tailwind 的映射，不拼接动态 Tailwind 类名。
- `fixtures/`: 每个 tag 的最小、完整、边界和非法示例。

Tailwind 适合固定 token；运行时 px、RGBA 和列权重需要经过白名单解析后使用受控 inline style 或 CSS 变量。不要生成 `p-${value}`、`text-${color}` 之类无法被 Tailwind 静态扫描且有注入风险的类名。

## 建议实现顺序

1. 顶层卡片、标题、正文布局、主题和宽度。
2. 通用文本、图标、边距、间距和资源解析。
3. `div`、`markdown`、`img`、`hr`。
4. `column_set`、`interactive_container`、`collapsible_panel`。
5. 按钮、输入、单选、日期时间和统一交互事件。
6. `form`、多选、`select_img`、`checker`。
7. 人员、人员列表、多图混排。
8. 表格和 VChart 图表。
9. 国际化、流式更新、预览弹层、完整可访问性和视觉回归。

## 完成标准

首个可用版本至少应做到：

- 不修改传入 JSON。
- 未知字段向前兼容，未知 tag 有可诊断的占位。
- 每个支持的 tag 都有最小和完整 fixture。
- 布局、深浅主题、400px/600px/fill 和移动窄屏有视觉回归测试。
- 键盘可以完成按钮、菜单、选择器、表单、折叠和图片预览操作。
- Markdown、URL、图片和图表配置按不可信输入处理。
- 非法嵌套、重复 `element_id`、超 200 元素和超五层容器有明确诊断。
- 交互通过宿主回调输出，不在组件内部耦合真实网络请求。

## 1.0 发布资料

- [安装、公共类型、宿主集成、限制与迁移](docs/integration.md)
- [逐 tag fixture、视觉、交互、资源与协议兼容矩阵](docs/compatibility-matrix.md)
- [安全审查与发布验收清单](docs/release-checklist.md)
