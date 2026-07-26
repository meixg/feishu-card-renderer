# JSON 2.0 1.0 兼容矩阵

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
| 交互 | `input`, `button`, `overflow`, `select_static`, `multi_select_static`, `select_person`, `multi_select_person`, `date_picker`, `picker_time`, `picker_datetime`, `select_img`, `checker` | 原生语义、键盘、disabled、confirm、表单初始值与 reset |

`header` 是顶层结构而非 `body.elements` tag，由 renderer fixture、schema 测试和
light/dark 视觉用例独立覆盖。

## Fixture 六类定义

- 最小：允许上下文中的最小合法结构，必须无诊断。
- 完整：每个 tag 的聚焦卡显式填入全部已支持字段；逐字段验证输入与
  normalization 保留，并要求整卡无诊断。
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
基线。视觉回归验证协议布局稳定，不宣称逐像素复制飞书私有客户端。

图表兼容不是 sanitizer 名单：line、area、bar、pie、common、funnel、scatter、
radar、linearProgress、circularProgress、wordCloud 各有类型正确的最小 spec。
Playwright 在真实 Chrome 中使用正式懒加载 VChart runtime 实例化，要求进入
`ready`、生成 canvas/SVG 且无 page error。

## 可访问性矩阵

- 语义 button/input/select/table；交互组件有原生 disabled 状态。
- 折叠面板关联稳定 `aria-controls`/`aria-expanded`。
- overflow、confirm 和 preview 覆盖 Enter/Escape、焦点进入与恢复。
- 自定义交互面有 `:focus-visible`；reduced-motion 下关闭 transition 和 smooth
  scrolling。
- axe 覆盖基础、复杂内容、递归容器和表单；light/dark 主次文本及焦点色有 WCAG
  对比度断言。颜色不作为唯一状态表达。

明确协议冲突和实现限制见 [集成指南](integration.md#10-限制)。
