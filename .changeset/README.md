# Changeset 写作模板

运行 `pnpm changeset`，只选择公开包 `feishu-card-renderer`，然后用面向消费者的中文
描述可观察变化。版本等级遵循：

- `patch`：兼容修复和小改进。
- `minor`：新增公开能力；在 `0.x` 阶段也用于 breaking change。

普通示例：

```md
---
"feishu-card-renderer": patch
---

修复窄屏卡片中长链接撑破容器的问题，消费者无需修改现有配置。
```

Breaking change 必须明确写出三项，不依赖自动 NLP 判断：

```md
---
"feishu-card-renderer": minor
---

**Breaking**

- 影响契约：`CardRenderer` 的 `example` 属性不再接受旧字符串格式。
- 消费者影响：仍传入旧格式的应用会收到校验诊断并使用降级视图。
- 迁移方式：改为传入 `{ value: string }`，再升级到此版本。
```

不要写提交过程、测试补充或“修复问题”这类只有维护者能理解的摘要。
仓库中的 [`docs/examples/changeset.md`](../docs/examples/changeset.md) 也可直接作为
本地 dry run 输入。
