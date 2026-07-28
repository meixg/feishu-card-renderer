# 贡献指南

## 发布影响声明

Changesets 是版本等级和中文 CHANGELOG 的唯一事实来源。本仓库不要求 Conventional
Commits，也不使用 commitlint 从提交信息推断版本。

除 Changesets 自动维护的 Release PR 外，每个 PR 必须且只能选择一种方式：

1. 添加有效 Changeset。公开 API、运行时行为、依赖或 peer dependency、随 npm 包
   发布的文档发生变化时必须使用此方式。
2. 请求维护者添加 `release:skip`。仅内部测试、CI、agent 配置和不随包发布的维护
   文档可以使用。标签必须由具备 `maintain` 或 `admin` 权限的维护者实际添加；
   检查会审计 GitHub label 事件及该 actor 的权限。

运行 `pnpm changeset` 创建声明。摘要必须是面向消费者的中文，具体模板见
[`.changeset/README.md`](.changeset/README.md)。`0.x` 中兼容修复用 `patch`，新增
能力用 `minor`；breaking change 也用 `minor`，并逐项说明影响契约、消费者影响和
迁移方式。自动检查只验证结构和基本中文内容，语义质量由评审负责。

Release PR 来自标准分支 `changeset-release/main`，默认保持 Draft。它只豁免上述
二选一检查，仍必须通过仓库所有其它 required checks。

## 本地验证

```bash
pnpm changeset status
pnpm typecheck
pnpm lint
pnpm unit
pnpm workflows:verify
```
