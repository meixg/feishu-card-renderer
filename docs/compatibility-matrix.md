# JSON 2.0 public preview 兼容矩阵

矩阵依据 2026-07-26 的官方资料、父规格和研究结论建立。每个注册 tag 都在
`compatibilityFixturesByTag` 中拥有独立的可执行契约：聚焦 minimal/complete/
defaults/invalid 卡、完整字段清单、具体 normalization 默认值、非法字段与预期诊断、
未知字段保留、允许/禁止父上下文，以及资源适用性。新增 tag 若没有逐项填写会在
类型检查或矩阵测试中失败，不再使用同组大卡或统一 `element_id` 代替验收。

| 类别 | tags | 关键验收 |
| --- | --- | --- |
| 容器 | `column_set`, `column`, `form`, `interactive_container`, `collapsible_panel` | 允许/禁止嵌套、五层边界、稳定路径、表单提交、折叠 ARIA |
| 基础展示 | `div`, `markdown`, `img`, `hr` | 默认布局、Markdown 消毒、危险 URL、图片资源三态 |
| 复杂展示 | `img_combination`, `person`, `person_list`, `chart`, `table` | 资源缺失/成功/失败、VChart 纯数据、语义表格、根级限制 |
| 交互 | `input`, `button`, `overflow`, `select_static`, `multi_select_static`, `select_person`, `multi_select_person`, `date_picker`, `picker_time`, `picker_datetime`, `select_img`, `checker` | Base UI/原生混合语义、Button `type/size/width`、键盘/触控、disabled、confirm、表单初始值与 reset |

`header` 是顶层结构而非 `body.elements` tag，由 renderer fixture、schema 测试和
light/dark 视觉用例独立覆盖。

