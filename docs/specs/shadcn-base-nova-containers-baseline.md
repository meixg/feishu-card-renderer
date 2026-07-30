# shadcn base-nova container interaction provenance

Issue #82 的交互容器迁移固定到 shadcn/ui
[`5203f537d152844a920caa66e865bc61c6ff4860`](https://github.com/shadcn-ui/ui/commit/5203f537d152844a920caa66e865bc61c6ff4860)。
评审输入包括
[Collapsible](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/collapsible.tsx)、
[Button](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/button.tsx)、
[Nova style](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/styles/style-nova.css)
和
[neutral theme](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/themes.ts)。

机器可读清单位于
`docs/specs/shadcn-base-nova-containers-baseline.json`。其中的上游 SHA-256
必须同时匹配 `scripts/ui-provenance-expected.mjs` 的独立可信 registry；修改清单本身
不能批准新的上游内容。`pnpm ui:verify` 还会校验本地 Collapsible wrapper、协议容器
组合层和 scoped container interaction CSS 的摘要。

本地适配只负责：

- 让协议折叠标题通过官方 Collapsible trigger 组合官方 Button wrapper；
- 用具名 Lucide chevron 表达展开状态；
- 保持协议内容、padding、顺序、圆角和嵌套规则归 renderer 所有；
- 让 `interactive_container` 仅消费逐卡作用域内的 shadcn ring token，不引入
  shadcn Card 外壳；
- 在 reduced-motion 下移除 chevron 的非必要过渡。
