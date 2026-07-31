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
chunk 读取精确字节，并使用 Node `zlib.gzipSync(..., { level: 9 })`。输出 JSON 可
直接保存为 CI artifact；不使用 Vite 两位小数展示值。

本次使用 Node 24.18.1、Vite 7.3.6 和上述 level-9 gzip 方法实测：

| 产物 | pre-#74 raw / gzip | #84 raw / gzip | 变化 raw / gzip |
| --- | ---: | ---: | ---: |
| eager renderer `index.js` | 228,472 / 58,337 B | 246,887 / 62,742 B | +18,415 / +4,405 B |
| shared renderer/schema | 28,000 / 7,343 B | 28,968 / 7,539 B | +968 / +196 B |
| 唯一 `styles.css` | 23,908 / 4,818 B | 41,468 / 7,104 B | +17,560 / +2,286 B |
| lazy VChart | 2,810,352 / 643,635 B | 2,810,352 / 643,635 B | 0 / 0 B |

增长可由固定 Select/Combobox/Drawer/Dialog/Menu/Calendar/Field wrapper、可访问状态和
named Lucide 图标解释；它替换旧主题并覆盖全部交互家族，不是增加第二条视觉路径。
React/ReactDOM/jsx runtime 仍 external，Lucide 没有 dynamic registry/整库 import，
VChart lazy chunk 精确不变，因此接受这组变化。

## Legacy inventory 与架构

[`legacy-interaction-inventory.json`](specs/legacy-interaction-inventory.json) 记录
共享样式中删除的旧 selector、迁入固定 Nova owner 的仍在用 selector，以及明确排除
的内容 owner。`pnpm ui:verify` 使用 CSS AST 对照真实 import/rule，而不是全文字符串
搜索；TypeScript AST 同时禁止 `src/components/ui/**` 外的 Base UI
import/re-export/dynamic import/require。所有内部 UI 源文件必须被精确 provenance
registry 覆盖，共享 `styles.css` 明确不得进入 wrapper hash。

## 视觉与浏览器纪律

严格矩阵是 light/dark × PC/mobile × compact 400/default 600/fill 共 12 个组合，
以仓库 pinned shadcn snapshot 为唯一视觉基线。阈值、diff ratio、viewport、截图
边界和 #91 的 single worker、两个 Chromium flags、真实 binary/version gate 均不
改变。常规严格 visual 执行一次；专项 determinism 手工工作流连续执行三次。

若本次 owner 收缩产生 snapshot diff，只更新直接受影响的选择控件图片并在 PR 审计
中逐图说明；Markdown、table、media 与其它内容 PNG 不批量重录。

## 已知限制

- mobile virtual keyboard 自动化仍是 Chromium visual viewport 模拟，不代替真实
  iOS/Android、IME 与 Safari 人工设备验证。
- `laser` 映射为 outline；协议 link 行为仍通过语义 button/action 输出。
- 图片、选项文字、Markdown、table 和 media 内容由 renderer 拥有；shadcn 只拥有
  标准交互面及状态视觉。
- 不承诺与 mutable shadcn 网站或任一飞书客户端版本像素等价。