Button 已验证支持官方 `type` 枚举、`small|medium|large`
size 与 `default|fill` width。协议的 bordered、text、filled、laser 是飞书视觉
类别；renderer 采用 shadcn 语义作功能映射，不承诺像素等价。bordered/filled
在 shadcn 无对应正交轴时有意折叠；`danger_text` 使用无填充危险 variant；
`laser` 保守降级为 outline，不模拟镭射效果。来源：
[飞书新版卡片按钮变量枚举与说明](https://open.feishu.cn/document/feishu-cards/feishu-card-cardkit/configure-card-variables?lang=zh-CN)、
[CardKit JSON 2.0 Button 示例](https://open.feishu.cn/document/cardkit-v1/card-element/create)。

## Markdown 发布证据

`markdownReleaseFixtures` 独立提供 minimal、complete、defaults、invalid 和
unknown 五类卡。complete 卡同时覆盖全部已支持语法（标题、段落、强调、粗体、
删除线、安全链接、嵌套有序/无序列表、引用、分隔线、行内/围栏/缩进代码、只读
任务列表和 GFM 表格）及全部已实现官方字段：`element_id`、`content`、
`text_size`、`text_align`、`icon`、`margin`。这些字段不再列入透传缺口；
`completeFieldEvidenceByTag.markdown` 逐字段绑定公共 `CardRenderer` DOM 差分
证据，默认值和非法值另经公共 schema seam 验证。

`adversarialMarkdownFixtures` 覆盖 20,000 字符边界、20 层嵌套、超限表格、病理
分隔符、260 个链接、危险 URL、原始 HTML、未知飞书扩展标签和远程 Markdown
图片。组件验收要求超限保留安全前缀和 sibling、产生 recoverable diagnostic，
且不出现可执行 HTML、危险链接或网络图片元素。

## Fixture 六类定义

- 最小：允许上下文中的最小合法结构，必须无诊断。
- 完整：每个 tag 的聚焦卡只填入已具有类型与 normalization、视图、资源或交互
  语义证据的字段；未知字段透传不计为支持。字段级测试验证具体 DOM/ARIA/样式、
  默认值、资源或动作结果，并要求整卡无诊断。`completeFieldEvidenceByTag` 以
  `tag.field` 为键绑定实际执行的 DOM 差分、身份诊断或交互 verifier，
  `completeFields` 从该证据表生成；因此同名字段不能跨 tag 借用证据，也不能仅
  指向一个存在但未执行对应断言的测试文件。
- 默认：每个 tag 省略可选字段，逐项断言该 tag 的 normalization 默认；没有
  tag-specific 默认的组件显式使用空默认契约。
- 非法：每个 tag 使用自身相关的非法枚举、长度、格式或结构并断言对应诊断；
  同时加入独立未知字段并验证 normalization 原样保留。
- 嵌套：逐 tag 执行声明的所有允许上下文，并对 `form`、`table`、form-only
  multi-select、form/chart 等禁止上下文断言指定诊断；五/六层边界由容器套件覆盖。
- 资源：`img`、`img_combination`、`person`、`person_list`、`chart`、
  `select_img` 覆盖 missing、resolved、rejected、aborted；其他 tag 的资源
  kind 为 `none` 且 modes 为空，不复制 minimal 冒充资源场景。

## 视觉矩阵

Playwright 对包含全部 tag 的发布卡执行全部 12 个组合：light/dark × PC/mobile ×
compact 400px/default 600px/fill。另有容器、图表 light/dark/mobile 和图表预览
基线。交互专项基线另覆盖 400px PC choice popup、多选 chips、mobile Drawer、
表单 light/dark/PC/mobile、required error 和 PC Calendar。视觉回归验证协议布局
稳定，不宣称逐像素复制飞书私有客户端；Base UI 升级后的内部 DOM 和视觉不兼容
旧快照。

Markdown 完整卡在同一 12 组合中逐项测量：卡片 `scrollWidth` 等于
`clientWidth`，代码块与表格容器保持自身 `overflow-x: auto` 且不宽于外层卡片。
compact 夹具另证明宽内容确实只在代码块/表格内部产生横向滚动。

图表兼容不是 sanitizer 名单：line、area、bar、pie、common、funnel、scatter、
radar、linearProgress、circularProgress、wordCloud 各有类型正确的最小 spec。
Playwright 在真实 Chrome 中使用正式懒加载 VChart runtime 实例化，要求进入
`ready`、生成 canvas/SVG 且无 page error。

## 可访问性矩阵

- 语义 button/input/combobox/listbox/menu/dialog/table；交互组件有原生或 Base UI
  暴露的 disabled 状态。
- 折叠面板关联稳定 `aria-controls`/`aria-expanded`。
- overflow、confirm、preview、choice Drawer 和 Calendar 覆盖 Tab/Shift+Tab、
  Enter/Space、Arrow、Home/End、Escape、焦点进入、陷阱与恢复。
- 自定义交互面有 `:focus-visible`；reduced-motion 下关闭 transition 和 smooth
  scrolling。
- axe 覆盖基础、复杂内容、递归容器和表单；light/dark 主次文本及焦点色有 WCAG
  对比度断言。颜色不作为唯一状态表达。
- Markdown 发布卡显式断言标题、列表、引用、表格、代码、链接、只读任务状态与
  截断 `role="note"`，并在公共 `CardRenderer` 输出上运行 axe。

## Base UI 交互发布证据

- 每张成功卡片只有一个主题作用域 portal host；fatal 卡不创建 host。SSR 输出、
  hydration 复用、同页多卡 ID/主题隔离、打开状态卸载和 inert 清理由组件测试及
  真实 Chrome 流程覆盖。
- 多卡 confirm 的真实 Chrome 流程强制触发 host 级 handoff：退出与新进入的
  portal DOM 可同时挂载，但仅新 modal 可聚焦；随后卸载新卡、重开旧卡并逐项断言
  focus trap、focus return 和 inert marker 均已清理。
- confirm、overflow 和图片预览位于所属卡片 portal；取消不产生 action，确认恰好
  执行一次，portal 子交互不会触发父 `interactive_container`。
- 少于 8 项的单选使用 Select，8 项以上使用可搜索 Combobox；多选始终可搜索并
  使用 chips。搜索完整 options、最多显示 100 项，对象 option value、required、
  reset、disabled、confirm 和人员 resolver 三态均有公共 `CardRenderer` 证据。
- PC 使用 popup/Calendar，mobile choice 使用 Drawer；真实 Chrome 覆盖触控下滑、
  焦点返回，以及 date/time/datetime 的协议格式和 IANA timezone。软键盘边界证据
  来自桌面 Chrome 中模拟的 `visualViewport` 844→420 px 收缩，并断言 bounds 与
  overflow；它不冒充真实 iOS/Android OS 键盘或 Safari 验证。
- shadcn/Base UI wrapper、provider、context 和类型保持私有；兼容矩阵只承诺协议、
  公共类型、DOM 语义角色和 `CardAction`，不承诺内部 DOM/class/视觉兼容。

明确协议冲突和实现限制见 [集成指南](integration.md#public-preview-限制)。
