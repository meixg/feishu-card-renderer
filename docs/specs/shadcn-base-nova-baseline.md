# shadcn/ui Base UI `base-nova` 视觉基线

Issue #75 固定采用 shadcn-ui/ui commit
[`5203f537d152844a920caa66e865bc61c6ff4860`](https://github.com/shadcn-ui/ui/commit/5203f537d152844a920caa66e865bc61c6ff4860)，
核对日期为 2026-07-30。审查输入为该 commit 下的
[Base UI Button](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/button.tsx)、
[Nova style](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/styles/style-nova.css)
和 [neutral theme](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/themes.ts)。

机器可读的版本、preset、依赖版本、上游 blob SHA-256 与本地适配文件
SHA-256 记录在
[`shadcn-base-nova-baseline.json`](./shadcn-base-nova-baseline.json)。
`pnpm ui:verify` 使用 TypeScript AST 检查 Base UI/Lucide import 边界，并核对
本地适配摘要。后续升级不得自动覆盖这些文件；应先固定新的上游 commit、审查
diff，再更新 provenance。

本地适配保留官方 Button 的六个 variant 与八个 size，并把 Tailwind utilities
等价编译为 `.fcr-*` scoped CSS。没有复制完整上游文件，也没有引入全局
`:root`、`.dark`、preflight、全局 cursor 或原始 shadcn token。对宿主稳定的
主题接口仍只有文档化的 `--fcr-*` 变量。
