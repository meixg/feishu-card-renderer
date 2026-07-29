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

以上本地清单不执行 `npm publish`，也不创建 GitHub Release。正式自动发布与恢复
流程见下文；发布者仍须核对 tag、changelog、registry 身份和组织发布权限。

## OIDC 自动发布

固定入口是 [`.github/workflows/release.yml`](../.github/workflows/release.yml)，与
npm Trusted Publisher 中配置的 workflow filename 精确一致。它只响应 `main` push，
发布 job 使用 GitHub 托管 runner、Node 24 和固定 npm `11.18.0`；仅该 job 申请
`id-token: write`。仓库不保存或传递 `NPM_TOKEN`、`NODE_AUTH_TOKEN` 或其它 registry
写 token。

Release PR 合并后，workflow checkout 事件的完整 `github.sha`，重新 frozen install、
build，并执行真实 `npm pack` tarball 的隔离消费者验证。正常路径委托
Changesets CLI 直接 publish；Trusted Publishing 自动为 `0.0.1` 之后的公开版本生成
provenance。发布后的 reconcile 使用 GitHub API 创建精确
`feishu-card-renderer@<version>` tag 与 GitHub Release；Release 只有 notes 与 source，
不上传 `.tgz` 或 `dist/`。`changesets.yml` 是 Draft Release PR 的唯一 owner；
`release.yml` 不运行 Changesets Action，也不创建或更新 Release PR。

发布队列使用独立 `npm-release` concurrency group，且 `cancel-in-progress: false`。
因此新的 `main` 更新会等待正在运行的发布，不会取消或并发进入 npm publish。

### 每次运行的状态机

workflow 在发布尝试后重新读取 `package.json`、npm registry、tag 与 GitHub Release：

1. npm 中不存在本地版本：状态为 `npm-unpublished`，此时才将待发布 source 绑定到
   当前 workflow 的 `github.sha`。若 publish 失败，整个 run 失败；禁止创建
   tag/Release 来伪装已发布，且 npm 前已有 metadata 也会 fail closed。
2. npm 已有本地版本：以该版本不可变的 npm `gitHead` 作为 source record，不要求它
   等于触发本次 workflow 的后续 `main` SHA。若 tag 或 Release 缺失，状态为
   `npm-published-metadata-missing`，只用 GitHub API 补缺失 metadata，不再次 publish。
3. npm、`latest`、tag、Release、source commit 与 provenance 一致：状态为
   `consistent`，安全 no-op。现有人工 bootstrap `0.0.1` 是唯一允许没有 provenance
   的版本。
4. 任一已有记录指向其它 commit、Release 是 draft/prerelease、Release 有 package
   asset、`latest` 偏离当前正常发布，或自动版本缺 provenance：fail closed，先调查，
   不自动改写不可变历史。

发布成功后必须看到精确 tag `feishu-card-renderer@<version>`、非 Draft/非 prerelease
Release、零 assets、npm `latest=<version>`、npm `gitHead=<release commit>`，并在
`0.0.1` 之后看到 npm provenance。

维护者需要在本机做绝对只读核验时，为 reconcile 命令设置
`RELEASE_READ_ONLY=1`；任何缺失 metadata 会直接报错，不进入 tag/Release 修复。

### 重跑与部分成功恢复

- 任意失败先使用 GitHub 的 **Re-run failed jobs**；不要从本机补发 npm。若 npm 尚未
  发布，重跑仍由同一固定 workflow 和 OIDC 完成 publish。
- 若 npm publish 已成功但后续 tag/Release reconcile 失败，重跑会由 registry
  检测到已存在版本，并只补缺失 tag/Release。它绝不再次 publish 同一版本。
- 若 tag 或 Release 已存在但指向错误 source，停止重跑并开 incident；release tag
  ruleset 禁止覆盖或删除，不能用 force/update 绕过。
- metadata 修复完成后再次只读核对 npm version、`latest`、`gitHead`、provenance、
  tag 解引用 commit、Release 状态与 assets。将 workflow run 与核对结果记录到关联
  Issue。

