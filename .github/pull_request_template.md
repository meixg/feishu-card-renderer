## 变更

<!-- 说明这项变更解决什么问题。 -->

## 发布影响（二选一）

- [ ] 已添加有效 Changeset（面向消费者的中文说明）
- [ ] 此变更仅涉及内部维护，申请维护者添加 `release:skip`

> 不要同时选择两项。`release:skip` 只有由具备 maintain/admin 权限的维护者通过
> GitHub 标签事件添加才有效；PR 作者或模板勾选不能授权。

## 验证

<!-- 列出已运行的检查。 -->

- [ ] 已运行 `pnpm pr:preflight`（Linux 像素比较由 required CI 完成）；仅内部维护
      变更可运行 `pnpm pr:preflight --release-skip`，且仍需维护者添加对应标签
