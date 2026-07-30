# shadcn/ui Base UI `base-nova` 日期选择视觉基线

Issue #80 基于 shadcn-ui/ui commit
[`5203f537d152844a920caa66e865bc61c6ff4860`](https://github.com/shadcn-ui/ui/commit/5203f537d152844a920caa66e865bc61c6ff4860)，
核对日期为 2026-07-31。审查输入为该 commit 下的
[Popover](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/popover.tsx)、
[Calendar](https://github.com/shadcn-ui/ui/blob/5203f537d152844a920caa66e865bc61c6ff4860/apps/v4/registry/bases/base/ui/calendar.tsx)、
既有 Button、Nova style 与 neutral theme。

机器可读的 preset、依赖、上游文件和本地适配 SHA-256 记录在
[`shadcn-base-nova-calendar-baseline.json`](./shadcn-base-nova-calendar-baseline.json)。
`pnpm ui:verify` 会与 Button、表单控件、overlays 和 containers provenance
一并执行 upstream/local 双向强校验。Calendar manifest 的 `localFiles` key
集合、其中每个 hash，以及真实 scoped wrapper/CSS 文件 hash 都必须分别等于
独立 reviewed registry；删除、清空、替换路径或同时修改 manifest 与本地文件
都会 fail closed。共享 `src/styles.css` 不属于该 hash 边界。

本地 wrapper 保留上游的 Base UI Popover 与 React DayPicker 组合边界、Button
视觉和 Lucide navigation，同时适配 React 18、逐卡 portal、renderer locale
以及 viewport collision。`src/styles/calendar-nova.css` 只在 `.fcr-root`
作用域内编译 Nova 的 Popover/Calendar 结构、尺寸和状态；协议值、表单状态、
confirm、action 与 IANA timezone 仍由 renderer 拥有。

仅 PC `date_picker` 使用该组合。移动端 `date_picker` 与所有
`picker_time`/`picker_datetime` 继续使用浏览器原生输入，不引入第二套日期时间
状态模型。上游 `IconPlaceholder` 是 shadcn 网站生成器内部设施，本地固定为具名
Lucide `ChevronLeftIcon`、`ChevronRightIcon` 和 `ChevronDownIcon`。
