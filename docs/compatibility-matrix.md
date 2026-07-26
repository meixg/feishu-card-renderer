# JSON 2.0 1.0 兼容矩阵

矩阵依据 2026-07-26 的官方资料、父规格和研究结论建立。每个注册 tag 都由
`compatibilityFixturesByTag` 索引六类 fixture：最小、完整、默认、非法、嵌套和
资源。可执行覆盖分布在 `src/fixtures/` 与 `tests/{unit,component,accessibility,visual}`；
新增 tag 若没有加入矩阵会使单测失败。

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
- 完整：覆盖实现已支持字段；未知字段不驱动 DOM。
- 默认：省略可选字段，断言 normalization 和稳定 UI 默认值。
- 非法：非法枚举、长度、结构或嵌套产生诊断且不影响合法兄弟。
- 嵌套：覆盖各容器允许/禁止组合，以及第五/第六层边界。
- 资源：`img`、`img_combination`、`person`、`person_list`、`chart`、
  `select_img` 覆盖无 adapter、成功、失败/不安全；其他 tag 为
  `not_applicable`。

## 视觉矩阵

Playwright 对完整交互卡执行全部 12 个组合：light/dark × PC/mobile ×
compact 400px/default 600px/fill。另有容器、图表 light/dark/mobile 和图表预览
基线。视觉回归验证协议布局稳定，不宣称逐像素复制飞书私有客户端。

## 可访问性矩阵

- 语义 button/input/select/table；交互组件有原生 disabled 状态。
- 折叠面板关联稳定 `aria-controls`/`aria-expanded`。
- overflow、confirm 和 preview 覆盖 Enter/Escape、焦点进入与恢复。
- 自定义交互面有 `:focus-visible`；reduced-motion 下关闭 transition 和 smooth
  scrolling。
- axe 覆盖基础、复杂内容、递归容器和表单；light/dark 主次文本及焦点色有 WCAG
  对比度断言。颜色不作为唯一状态表达。

明确协议冲突和实现限制见 [集成指南](integration.md#10-限制)。