### 错误版本恢复

已公开的版本视为不可变历史。正常恢复明确禁止 `npm unpublish`、删除/移动 release
tag、覆写 GitHub Release 对应版本或复用版本号。

1. 评估影响并准备包含中文 Changeset 的修复 PR；安全修复仍走同一 Release PR 审计。
2. 用维护者 2FA 在 npm 执行
   `npm deprecate feishu-card-renderer@<bad-version> "<reason and replacement>"`。
3. 严重回归且替代版尚未就绪时，可临时执行
   `npm dist-tag add feishu-card-renderer@<previous-stable> latest`。记录操作者、UTC、
   原因、旧/新 dist-tag；这不是删除坏版本。
4. 合并修复的 Release PR，发布新的替代版本。自动发布成功后 `latest` 应回到新版本；
   再完成跨系统核对，并更新 deprecation 文案指向替代版本。

deprecate 与临时回移 `latest` 是有意保留的人工 2FA incident 操作，不放进普通
workflow，也不使用 automation token。

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

### 首次发布 bootstrap 例外

首次正式发布前，只有同时确认以下事实，维护者才能用 `release:skip` 修正 Changesets
bootstrap 记账：

- npm 上从未发布过本包，release tag 与 GitHub Release 中也没有对应版本。
- `package.json` 已经是计划的首次版本 `0.0.1`。
- 待处理 Changeset 记录的内容已经位于尚未发布的同一 `0.0.1` 源码中，不是新增的
  消费者变化。

允许的修正仅限删除该 Changeset，并将其摘要折入现有 `0.0.1` Initial release
CHANGELOG。PR 必须记录上述理由；添加 `release:skip` 前，维护者还必须只读查询 npm，
确认 `feishu-card-renderer@0.0.1` 仍不存在，并确认没有对应 release tag 或
GitHub Release。该审计记录解释 bootstrap PR 修改 shipped CHANGELOG 的合法性。

首次正式发布完成后，此例外永久失效；后续 shipped docs 或其它消费者变化必须使用
正常 Changeset，不能借 bootstrap bookkeeping 或 `release:skip` 绕过。

### 无 Changeset 后退休 stale Draft Release PR

删除最后一个 bootstrap Changeset 时，以 maintenance workflow 完成后的仓库状态为准，
按以下顺序处理：

1. 不在 bootstrap 修复 PR 合并前关闭 stale Draft；否则 `main` 仍有 Changeset，
   `Maintain Changesets release PR` workflow 会立即重建或更新它。
2. 合并 bootstrap 修复 PR 后，等待该次 `Maintain Changesets release PR` workflow
   成功完成。
3. 只读确认 `main` 没有待处理 Changeset、`package.json` 仍为 `0.0.1`，并检查
   `changeset-release/main` PR 的当前状态。
4. 若既有 Draft 已关闭，记录关闭 actor、UTC 时间和可核实的 reason 后继续，不推断
   具体关闭机制；本次 bootstrap 中，#51 的关闭事件 actor 为 `meixg`，时间为
   `2026-07-28T11:19:11Z`，GitHub timeline 未记录显式 reason。
5. 若既有 Draft 仍 open 且仍是错误提议 `0.0.2` 的 stale Release PR，再由维护者
   显式关闭并评论说明它是首次发布 bootstrap 记账产生、对应 Changeset 已折入未发布的
   `0.0.1` Initial release。
6. 最后只读确认不存在 open 的 `changeset-release/main` PR。

以上退休步骤不发布 npm、不创建 tag 或 GitHub Release，也不代替首次发布的人工作业。

Release impact workflow 使用只读 `pull_request_target`，只 checkout 事件中的
base SHA 并执行 `main` 上的可信 checker。PR changed files、label events、actor
permission 和候选 Changeset 内容都通过 GitHub API 读取；候选文档固定按 head SHA
从事件给出的 `pull_request.head.repo.full_name`（包括外部 fork）读取，仓库名、路径和
ref 均严格校验或逐段编码。内容仅作为文本数据，不 checkout 或执行 PR head，也不
安装其依赖；changed files、label events 和 actor permission 始终查询 base 仓库。

