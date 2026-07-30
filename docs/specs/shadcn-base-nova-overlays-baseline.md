# shadcn/ui Base UI `base-nova` overlay 视觉基线

Issue #79 沿用 Issue #75 固定的 shadcn-ui/ui commit
[`5203f537d152844a920caa66e865bc61c6ff4860`](https://github.com/shadcn-ui/ui/commit/5203f537d152844a920caa66e865bc61c6ff4860)，
核对日期为 2026-07-30。审查输入为该 commit 下的
[Dropdown Menu](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/dropdown-menu.tsx)、
[Alert Dialog](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/alert-dialog.tsx)、
Nova style 与 neutral theme。

机器可读的上游和本地 SHA-256 位于
[`shadcn-base-nova-overlays-baseline.json`](./shadcn-base-nova-overlays-baseline.json)，
并由 `pnpm ui:verify` 强制核对。wrapper 保留官方 Base UI composition、slot、
Button variant 和默认尺寸；本地适配仅处理 React 18、逐卡 portal、`.fcr-*`
作用域和窄卡 collision/overflow。

Dropdown Menu 使用 Lucide `EllipsisIcon`，菜单状态视觉只消费私有 shadcn token。
Alert Dialog 的确认按钮使用 default variant、取消按钮使用 outline variant。
协议 action、URL 过滤与 fallback、confirm 恰一次和 interactive-container 冒泡
仍由 renderer 层负责。系统文案来自 renderer locale，不写入 wrapper。
