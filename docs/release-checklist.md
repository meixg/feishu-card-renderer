# 1.0 安全审查与发布验收

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

- [x] 版本 `1.0.0`，公开 ESM、声明和 scoped CSS。
- [x] React/ReactDOM 是 peer dependencies，不打入 bundle。
- [x] VChart 仅存在于独立懒加载 chunk。
- [x] 根入口提供 renderer，`./schema` 子路径提供纯函数和确认的协议类型；资源
  resolver 接收 `AbortSignal`；fixture
  验收索引保持内部使用。
- [x] 安装、集成、SSR、限制和迁移文档已就绪。
- [x] 根 ESM 入口可在无 DOM 的 Node 环境导入，导入时不访问网络；Markdown
  解析依赖进入 ESM 产物，React/ReactDOM 保持 external。

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
npm pack --dry-run
```

本清单不执行 `npm publish`，也不创建 GitHub Release。发布者仍须核对 tag、
changelog、registry 身份和组织发布权限。