#40 本身是引入该 base checker 的 bootstrap PR，因此合并前的 `main` 无法运行新的
可信-base workflow。PR #48 最终 head 使用维护者凭据通过 GitHub Status API 写入
一次性、可审计的 `Release impact` 状态；这不是 workflow fallback，也不会进入
`main`。#40 合并后所有 PR（包括外部 PR）只能走上述可信-base 路径。

GitHub 仓库的 **Settings → Actions → General → Workflow permissions** 中，
“Allow GitHub Actions to create and approve pull requests” 是代码库外设置。若当前
禁用，首次运行会无法创建 Release PR。仓库保持默认 workflow permission 为
`read`，仅启用该开关；需要写权限的 `changesets.yml` 仍逐项声明
`contents: write` 与 `pull-requests: write`，不使用 PAT 或自建 GitHub App。

## GitHub 仓库治理

可复现的 REST 请求体保存在 [`.github/rulesets/main.json`](../.github/rulesets/main.json)
和 [`.github/rulesets/release-tags.json`](../.github/rulesets/release-tags.json)。
它们是静态契约，不会由 PR workflow 自动写入仓库设置。应用前先读取现状；按
`name` 与 `target` 找到同名 ruleset 后使用 `PUT /repos/{owner}/{repo}/rulesets/{id}`，
不存在时才使用 `POST /repos/{owner}/{repo}/rulesets`，从而保持幂等。

`Protect main` 仅匹配 `refs/heads/main`，要求所有更新通过 PR，并要求分支保持最新、
解决 review conversations。单维护者阶段 required approval 数量为 `0`。它禁止
删除和 non-fast-forward push，并要求以下四个 check：

- `Package candidate (Node 22.12.0)`
- `Package candidate (Node 24)`
- `Full quality (Node 24)`
- `Release impact`

每个 required check 都绑定 GitHub Actions App integration ID `15368`；不要去掉
`integration_id`，否则同名手工 commit status 可能满足规则。`Protect release tags`
仅匹配 `refs/tags/feishu-card-renderer@*`，没有 `creation` 规则，因而允许首次创建；
它的 `update` 与 `deletion` 规则禁止后续改写和删除。

两个 ruleset 唯一的 bypass actor 都是内置 `RepositoryRole` 管理员角色（actor ID
`5`，`always`）。这是 emergency-only 通道，不得授予 Changesets bot、普通用户、
GitHub App 或 deploy key 绕过权限。管理员每次使用 bypass 前必须在关联 Issue 或
incident 中记录操作者、UTC 时间、受影响 ref、绕过规则、原因和后续修复，并在操作
完成后贴出 ruleset insights 或 audit log 链接。Changesets 使用的内置
`GITHUB_TOKEN` 只创建/更新 PR，不需要 ruleset bypass。

维护者先确认 `gh` 已登录且当前身份具有仓库设置读取权限，再运行只读 verifier：

```bash
gh auth status
pnpm governance:verify
```

该命令不写 GitHub、不读取或输出 token，也不创建、改写或删除 tag。它按
`name + target` 唯一解析 live ruleset（不硬编码 ruleset ID），规范化比较 live
详情与仓库 JSON，并独立读取 `main` effective rules。它需要维护者本地已有的
GitHub 认证，因此不会加入普通 PR CI。

回读时确认 Actions 输出恰为 `default_workflow_permissions: read` 和
`can_approve_pull_request_reviews: true`；两个 ruleset 均为 `active`，匹配器、规则、
bypass 与静态契约一致。`rules/branches/main` 的 effective state 必须同时列出四个
required checks、PR、删除与 non-fast-forward 规则。tag 语义通过 API 中缺少
`creation` 且存在 `update`/`deletion` 证明；不要为了验证而创建、改写或删除真实
release tag。
