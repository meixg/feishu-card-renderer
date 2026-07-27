# 飞书卡片 JSON 2.0 Web 渲染器：协议事实与约束研究

> 核验日期：2026-07-26
> 范围：飞书卡片 JSON 2.0、VChart 与 React Web 渲染边界。本文只记录协议事实、仓库既定约束和仍需确认的问题，不是实现方案。

## 结论摘要

- JSON 2.0 必须显式声明 `"schema": "2.0"`；省略时按 1.0。正文组件位于 `body.elements`。[F1][F3]
- JSON 2.0 目前只支持共享卡片，`config.update_multi` 只能为 `true`；一张卡片最多 200 个组件或元素；官方客户端要求为 7.20 及以上。[F1][F3]
- 运行时 JSON 组件分为容器、展示、交互三类。循环容器只由搭建工具使用，没有可直接消费的 JSON 运行时 `tag`。[F2]
- `form` 与 `table` 只能放在卡片正文根级；`table` 不能包含其他卡片组件；容器最多嵌套五层。[F4][F5][F7][F8]
- JSON 2.0 不支持 1.0 的 `tag: "action"`；交互组件使用 `behaviors` 表达 `open_url` 与 `callback`。[F3][F6][F9]
- 图表组件的 `chart_spec` 是 VChart spec，不是 ECharts option。飞书明确说明图表暂不支持 JavaScript 语法，并会默认向 spec 追加媒体查询。[F10]
- VChart 官方提供 `@visactor/vchart` 和 `@visactor/react-vchart`；React 的统一 `<VChart />` 接受完整 VChart spec，并负责更新和卸载。[V1][V2]
- 飞书客户端会附加服务端身份、消息上下文和令牌后产生 `card.action.trigger`；独立 Web 渲染器只能可靠地产生宿主中立的本地动作数据，不能伪造完整飞书 webhook。[F4][F9][R1][R2]
- 官方不同页面存在少量表述冲突或版本滞后，尤其是表单能否内嵌 `chart`、折叠面板与 `table` 的组合，以及图表文档所述 VChart 基线。实现时应按“最新组件子文档 > 整体结构 > 仓库摘要”的优先级处理，并把冲突保留为测试与诊断决策。[F3][F4][F8][F10][R2]

## 来源

### 飞书开放平台

