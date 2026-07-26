# 1.0 集成指南

## 安装

```bash
pnpm add @meixg/feishu-card-renderer react react-dom
```

包仅发布 ESM、TypeScript 声明和预编译 CSS。React/ReactDOM 是 peer
dependencies；宿主不需要 Tailwind。应用入口必须加载一次样式：

```tsx
import {
  CardRenderer,
  type CardAction,
  type CardDiagnostic,
  type Person,
} from "@meixg/feishu-card-renderer";
import "@meixg/feishu-card-renderer/styles.css";
```

不依赖 React 的校验、normalization 和协议类型从独立子路径导入：

```ts
import {
  normalizeCard,
  validateCard,
  type Card,
  type CardDiagnostic,
} from "@meixg/feishu-card-renderer/schema";
```

## 最小集成

```tsx
function CardHost({ payload }: { payload: unknown }) {
  return (
    <CardRenderer
      card={payload}
      locale="zh_cn"
      colorScheme="light"
      device="pc"
      onAction={(action: CardAction) => {
        console.log(action.type);
      }}
      onDiagnostic={(diagnostics: readonly CardDiagnostic[]) => {
        // 生产日志只记录 code/path，不记录完整卡片或 callback value。
        diagnostics.forEach(({ code, path }) => console.warn(code, path));
      }}
    />
  );
}
```

`card` 是 `unknown`，渲染器不会修改输入。渲染器始终要求根对象显式声明
`"schema": "2.0"`，不提供关闭版本边界的开关。fatal 错误可通过 `fallback` 定制整卡降级；
recoverable 错误保留稳定占位和诊断，公共 API 不允许逐 tag 绕过校验。

## 公共 API

1. React 入口：`CardRenderer`、`CardRendererProps`。
2. `@meixg/feishu-card-renderer/schema` 纯函数：`validateCard`、
   `normalizeCard`、`isCardElement`、`isCardComponentTag`、`childPath`。
3. 协议与宿主类型：`Card`、`CardElement`、`CardComponentTag`、
   `CardDiagnostic`、`ValidationResult`、`CardAction`、`Person`。
4. 资源 seam：`resolveImage(imgKey, signal)`、
   `resolvePerson(id, signal)`；允许同步或异步返回，也允许返回 `undefined`
   表示不可解析。resolver 必须把 `AbortSignal` 传给自身的 fetch/SDK 请求，并在
   `signal.aborted` 或 `abort` 事件发生后尽快停止工作。

没有公共的鉴权、网络请求、上传、人员目录、消息发送或真实回调 API。

## 资源与动作

`img_key` 不是 URL，人员 ID 也不是显示名。只通过宿主 resolver 解析。
resolver 返回同样按不可信资源处理；失败、缺失和卸载会得到稳定占位，同一卡片按
resolver 身份与 key 缓存解析结果。宿主切换 resolver（例如租户/session 变化）时，
渲染器会隔离新缓存并 abort 旧 resolver 的未完成请求。`CardAction` 是可序列化的本地动作，不包含租户、操作者、消息、
token 等飞书平台上下文。`open_url` 已通过协议白名单，但最终导航仍由宿主决定。

```tsx
<CardRenderer
  card={payload}
  resolveImage={async (imgKey, signal) => {
    const response = await fetch(`/card-images/${imgKey}`, { signal });
    return response.ok ? response.url : undefined;
  }}
  resolvePerson={async (id, signal) => {
    return directoryClient.lookup(id, { signal });
  }}
/>
```

## SSR 与构建

SSR 可安全输出卡片结构；图表只输出稳定占位，浏览器挂载后才懒加载独立 VChart
chunk。宿主 CSP 应继续禁止非预期脚本来源。不要全局覆盖 `.fcr-*` 内部样式。

## 1.0 限制

- 仅支持 JSON 2.0；不读取 1.0 根级 `elements` 或 `i18n_elements`。
- 不模拟 7.20 以前客户端，不支持搭建工具专用循环容器。
- Web 视觉目标是协议一致，不承诺复制某个飞书客户端版本的私有设计 token。
- 官方没有形式化 200 元素和五层容器的完整计数算法；实现采用 README 所述保守规则。
- 官方对 `form` 内 `chart` 的文档存在冲突；1.0 保守拒绝并产生 recoverable 诊断。
- VChart 兼容范围是飞书文档列出的基线，不等同于 npm 最新 VChart 的全部 spec；
  不复制飞书未公开的默认 media 规则，也不支持其列出的移动端受限图形能力。
- 资源失败 UI、未知字段降级和 fatal/recoverable 分类是本仓库契约，不代表飞书
  客户端的逐像素行为。

## 从 JSON 1.0 或早期占位版迁移

1. 把正文从根级 `elements` 移到 `body.elements`，添加 `"schema": "2.0"`。
2. 删除 `tag: "action"` 容器，把交互组件直接放入 `elements`。
3. 把旧回调/跳转转换为 2.0 `behaviors`；通过 `onAction` 接收标准化动作。
4. 不再把 `img_key` 当 URL，也不从人员 ID 猜姓名；改为注入 resolver。
5. 显式引入 `styles.css`，按 discriminated `CardAction.type` 处理动作。
6. 上线前运行 `validateCard`；版本边界和安全校验不可关闭，不要通过放宽校验迁移旧输入。
