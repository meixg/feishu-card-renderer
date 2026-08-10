# shadcn/ui Base UI `base-nova` 表格分页视觉基线

Issue #83 基于 shadcn-ui/ui commit
[`5203f537d152844a920caa66e865bc61c6ff4860`](https://github.com/shadcn-ui/ui/commit/5203f537d152844a920caa66e865bc61c6ff4860)，
核对日期为 2026-07-31。审查输入为该 commit 下的 Base UI 版 Pagination、
Button、Nova style 与 neutral theme。

上游 Pagination 是 `nav > ul > li` 与 Button 包装链接的组合。表格分页没有 URL
或分页 action 协议，因此本地保留相同容器、列表、Button variant/size 与
`aria-current` composition，并将链接诚实适配为原生 button。table caller 使用
`PaginationLink` 呈现可直接跳转的页码，在大页集两端使用
`PaginationEllipsis`，同时保留 `PaginationPrevious` 和 `PaginationNext`；没有
伪造 Base UI pagination primitive，也没有改变 `page_size`、本地行切片或
`CardAction`。

机器可读 provenance 位于
[`shadcn-base-nova-table-pagination-baseline.json`](./shadcn-base-nova-table-pagination-baseline.json)。
其上游 key、reviewed hash、本地 key、reviewed hash 与真实文件 hash 分别由独立
registry 校验。删除 key、替换路径、修改合法格式 hash，或同步修改 manifest 与
临时本地文件都会 fail closed；共享 `src/styles.css` 不在 hash 边界内。

`src/styles/table-pagination-nova.css` 是唯一分页视觉 owner。它只处理表格横向
滚动、分页布局与窄卡 overflow；颜色、边框、圆角、阴影、focus 与标准控件尺寸
全部来自固定 Button/Nova adaptation。上一页和下一页使用带本地化文字的标准
`size="default"`，页码使用标准 `size="icon"`，当前页使用 outline active state；
分页内容在可用宽度内居右，窄卡溢出时通过 safe alignment 回退到可滚动起点。
scoped layout CSS 不覆盖 Button 尺寸，并仅取消分页按钮按下时的纵向位移，避免
横向滚动容器产生瞬时纵向 scrollbar。上一页、下一页和省略号使用具名 Lucide
`ChevronLeft`/`ChevronRight`/`MoreHorizontal`，图标为装饰性，页码和翻页控件的
accessible name 由 renderer locale 提供。
