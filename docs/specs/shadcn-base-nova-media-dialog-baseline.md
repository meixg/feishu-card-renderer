# shadcn/ui Base UI `base-nova` 媒体 Dialog 视觉基线

Issue #81 基于 shadcn-ui/ui commit
[`5203f537d152844a920caa66e865bc61c6ff4860`](https://github.com/shadcn-ui/ui/commit/5203f537d152844a920caa66e865bc61c6ff4860)，
核对日期为 2026-07-31。审查输入为该 commit 下的
[Base UI Dialog](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/dialog.tsx)、
[Nova style](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/styles/style-nova.css)
和 [neutral theme](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/themes.ts)。

机器可读的上游与本地 SHA-256 记录在
[`shadcn-base-nova-media-dialog-baseline.json`](./shadcn-base-nova-media-dialog-baseline.json)，
并由 `pnpm ui:verify` 核对。`dialog.tsx` 保留官方 Dialog/close/Button 组合，
增加逐卡 portal 和事件边界适配；系统文案仍由 renderer 提供。

媒体内容、alt、adapter loading/error、缩略图和 object-fit 由 renderer 所有。
`media-dialog-nova.css` 只将 pinned Nova Dialog 视觉作用域化，并保留 viewport、
媒体尺寸、缩略图滚动和 portal 集成布局；不引入通用 Card shell。
