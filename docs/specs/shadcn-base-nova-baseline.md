# shadcn/ui Base UI `base-nova` 视觉基线

Issue #75 固定采用 shadcn-ui/ui commit
[`5203f537d152844a920caa66e865bc61c6ff4860`](https://github.com/shadcn-ui/ui/commit/5203f537d152844a920caa66e865bc61c6ff4860)，
核对日期为 2026-07-30。审查输入为该 commit 下的
[Base UI Button](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/button.tsx)、
[Input](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/input.tsx)、
[Textarea](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/textarea.tsx)、
[Field](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/field.tsx)、
[Label](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/label.tsx)、
[Checkbox](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/checkbox.tsx)、
[RadioGroup](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/radio-group.tsx)、
[Nova style](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/styles/style-nova.css)
和 [neutral theme](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/themes.ts)。

机器可读的版本、preset、依赖版本、上游 blob SHA-256 与本地适配文件
SHA-256 记录在
[`shadcn-base-nova-baseline.json`](./shadcn-base-nova-baseline.json)。
`pnpm ui:verify` 使用 TypeScript AST 检查 Base UI/Lucide import 边界，并核对
本地适配摘要。后续升级不得自动覆盖这些文件；应先固定新的上游 commit、审查
diff，再更新 provenance。

本地 `button.tsx` 是为 React 18 `forwardRef` 兼容保留的 wrapper，并非上游文件
副本。renderer 只针对固定的上游输入制作 scoped adaptation：保留需要的
variant/size 语义与 Base UI 状态，编译为 `.fcr-*` CSS，但不声称 Tailwind
utilities 等价，也不复制上游的完整 `aria-invalid`、`aria-expanded`、dark
selector 或所有复合 selector。协议层负责的 disabled、focus-visible 和按钮
尺寸有独立测试；其余状态将在实际采用它们的控件 ticket 中补齐。

Button 协议到 shadcn variant 的功能映射如下。它不是飞书视觉等价表：

| 飞书 `type` | renderer variant |
| --- | --- |
| `default` | `outline` |
| `primary`, `primary_filled` | `default` |
| `danger`, `danger_filled` | `destructive` |
| `text` | `ghost` |
| `primary_text` | `link` |
| `danger_text` | `destructiveGhost`（无填充且保留危险色） |
| `laser` | `outline`（保守降级） |

shadcn 没有与飞书 bordered/filled/laser 正交轴等价的 variant。为“功能对齐、非飞书
视觉复刻”，bordered/filled 差异有意折叠；laser 不模拟镭射效果。Button/Nova
适配集中在 `src/styles/button-nova.css`，因此 provenance 不再哈希整个
`src/styles.css`，后续其它控件样式变更不会造成 Button provenance drift。

Issue #76 在同一 commit 上增加 Input、Textarea、Field、Label、Checkbox 与
RadioGroup 的 scoped adaptation。React 18 ref 转发、每卡
`--fcr-interaction-*` 映射和 `.fcr-*` 命名空间属于打包适配；协议 Field 组合、
错误关联、图片与文字排列、表单状态和动作仍由 renderer 拥有。固定快照的标准
32px Input、64px 最小 Textarea、16px Checkbox/Radio、focus/invalid/disabled
状态集中在 `src/styles/form-controls-nova.css`。该文件还公开
`--fcr-interaction-muted-foreground`，其 neutral light/dark 默认值映射到私有
`--fcr-ui-muted-foreground`；宿主可在单张 `.fcr-root` 上覆盖公开变量，且该映射
不依赖任何 `--fcr-color-*` 内容 token。`select_img` 不使用 shadcn Card shell，
也不保留旧选中边框主题。
