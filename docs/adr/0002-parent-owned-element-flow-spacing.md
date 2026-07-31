# 由父容器拥有元素流间距

纵向元素流由 `body`、`column`、`form`、`interactive_container` 和 `collapsible_panel` 等父容器统一控制相邻兄弟元素的间距。未声明或声明非法的 `vertical_spacing` 在 normalization 中回退为 `medium`（8px），合法的 `0px` 可显式关闭间距；元素自身已支持的协议 `margin` 作为额外偏移与父级间距相加。这样可为任意元素组合提供稳定节奏，而无需维护依赖前后元素类型的配对矩阵。

## Considered Options

- 元素配对矩阵：拒绝，因为规则数量会随组件组合膨胀，且未知组件、嵌套容器和动态增删元素的结果难以预测。
- 仅在 CSS 中提供缺省 `gap`：拒绝，因为默认协议语义会分散到不同渲染路径，独立实现的容器容易遗漏。
- 宿主全局覆盖默认间距：拒绝，因为相同卡片会在不同宿主产生不同的协议内容布局。

## Consequences

- gap 只作用于相邻兄弟之间；容器边缘仍由 `padding` 管理。
- 嵌套元素流分别管理自己的兄弟序列，不在父子边界重复计算间距。
- 顶层 header、容器内部 header、控件内部 label/control/feedback 以及 overlay 不参与元素流间距。
- 横向排列和 `column_set.columns` 不使用该纵向默认值。
- PC 与 mobile 使用相同的 `medium`（8px）默认值。
- 未知或非法组件的稳定占位参与元素流间距。
- 每个协议 `CardElement` 由注册组件提供一个文档流内的布局参与节点；不在 `ComponentRenderer` 外增加通用 wrapper，portal 和组件内部反馈不额外占用元素流位置。
- 本决策不扩大全组件 `margin` 支持；尚未支持的协议外边距应作为独立任务处理。
- `tests/fixtures/workspace-form.json` 将原样保存 Workspace 表单卡片，作为默认 body/form 间距、输入不可变性、表单行为、可访问性以及初始视觉状态的共享验收输入；测试统一配置 `onAction`。