- [F1：卡片 JSON 2.0 结构](https://open.larkoffice.com/document/feishu-cards/card-json-v2-structure)
- [F2：卡片 JSON 2.0 版本组件概述](https://open.larkoffice.com/document/feishu-cards/card-json-v2-components/component-json-v2-overview)
- [F3：卡片 JSON 2.0 不兼容变更与更新说明](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-breaking-changes-release-notes)
- [F4：表单容器](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-components/containers/form-container)
- [F5：表格组件](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-components/content-components/table)
- [F6：交互容器](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-components/containers/interactive-container)
- [F7：分栏](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-components/containers/column-set)
- [F8：折叠面板](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-components/containers/collapsible-panel)
- [F9：按钮](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-components/interactive-components/button)
- [F10：图表组件](https://open.larkoffice.com/document/feishu-cards/card-json-v2-components/content-components/chart)
- [F11：输入框](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-v2-components/interactive-components/input)

### VChart

- [V1：VChart Quick Start](https://visactor.io/vchart/guide/tutorial_docs/Getting_Started)
- [V2：React VChart](https://visactor.io/vchart/guide/tutorial_docs/Cross-terminal_and_Developer_Ecology/react)
- [V3：VChart 基础 Spec](https://visactor.io/vchart/guide/tutorial_docs/Basic/A_Basic_Spec)
- [V4：VChart API](https://visactor.io/vchart/api/API/vchart)
- [V5：VChart 按需加载](https://visactor.io/vchart/guide/tutorial_docs/Load_on_Demand)
- [V6：VChart 富文本与 DOM 扩展](https://visactor.io/vchart/guide/tutorial_docs/extend/Richtext_and_Dom)
- [V7：VChart Changelog](https://visactor.io/vchart/changelog/release)
- [V8：VChart 注册函数](https://visactor.io/vchart/guide/tutorial_docs/Function)

### 本仓库

- [R1：README](../../README.md)
- [R2：AGENTS.md](../../AGENTS.md)

## 已确认事实

### 1. 版本、根结构与全局配置

- JSON 2.0 的识别条件是根对象显式声明 `"schema": "2.0"`。`schema` 缺失时默认是 1.0，因此“飞书允许发送 `{}` 空白卡片”不等于 `{}` 是合法的 JSON 2.0 卡片。[F1]
- JSON 2.0 的全局骨架由 `schema`、`config`、`card_link`、`header`、`body` 组成，正文组件数组位于 `body.elements`；1.0 的根级 `elements` 和 `i18n_elements` 不属于 2.0 结构。[F1][F3]
- `header` 是顶层标题配置；若存在，主标题 `header.title` 必填。`body` 是正文容器。[F1]
- JSON 2.0 当前只支持共享卡片，`config.update_multi` 默认且只能为 `true`。[F1][F3]
- 一张卡片最多支持 200 个组件或元素；官方明确举例 `tag: "plain_text"` 的文本元素也计数。[F1]
- JSON 2.0 对应飞书客户端 7.20 及以上。更低版本只正常展示标题，正文展示升级提示。[F1][F2][F3]
- 2.0 不支持 `fallback` 自定义全局降级规则；不支持的属性会报错。[F3]
- `config.width_mode` 的协议语义是：`default` 在 PC 宽版和 iPad 上限 600px，`compact` 为 400px，`fill` 自适应屏幕宽度。[F1]
- `config.locales` 限制生效语言；`config.style.text_size` 可为 PC、mobile 和旧客户端 fallback 定义自定义字号；`config.style.color` 可为 light/dark 分别定义 RGBA 颜色。[F1]
- `card_link` 必须提供默认 `url`，或同时提供 `pc_url`、`ios_url`、`android_url`。同时提供默认和分端链接时，`url` 生效；可用 `lark://msgcard/unsupported_action` 禁止某端跳转。[F1]

对 Web 渲染器的确定含义：

- 严格 2.0 模式必须把非对象根值及版本错误视为无法可靠解释；仓库已将其归为 fatal。[R2]
- 解析和 normalization 必须保持 2.0 与 1.0 物理边界，不应静默把根级 `elements` 当成 `body.elements`。[F3][R2]
- Web 端应实现 `default`、`compact`、`fill` 三种宽度语义，而不能只依赖当前父 DOM 宽度。[F1][R2]

### 2. 通用标识、布局和深度

- 除标题外，2.0 的组件和文本等元素均可有 `element_id`。它在单卡全局唯一，只能包含字母、数字、下划线，必须以字母开头，最长 20 字符。[F1][F3]
- 正文和容器布局使用 `direction`、`horizontal_align`、`vertical_align`、`horizontal_spacing`、`vertical_spacing`、`padding` 等字段。[F1]
- spacing 枚举映射为 `small=4px`、`medium=8px`、`large=12px`、`extra_large=16px`，也支持 `[0,99]px`。[F1][F3]
- 通用 `margin` 支持 `[-99,99]px`；`padding` 的整体结构文档给出的正常范围是 `[0,99]px`。二者均出现 1、2、4 值语法。[F1]
- 容器类组件最多嵌套五层；表单、分栏、交互容器和折叠面板各自的子文档均重复了该限制。[F4][F6][F7][F8]

对 Web 渲染器的确定含义：

- `element_id` 只有在合法且唯一时才能作为稳定身份；缺失、非法或重复时必须使用稳定协议路径，不能随机生成 React key。[R2]
- 动态 px、RGBA、列权重必须先经协议解析后再进入 CSS 变量或受控 inline style；不能把输入拼成 Tailwind 类名。[F1][R2]
- 负 margin 是协议能力，但不是任意 CSS 注入入口。[F1][R2]

### 3. 运行时组件集合

官方概述列出的 JSON 2.0 运行时组件如下：[F2]

- 容器：`column_set`（内部 `column`）、`form`、`interactive_container`、`collapsible_panel`。
- 展示：顶层 `header`、`div`、`markdown`、`img`、`img_combination`、`person`、`person_list`、`chart`、`table`、`hr`。
- 交互：`input`、`button`、`overflow`、`select_static`、`multi_select_static`、`select_person`、`multi_select_person`、`date_picker`、`picker_time`、`picker_datetime`、`select_img`、`checker`。

循环容器的事实边界：

- 概述明确说，除循环容器外，所有组件均可通过卡片 JSON 代码构建；循环容器仅支持搭建工具。[F2]
- 因而运行时解析器不应猜测循环容器的 `tag`，也不应把搭建阶段模板结构当作客户端 JSON 2.0 组件。[F2][R2]

### 4. 关键嵌套约束

- `form` 不可被其他组件内嵌，只能放在卡片根节点（即正文根级）。它不能内嵌 `form` 或 `table`，并且至少包含一个 `form_action_type: "submit"` 的按钮。[F4]
- `table` 不可被其他组件内嵌，只能放在卡片根节点；它也不支持内嵌其他卡片组件。[F5]
- `interactive_container` 可内嵌除 `form` 和 `table` 外的其他组件。[F6]
- `column` 的 `elements` 不支持 `form` 和 `table`。[F7]
- `collapsible_panel` 明确不支持内嵌 `form`。[F8]
- 2.0 更新说明概括为：表单、交互容器、折叠面板、分栏可内嵌除 `form` 和 `table` 外的其他组件。[F3]

仓库当前把这些约束落实为 recoverable 诊断和稳定占位，而不是整卡白屏；这是仓库容错契约，不是飞书服务端接受非法 JSON 的承诺。[R2]

### 5. 表单状态与提交

- `form` 在前端本地缓存一批表单项；点击提交按钮后一次性回调整批数据。[F2][F4]
- `form.name` 必填并且单卡唯一。表单内所有交互组件的 `name` 必填且需在单卡全局唯一，否则飞书侧数据发送失败。[F4]
- 表单内按钮的 `form_action_type` 为 `submit` 或 `reset`。`submit` 触发表单提交；`reset` 把所有表单组件恢复到初始值，不是一律清空。[F4][F9]
- `required` 在表单上下文中生效。提交时若必填项为空，客户端提示且不发起回调。[F4][F11]
- 表单回调的 `event.action.form_value` 以组件 `name` 为键；动作还包含触发按钮的 `tag`、`name`、`value` 和用户 `timezone`。[F4]
- 输入框的 `default_value` 是预填值；`max_length` 为 1–1000；`input_type` 包含 `text`、`multiline_text`、`password`。[F11]

对 Web 渲染器的确定含义：

- 表单状态应由最近的 `form` 边界管理，并保留一份可恢复的协议初始值。[F4][R2]
- 本地 submit 必须先做 required 校验，只发出一次包含 `formValue` 的宿主动作；reset 不产生伪造的服务端 webhook。[F4][R1][R2]

### 6. 交互与动作边界

- JSON 2.0 不支持旧的 `tag: "action"` 交互模块；按钮、折叠按钮组以及布局间距可实现相关效果。[F3]
- `behaviors` 支持 `open_url` 和 `callback`，并允许跳转与回传同时生效。[F6][F9]
- 交互组件可有 `disabled`、`disabled_tips`、`hover_tips` 和 `confirm`。[F6][F9]
- 交互容器内若有交互组件，优先响应子交互组件定义的交互。[F6]
- `confirm` 的协议语义是确认后才提交；取消不应产生动作。[F9]
- 飞书的 `card.action.trigger` 包含租户、应用、操作者、消息宿主与上下文、更新 token 等服务端信息。[F4][F9]

对 Web 渲染器的确定含义：

- 公共 `CardAction` 应是宿主中立、可序列化的数据；不能暴露 React SyntheticEvent、DOM 节点或声称它就是完整飞书 webhook。[F4][F9][R1][R2]
- Web 端可输出 `callback` value、触发组件 tag/name/elementId、稳定路径、表单值、URL 和浏览器 IANA 时区；身份、租户、消息和 token 只能由真实宿主补充。[R1][R2]
- 子交互元素应阻止触发交互容器动作，以符合“子组件优先响应”的协议语义。[F6][R2]

### 7. 文本、Markdown、URL 与资源

- `plain_text` 是文本结构；部分位置允许 `lark_md`。2.0 的独立 `markdown` 组件支持除 HTMLBlock 外的 CommonMark 语法以及有限 HTML 标签，但部分换行语义与 CommonMark 不同。[F1][F3]
- JSON 2.0 废弃旧的 Markdown 差异化跳转写法，改用 `<link></link>` 扩展标签。[F3]
- 图片组件使用飞书上传图片接口取得的 `img_key`，不是公开图片 URL。[F2]
- 人员与人员列表接受 open_id、user_id 或 union_id，显示的姓名和头像来自飞书人员数据。[F2]

对 Web 渲染器的确定含义：

- `plain_text` 必须作为文本节点渲染；`markdown` 必须解析并消毒，不能把不可信内容直接交给未配置白名单的 `dangerouslySetInnerHTML`。[F3][R2]
- `img_key` 与人员 ID 需要宿主解析器；渲染器本身不应上传图片、查人员目录或从输入中猜测 URL、姓名与头像。[F2][R1][R2]
- URL 协议需要本地白名单；`lark://msgcard/unsupported_action` 表示禁止该动作。[F1][R2]

### 8. 表格

- 单卡最多五个表格；表格只能位于正文根级且不能包含其他卡片组件。[F5]
- `page_size` 为 1–10，默认 5；最多 50 列，超出的列不展示。[F5]
- 当前列数据类型包括普通文本、`lark_md`、选项、数字、人员、日期和 `markdown`。[F5]
- 表格数据是列定义与行对象，不是递归卡片组件树。[F5]

### 9. 图表与 VChart

飞书侧已确认：

- `chart` 的 `chart_spec` 是 VChart spec 结构体且必填；飞书官方直接把图表组件描述为“基于 VChart 的图表定义”。[F10]
- `chart` 还支持 `aspect_ratio`、`color_theme`、`preview`、`height`、`margin`、`element_id`。[F10]
- `aspect_ratio` 支持 `1:1`、`2:1`、`4:3`、`16:9`；固定 `height` 支持 `[1,999]px`，设置后 `aspect_ratio` 失效。[F10]
- 单卡建议最多五个图表；这是“建议”而非与 200 元素类似的硬上限。[F10]
- 图表组件暂不支持 JavaScript 语法。[F10]
- 飞书会默认向 `chart_spec` 追加媒体查询；`"media":[]` 可禁用该追加行为。[F10]
- 飞书列出若干移动端不支持的 VChart 能力，使用时可能导致移动端加载失败，包括特定纹理、圆锥渐变、grid 词云、extensionMark 图片 repeat、SVG 图元背景。[F10]
- 飞书客户端 7.27 及以上的图表组件文档声明支持 VChart 1.12.3；更老客户端映射到更老的 VChart 版本。[F10]

VChart 侧已确认：

- VChart 是声明式前端图表库；基础 spec 通常由 `type`、`data`、数据字段映射、series 与组件配置组成。[V1][V3]
- 浏览器 API 通过 `new VChart(spec, { dom })` 创建实例；默认 `autoFit` 为 `true`。[V1][V4]
- 官方 React 包是 `@visactor/react-vchart`。统一 `<VChart />` 接收完整 spec，且 spec 数据结构与 VChart 定义一致；官方说明该组件封装了 spec 的更新和卸载。[V2]
- VChart 与 React-VChart 都支持按需加载；React-VChart 可用 `<VChartSimple />` 配合按需注册的构造器。[V2][V5]
- VChart 自身支持函数配置及函数注册，也支持 HTML 扩展和 React DOM 扩展；因此“飞书 chart_spec 不支持 JavaScript”不能仅靠 TypeScript 类型或 JSON.parse 自然保证。[V2][V6][V8]

对 Web 渲染器的确定含义：

- 使用 VChart 是协议直连，不需要 ECharts 转换层。[F10]
- `chart_spec` 必须保持纯数据边界：拒绝函数、脚本相关键、危险原型字段和宿主扩展入口；不得为输入注册函数，也不得启用 VChart 的 HTML/React DOM 扩展来执行输入定义。[F10][V6][V8][R2]
- VChart 适合隔离在 chart adapter 中；实例需在 spec 更新时更新或重建，并在卸载时销毁。[V2][V4][R2]
- 浏览器图表依赖有尺寸的 DOM 容器；SSR 只能安全地产生稳定占位，客户端挂载后再绘制。这是由 VChart 浏览器 API 推导出的 Web 实现约束，不是飞书协议字段。[V1][V4]
- 由于 VChart 包较大且只有含 `chart` 的卡片需要它，懒加载为合理工程策略；这是仓库设计决策，不是协议要求。[V2][V5][R2]

### 10. 校验、容错和安全边界

飞书 2.0 对不支持属性会报错，但官方文档没有定义第三方渲染器在所有非法输入下的 UI。[F3]

仓库已明确的 Web 契约：

- 所有协议输入均不可信，不修改传入对象；normalization 是纯函数。[R2]
- fatal 仅用于根值不是对象、严格模式版本错误等无法可靠解释的情况。[R2]
- 未知 tag、非法枚举、重复 ID、非法嵌套等按 recoverable 处理：记录诊断，以稳定占位继续渲染其他内容。[R2]
- 未知字段忽略以保留向前兼容；未知 tag 不应整卡崩溃。[R2]
- 只开放整卡 fatal fallback；recoverable 错误不开放逐 tag 任意组件替换。此为已确认的仓库公共 API 决策，不是飞书官方行为。[R2]
- JSON、Markdown、URL、RGBA、尺寸、图片地址和图表定义都必须经过边界校验；禁止 `eval`、`new Function`、脚本标签和事件属性注入。[R2]

## 仍不明确或存在冲突

### A. 官方文档内部冲突

1. **`form` 能否内嵌 `chart`**

   - 2.0 更新说明称容器可内嵌除 `form`、`table` 外的其他组件，即看起来允许 `chart`。[F3]
   - 表单子文档的“嵌套规则”只禁止 `table` 与 `form`，也看起来允许 `chart`；但同页 `elements` 字段说明又明确列出“不支持内嵌表格、图表、和表单容器”。[F4]
   - 当前不能从这些页面得到无矛盾结论。按仓库事实来源优先级，应在实现前对最新表单组件页面或真实飞书校验器做一次复核；在此之前，维持仓库当前“form 不得含 form/table”的规则，但为 chart 组合补一条待确认测试。[R2]

2. **折叠面板是否可以包含 `table`**

   - 折叠面板子文档只显式禁止 `form`。[F8]
   - 2.0 更新说明的总括描述禁止所有容器内嵌 `table`。[F3]
   - 表格自己的子文档又明确要求 `table` 只能位于卡片根节点，故最终仍应禁止折叠面板中的 `table`。[F5]

3. **部分容器默认值**

   - 同一组件页面的 JSON 注释与字段表偶有不同默认值，例如折叠面板 `padding`、`vertical_spacing`，交互容器 `vertical_spacing`；仓库不应从示例值推断默认值。[F6][F8]
   - normalization 应以字段说明表为主，并为有冲突的字段留下来源注释与针对性 fixture。

4. **图表 VChart 基线**

   - 图表字段说明按客户端版本给出 1.2.2 至 1.12.3 的映射；同页示例章节仍称“基于 VChart 1.6.x”。[F10]
   - VChart 官方 changelog 已有更高主版本。[V7]
   - 因此“飞书 chart_spec 兼容范围”不能简单等同于 npm 最新 VChart 的全部 spec。需要为飞书所列图表类型和字段建立兼容测试，而不是宣称完整支持任意现代 VChart spec。

### B. 官方未精确定义

1. **200 元素的精确计数算法**

   官方确认文本元素也计数，但没有在整体结构页精确定义所有嵌套结构（例如 `column`、option、icon、table cell）是否分别计数。[F1] 仓库需要明确自己的保守计数规则，并用“本地限制”标注。

2. **五层容器深度的起点与 `column_set`/`column` 计数**

   官方反复写“最多嵌套五层组件”，但未在文本中给出 body 是否算一层、`column_set` 与 `column` 是否分别算一层的形式化算法。[F4][F6][F7][F8] 应通过官方示例或实际校验器补证。

3. **未知字段与非法枚举的客户端降级 UI**

   官方只说明 2.0 对不支持属性报错，没有定义第三方渲染器应如何局部恢复。[F3] 本仓库的 fatal/recoverable 分类因此是产品契约，不应描述为飞书官方行为。[R2]

4. **Web 像素级视觉规范**

   官方字段文档定义语义、枚举与部分尺寸，但没有公开飞书客户端的完整设计 token、字体度量、动画、菜单定位或响应式算法。Web 渲染器目标只能是协议一致、行为稳定，不能承诺逐像素复制某个飞书版本。[R2]

5. **VChart spec 的完整安全白名单**

   飞书只明确“暂不支持 JavaScript 语法”，没有发布可直接供第三方 Web 渲染器使用的安全 schema 或危险字段全集。[F10] VChart 又支持函数和 DOM 扩展。[V2][V6] 因而需要本仓库自定义纯数据递归校验与 VChart 初始化选项白名单。

6. **飞书默认追加的图表媒体查询细节**

   官方说明会追加媒体查询且可用 `media: []` 禁用，但没有在该页公开追加规则的完整 spec。[F10] 独立 Web 渲染器无法无损复制该隐式行为；应记录为视觉兼容 limitation。

7. **资源解析失败的官方呈现**

   官方说明 `img_key` 与人员 ID 的数据来源，但没有规定独立 Web 环境解析失败时的 UI。[F2] 稳定占位、loading/error/abort、缓存等均为仓库适配层契约。[R2]

8. **本地动作与服务端 webhook 的一一映射**

   飞书 webhook 包含仅平台可提供的身份与消息上下文。[F4][F9] Web `CardAction` 能覆盖触发组件、value、formValue、URL、timezone，但不能证明与未来所有 `card.action.trigger` 字段一一对应；公共类型应只做向后兼容扩展。[R1][R2]

## 研究结论对仓库基线的影响

- `AGENTS.md` 与主要官方事实总体一致：严格 2.0、共享卡片、200 元素、五层容器、全局唯一 `element_id`、根级 form/table、无 `action` tag、VChart 纯数据边界均有官方依据。[F1][F3][F4][F5][F10][R2]
- README 中“VChart 图表”和组件清单有官方依据；“VChart 内置并懒加载”“可序列化 `CardAction`”“整卡 fatal fallback”属于合理且已确认的仓库 API 决策，应与协议事实分开表述。[R1][R2]
- 当前最需要保留为显式待确认项的是：form/chart 嵌套冲突、容器深度计数算法、200 元素计数算法、飞书追加的 VChart media 细节以及安全 spec 白名单。
