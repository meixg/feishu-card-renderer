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
`data-size`、Button variant 和默认尺寸。`overlays-nova.css` 是 pinned utility
组合的机械静态展开，不是 renderer 重新设计的主题：

- AlertDialog overlay 展开为 `bg-black/10`、100ms fade 和受支持环境的
  `backdrop-blur-xs`；content 展开为 popover token、`rounded-xl`、`p-4`、
  `ring-1 ring-foreground/10`、默认 `max-w-xs` 与 `sm:max-w-sm`。
- AlertDialog footer 展开为 `bg-muted/50`、顶部 border、`p-4`、
  `-mx-4 -mb-4` 和 `rounded-b-xl`；title/description/header 也逐项保持 pinned
  字号、字重、间距和响应式对齐。
- Dropdown Menu 展开为 `min-w-32`、`rounded-lg`、`p-1`、`shadow-md`、
  `ring-1`；item 展开为 `gap-1.5 rounded-md px-1.5 py-1 text-sm`。highlight
  使用 pinned `cn-menu-translucent` 的 foreground 10% 状态，disabled 保持
  50% opacity。虽然 content 基础类声明 100ms enter/exit，wrapper 同时采用的
  pinned `cn-menu-translucent` 含 `animate-none!`，所以最终静态结果明确为无
  Dropdown Menu 动画。

Renderer-specific 差异仅为 React 18 ref 兼容、逐卡 portal、`.fcr-*` 作用域，
以及 viewport/窄卡的 `max-width`、`max-height`、collision 和 overflow 边界。
公共 `--fcr-interaction-*` 变量映射到 pinned neutral popover/accent token；
不保留第二套颜色、尺寸、圆角、阴影或状态设计。

Dropdown Menu 使用 Lucide `EllipsisIcon`，菜单状态视觉只消费私有 shadcn token。
Alert Dialog 的确认按钮使用 default variant、取消按钮使用 outline variant。
协议 action、URL 过滤与 fallback、confirm 恰一次和 interactive-container 冒泡
仍由 renderer 层负责。系统文案来自 renderer locale，不写入 wrapper。

## Overflow selected 裁决

飞书[新版卡片变量文档](https://open.feishu.cn/document/feishu-cards/feishu-card-cardkit/configure-card-variables)
将 overflow 定义为“折叠按钮组”使用的 Button 数组，每项
字段为 `text`、`type`、`value`、`multi_url`。`selected` 属于另一种
OptionArray，官方明确只适用于下拉选择单选和多选。因此 Issue #79 AC1 中的
selected 对 overflow action menu 为 **not applicable**：wrapper 使用普通
`DropdownMenuItem`，不会猜测 Radio/Checkbox 状态。作为不可信未知字段输入的
`selected` 会按 renderer 的向前兼容规则忽略，并有组件测试确保它不产生
`aria-selected`、`aria-checked` 或选择 indicator。
