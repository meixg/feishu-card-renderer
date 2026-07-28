# 0.0.1 public preview 安全审查与发布验收

## 安全边界

- [x] 根 JSON、getter、循环引用、超深/超量输入按不可信数据处理。
- [x] Markdown 经有限解析和消毒；脚本、事件属性和危险链接不可执行。
- [x] Markdown 对抗 fixture 覆盖长度、深度、节点/复杂节点、表格、病理分隔符、
  多链接、原始 HTML、未知扩展标签与远程图片；超限保留安全前缀。
- [x] URL 仅允许明确协议，unsupported action 不产生导航动作。
- [x] px、margin、padding、RGBA 和枚举经过范围/白名单解析。
- [x] 图片和人员仅经 resolver；失败不泄露 key、人员 ID、token 或内部 URL。
- [x] VChart 拒绝函数、getter、危险原型、脚本/HTML/DOM 扩展和注册入口。
- [x] 每个声明支持的飞书图表类型都以独立最小 spec 在真实 Chrome/VChart
  runtime 中进入 ready，并生成 canvas/SVG。
- [x] 生产组件不记录完整卡片、人员 ID 或 callback value。
- [x] recoverable 输入保留稳定占位；没有静默放宽安全限制。

## 包契约

- [x] 包名 `feishu-card-renderer`，版本 `0.0.1`，公开 ESM、声明和 scoped CSS。
- [x] React/ReactDOM 是 peer dependencies，不打入 bundle。
- [x] `@base-ui/react`、`react-day-picker`、CVA、`clsx` 和
  `tailwind-merge` 是 externalized runtime dependencies；私有 shadcn wrapper
  编译进 renderer，未从公共入口导出。
- [x] Tailwind CSS 4 与 PostCSS 只用于构建；发布包只有一个预编译
  `dist/styles.css`，无 preflight、宿主全局 selector 或消费者 Tailwind 要求。
- [x] VChart 仅存在于独立懒加载 chunk。
- [x] 根入口提供 renderer，`./schema` 子路径提供纯函数和确认的协议类型；资源
  resolver 接收 `AbortSignal`；fixture
  验收索引保持内部使用。
- [x] 安装、集成、SSR、限制和迁移文档已就绪。
- [x] 根 ESM 入口可在无 DOM 的 Node 环境导入，导入时不访问网络；Markdown
  解析依赖进入 ESM 产物，React/ReactDOM 保持 external。

## shadcn/Base UI 交互升级发布说明

- Tailwind 3.4 隔离构建已迁移到 Tailwind 4；继续保持 `.fcr-root` 主题作用域、
  `fcr` 命名空间和单一预编译 CSS。
- confirm、preview、overflow、choice、form field、checkbox/radio、PC date 和
  collapsible 已迁移到私有 shadcn/Base UI 交互层；time/datetime 与 mobile date
  按规格保留原生输入。
- 每张卡片拥有独立 portal host。SSR import 不读取 DOM，hydration 复用服务端 host；
  打开 overlay 时卸载卡片会清理 portal、focus trap 和 inert 状态。
- 多卡 confirm 在 host 程序化切换时执行单活动 modal handoff；真实 Chrome 验证
  两个 portal DOM 的退出/进入同时挂载窗口、焦点隔离、卸载与 inert 清理。
- 选择器新增已有选项的本地搜索、100 项展示上限、对象值 opaque token、多选 chips
  和 mobile Drawer；不新增网络查询或业务校验。
- mobile Drawer 消费 Base UI `--drawer-keyboard-inset`。自动化以 390×844
  layout viewport 和 390×420 模拟 visual viewport 验证 bounds、overflow 与焦点
  返回；真实 OS 软键盘、IME 和 Safari viewport 仍是发布前人工设备检查项。
- 飞书 JSON 2.0、normalization、form state、安全校验和 `CardAction` 契约保持不变。
  内部 DOM、未文档化 class、Base UI `data-*` 和历史视觉快照不兼容，且没有 legacy
  interaction mode。

## Base UI initiative bundle 影响

使用 Node `zlib.gzipSync(..., { level: 9 })`，在同一 Node/pnpm 环境分别构建
initiative 前 `main@6f87080`、集成点 `93ef06e` 和本 #29 验收头。数值为精确字节；
Vite 控制台的两位小数仅用于交叉核对。

