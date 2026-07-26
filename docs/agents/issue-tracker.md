# Issue tracker：GitHub

本仓库的 Issue 和 PRD 使用 GitHub Issues 管理。所有操作使用 `gh` CLI。

## 常用操作

- 创建 Issue：`gh issue create --title "..." --body "..."`
- 查看 Issue：`gh issue view <编号> --comments`
- 列出 Issue：使用 `gh issue list`，并按需指定标签和状态
- 评论 Issue：`gh issue comment <编号> --body "..."`
- 添加或移除标签：使用 `gh issue edit --add-label` 或 `--remove-label`
- 关闭 Issue：`gh issue close <编号> --comment "..."`

在当前仓库中运行 `gh` 时，由 Git 远程地址自动推断目标仓库。

## 是否将 Pull Request 作为分诊入口

否。

外部 Pull Request 默认不进入与 Issue 相同的分诊流程。如需改变此行为，可将本节改为“是”。

## 技能操作约定

- 当技能要求“发布到 issue tracker”时，创建 GitHub Issue。
- 当技能要求“读取相关工单”时，运行 `gh issue view <编号> --comments`。
- GitHub 的 Issue 和 Pull Request 共享编号；编号类型不明确时，先尝试 `gh pr view`，再尝试 `gh issue view`。

## Wayfinder 操作

- 路线图：使用带有 `wayfinder:map` 标签的单个 Issue。
- 子任务：优先使用 GitHub 子 Issue；不可用时，在路线图正文中使用任务列表，并在子任务开头注明 `Part of #<路线图编号>`。
- 子任务标签：使用 `wayfinder:research`、`wayfinder:prototype`、`wayfinder:grilling` 或 `wayfinder:task`。
- 阻塞关系：优先使用 GitHub 原生 Issue 依赖；不可用时，在子任务开头维护 `Blocked by: #<编号>`。
- 前沿任务：从路线图尚未关闭的子任务中，排除仍有开放阻塞项或已有负责人的任务，按路线图顺序选择第一个。
- 认领任务：`gh issue edit <编号> --add-assignee @me`。
- 完成任务：先添加结果评论，再关闭 Issue，并将上下文链接补充到路线图的“已做决策”部分。
