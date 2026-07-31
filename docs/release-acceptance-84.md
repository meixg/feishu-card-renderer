# #84 最终发布验收证据

## 基线选择与测量

迁移前固定基线是 `4a1c3702fc3c33105fcc10ed00f4b87b9d7d204d`
（`fix: hide search for short static selects (#73)`）。它是父票 #74 第一笔实现
`352d3169cc4cb96298b9124d3e4190f611b389bc`（#85）的直接父提交，因此没有任意挑选
较小产物，也不会混入迁移中途状态。候选基于 #84 HEAD。两边必须使用各自提交锁定的
`pnpm-lock.yaml`，在同一 Node 24 与 pnpm 环境执行：

```bash
pnpm install --frozen-lockfile
pnpm build
node scripts/measure-bundle-dirs.mjs /path/to/4a1c370/dist dist
```

脚本对 `index.js`、共享 renderer/schema chunk、唯一 `styles.css` 和 lazy VChart
chunk 读取精确字节，并使用 Node `zlib.gzipSync(..., { level: 9 })`。每类 hashed
chunk 必须精确匹配一个文件，零个或多个都会明确失败，禁止依赖 `readdir()` 顺序。
输出 JSON 可直接保存为 CI artifact；不使用 Vite 两位小数展示值。

本次使用 Node 24.18.1、Vite 7.3.6 和上述 level-9 gzip 方法实测：

| 产物 | pre-#74 raw / gzip | #84 raw / gzip | 变化 raw / gzip |
| --- | ---: | ---: | ---: |
| eager renderer `index.js` | 228,472 / 58,337 B | 247,052 / 62,749 B | +18,580 / +4,412 B |
| shared renderer/schema | 28,000 / 7,343 B | 28,968 / 7,539 B | +968 / +196 B |
| 唯一 `styles.css` | 23,908 / 4,818 B | 41,685 / 7,127 B | +17,777 / +2,309 B |
| lazy VChart | 2,810,352 / 643,635 B | 2,810,352 / 643,635 B | 0 / 0 B |

增长可由固定 Select/Combobox/Drawer/Dialog/Menu/Calendar/Field wrapper、可访问状态和
named Lucide 图标解释；它替换旧主题并覆盖全部交互家族，不是增加第二条视觉路径。
React/ReactDOM/jsx runtime 仍 external，Lucide 没有 dynamic registry/整库 import，
VChart lazy chunk 精确不变，因此接受这组变化。

## Legacy inventory 与架构

[`legacy-interaction-inventory.json`](specs/legacy-interaction-inventory.json) 记录
共享样式中删除的旧 selector、迁入固定 Nova owner 的仍在用 selector，以及明确排除
的内容 owner。独立 immutable registry 固定 baseline 的 35 个规范化 choice
selector 及 moved/removed 分类；`pnpm ui:verify` 使用 PostCSS AST 做
manifest ↔ registry ↔ actual owner 三向精确集合比较，不接受 substring 或清单自报
闭环。TypeScript AST 同时禁止 `src/components/ui/**` 外的 Base UI
import/re-export/dynamic import/require。所有内部 UI 源文件必须被精确 provenance
registry 覆盖，共享 `styles.css` 明确不得进入 wrapper hash。

closed mobile trigger 的 selected value 与 placeholder 保留 `min-width: 0`、
ellipsis 和 nowrap 集成布局，placeholder 使用 Nova private muted token；390/400px
真实浏览器测试同时断言无横向 overflow、文本不挤占 opener 且 opener 仍可操作。
choice indicator/chip remove 均为 UI module 中的 named Lucide `CheckIcon`/`XIcon`，
不再输出字体字形。

## 视觉与浏览器纪律

严格矩阵是 light/dark × PC/mobile × compact 400/default 600/fill 共 12 个组合，
以仓库 pinned shadcn snapshot 为唯一视觉基线。阈值、diff ratio、viewport、截图
边界和 #91 的 single worker、两个 Chromium flags、真实 binary/version gate 均不
改变。常规严格 visual 执行一次；专项 determinism 手工工作流连续执行三次。

若本次 owner 收缩产生 snapshot diff，只更新直接受影响的选择控件图片并在 PR 审计
中逐图说明；Markdown、table、media 与其它内容 PNG 不批量重录。

最终基线差异共 18 张 Linux PNG，阈值与截图范围均未改变：

- 12 张完整 release matrix：每张都包含选择字段，因旧 choice typography/34px
  密度 owner 被移除，统一采用 Nova field typography 与 32px control。
- 4 张 choice 专项：PC compact popup，以及 mobile Drawer、dark long option 和
  person resource，直接反映相同 owner 收缩。
- `card-form-controls-dark`：标准 Ubuntu runner 连续两次 strict run 与一次
  artifact-only refresh 得到同一 SHA-256
  `a3b4247e641b66a0d62c90129bb412ffd3ce4a3009b975f14bd8e3e22d520090`；
  相对旧图只有 288 个精确 RGB 像素（42 个 Playwright significant pixels）变化，
  因此更新这一张稳定暗色光栅。
- `card-form-controls-mobile`：同一精确 HEAD 的 artifact-only refresh 与后续标准
  Ubuntu strict run 得到逐字节相同 SHA-256
  `1754f49d44b537f2b891efa03656d06a7f545752149f8f0296be672f3fb72cec`；
  CI 报告 922 个 significant pixels，来自同组 mobile choice 密度 owner 收缩，
  因此只追加这一张已被 CI 证明稳定的 mobile 光栅，不更新其它内容图。

## 已知限制

- mobile virtual keyboard 自动化仍是 Chromium visual viewport 模拟，不代替真实
  iOS/Android、IME 与 Safari 人工设备验证。
- `laser` 映射为 outline；协议 link 行为仍通过语义 button/action 输出。
- 图片、选项文字、Markdown、table 和 media 内容由 renderer 拥有；shadcn 只拥有
  标准交互面及状态视觉。
- 不承诺与 mutable shadcn 网站或任一飞书客户端版本像素等价。