| 产物 | `main@6f87080` | 集成点 `93ef06e` | #29 验收头 | 基线 → 验收变化 |
| --- | ---: | ---: | ---: | ---: |
| eager renderer raw | 192,873 B | 225,734 B | 226,025 B | +33,152 B |
| eager renderer gzip | 51,194 B | 57,860 B | 57,935 B | +6,741 B |
| shared renderer/schema chunk raw/gzip | 28,000 / 7,343 B | 28,000 / 7,343 B | 28,000 / 7,343 B | 0 / 0 B |
| CSS raw | 14,196 B | 23,557 B | 23,536 B | +9,340 B |
| CSS gzip | 3,134 B | 4,763 B | 4,766 B | +1,632 B |
| lazy VChart raw/gzip | 2,810,352 / 643,635 B | 2,810,352 / 643,635 B | 2,810,352 / 643,635 B | 0 / 0 B |

增长来自 Base UI/shadcn 交互组合和完整的 popup/Drawer/Field/Calendar 样式。Base UI、
Calendar、CVA、`clsx`、`tailwind-merge`、React 和 ReactDOM 保持 external；
VChart lazy chunk 与 shared schema chunk 没有变化。#29 删除了未使用的通用 portal
与 cleanup helper 及一条原生 multi-select CSS；Spec 审查修复又加入单活动 modal
handoff 和 Drawer keyboard inset。相对集成点，最终 eager renderer 为
+291 B raw / +75 B gzip，CSS 为 -21 B raw / +3 B gzip。

## Markdown bundle 影响

以 Markdown 升级前提交 `14846e6` 和同一锁定工具链实测：

| 产物 | 升级前 | 当前 | 变化 |
| --- | ---: | ---: | ---: |
| eager renderer `index.js`（raw） | 50.54 kB | 192.87 kB | +142.33 kB |
| eager renderer `index.js`（gzip） | 13.64 kB | 51.45 kB | +37.81 kB |
| shared renderer chunk（raw/gzip） | 24.92/6.67 kB | 28.00/7.36 kB | +3.08/+0.69 kB |
| CSS（raw/gzip） | 9.81/2.35 kB | 14.20/3.14 kB | +4.39/+0.79 kB |

增长主要来自 CommonMark/GFM 解析器及为 SSR 选择的无 DOM 完整字符实体表；
VChart 仍是独立 lazy chunk，不计入 eager renderer。构建门禁输出当前 raw 指标，
避免把易随 minifier/Node 版本变化的精确字节值设成脆弱预算。

## 发布命令

```bash
pnpm typecheck
pnpm lint
pnpm unit
pnpm component
pnpm accessibility
pnpm visual
pnpm build
pnpm site:build
pnpm package:verify
```

本清单不执行 `npm publish`，也不创建 GitHub Release。发布者仍须核对 tag、
changelog、registry 身份和组织发布权限。

## Draft Release PR 初始化

`Maintain Changesets release PR` workflow 只在可信 `main` 上运行，使用仓库内置
`GITHUB_TOKEN` 和 Changesets 的 GitHub API commit 模式维护
`changeset-release/main` 上唯一的 Draft Release PR。`prDraft: always` 保证新建
和每次更新后都回到 Draft。此阶段只聚合版本与根
`CHANGELOG.md`，不 publish npm、不创建 tag/Release，也不申请 OIDC。

bot 使用 `GITHUB_TOKEN` 创建或更新 PR 不会触发后续 workflow。维护者必须先审阅
聚合版本与 CHANGELOG，再点击 **Ready for review**；`ready_for_review` 事件会触发
Release impact、`Package candidate (Node 22.12.0)`、`Package candidate (Node 24)`、
`Full quality (Node 24)` 和其它 PR checks。任何后续 Changeset 更新都会再次设为
Draft，维护者需重新审阅并再次点击 Ready。

Release impact workflow 使用只读 `pull_request_target`，只 checkout 事件中的
base SHA 并执行 `main` 上的可信 checker。PR changed files、label events、actor
permission 和候选 Changeset 内容都通过 GitHub API 读取；候选文档固定按 head SHA
读取且仅作为文本数据，不 checkout 或执行 PR head，也不安装其依赖。

#40 本身是引入该 base checker 的 bootstrap PR，因此合并前的 `main` 无法运行新的
可信-base workflow。PR #48 最终 head 使用维护者凭据通过 GitHub Status API 写入
一次性、可审计的 `Release impact` 状态；这不是 workflow fallback，也不会进入
`main`。#40 合并后所有 PR（包括外部 PR）只能走上述可信-base 路径。

GitHub 仓库的 **Settings → Actions → General → Workflow permissions** 中，
“Allow GitHub Actions to create and approve pull requests” 是代码库外设置。若当前
禁用，首次运行会无法创建 Release PR；按父规格的后续 #41 由维护者人工启用并记录，
本 #40 不声称已修改或验证该设置。
