# shadcn/ui Base UI `base-nova` 表单控件视觉基线

Issue #76 基于 shadcn-ui/ui commit
[`5203f537d152844a920caa66e865bc61c6ff4860`](https://github.com/shadcn-ui/ui/commit/5203f537d152844a920caa66e865bc61c6ff4860)，
核对日期为 2026-07-30。审查输入为该 commit 下的
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
[`shadcn-base-nova-form-controls-baseline.json`](./shadcn-base-nova-form-controls-baseline.json)。
`pnpm ui:verify` 同时核对 Button 与表单控件两份独立 provenance。

React 18 ref 转发、每卡 `--fcr-interaction-*` 映射和 `.fcr-*` 命名空间属于
打包适配；协议 Field 组合、错误关联、图片与文字排列、表单状态和动作仍由
renderer 拥有。固定快照的标准 32px Input、64px 最小 Textarea、16px
Checkbox/Radio、focus/invalid/disabled 状态集中在
`src/styles/form-controls-nova.css`。原生 time/datetime 通过公开 DOM 语义的
owner selector 复用 Input 视觉，不改变 Picker 组件源码。

该适配公开 `--fcr-interaction-muted-foreground`，其 neutral light/dark 默认值
映射到私有 `--fcr-ui-muted-foreground`；宿主可在单张 `.fcr-root` 上覆盖公开
变量，且该映射不依赖任何 `--fcr-color-*` 内容 token。`select_img` 不使用
shadcn Card shell，也不保留旧选中边框主题。
