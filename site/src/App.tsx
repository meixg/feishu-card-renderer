import { useMemo, useState } from "react";

import type { CardAction, Person } from "../../src/types";
import { CardRenderer } from "../../src/renderer/CardRenderer";
import coverImage from "../../tests/visual/card-renderer.visual.spec.ts-snapshots/card-renderer-default-chromium-darwin.png";
import darkImage from "../../tests/visual/card-renderer.visual.spec.ts-snapshots/card-renderer-dark-chromium-darwin.png";
import mobileImage from "../../tests/visual/card-renderer.visual.spec.ts-snapshots/card-renderer-mobile-chromium-darwin.png";
import { catalog, categories, type CatalogItem } from "./catalog";

type Theme = "light" | "dark";
type Device = "pc" | "mobile";

const installCode = `pnpm add @meixg/feishu-card-renderer react react-dom`;
const quickStartCode = `import { CardRenderer } from "@meixg/feishu-card-renderer";
import "@meixg/feishu-card-renderer/styles.css";

export function CardHost({ payload }: { payload: unknown }) {
  return (
    <CardRenderer
      card={payload}
      locale="zh_cn"
      colorScheme="light"
      device="pc"
      onAction={(action) => {
        // 交给宿主处理 callback 或安全跳转
        console.log(action);
      }}
    />
  );
}`;
const resolverCode = `<CardRenderer
  card={payload}
  resolveImage={async (imgKey, signal) => {
    const response = await fetch(\`/card-images/\${imgKey}\`, { signal });
    return response.ok ? response.url : undefined;
  }}
  resolvePerson={(id, signal) => directory.lookup(id, { signal })}
  onDiagnostic={(items) => {
    // 仅记录 code/path，不记录完整输入或 callback value
    items.forEach(({ code, path }) => console.warn(code, path));
  }}
/>;
`;

const imageMap: Record<string, string> = {
  "renderer-cover": coverImage,
  "renderer-dark": darkImage,
  "renderer-mobile": mobileImage,
};

const people: Record<string, Person> = {
  ou_demo_ada: { id: "ou_demo_ada", name: "Ada · 演示用户", avatarUrl: coverImage },
  ou_demo_lin: { id: "ou_demo_lin", name: "Lin · 演示用户", avatarUrl: darkImage },
  ou_demo_kai: { id: "ou_demo_kai", name: "Kai · 演示用户", avatarUrl: mobileImage },
};

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span>{label}</span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: T;
  values: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" aria-label={label}>
      {values.map((item) => (
        <button
          type="button"
          key={item.value}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ComponentDemo({
  item,
  theme,
  device,
}: {
  item: CatalogItem;
  theme: Theme;
  device: Device;
}) {
  const [action, setAction] = useState<CardAction | null>(null);
  const [diagnosticCount, setDiagnosticCount] = useState(0);
  const json = JSON.stringify(item.card, null, 2);

  return (
    <article className="catalog-card" id={item.id}>
      <div className="catalog-heading">
        <div>
          <span className="eyebrow">{item.category}</span>
          <h3>{item.title} <code>{item.tag}</code></h3>
          <p>{item.summary}</p>
        </div>
        <a href={`#${item.id}`} aria-label={`链接到 ${item.title}`}>#</a>
      </div>
      <ul className="note-list">
        {item.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
      <div className={`render-stage render-stage-${device}`}>
        <div className="render-stage-label">
          <span>实时渲染</span>
          <span>{device === "pc" ? "PC" : "Mobile"} · {theme === "light" ? "Light" : "Dark"}</span>
        </div>
        <CardRenderer
          card={item.card}
          colorScheme={theme}
          device={device}
          resolveImage={(key) => imageMap[key]}
          resolvePerson={(id) => people[id]}
          onAction={setAction}
          onDiagnostic={(items) => setDiagnosticCount(items.length)}
        />
      </div>
      <div className="demo-meta">
        <div>
          <span>Action 日志</span>
          <pre aria-live="polite">{action ? JSON.stringify(action, null, 2) : "尚未触发"}</pre>
        </div>
        <div>
          <span>诊断</span>
          <strong className={diagnosticCount ? "status-warning" : "status-ok"}>
            {diagnosticCount ? `${diagnosticCount} 条` : "无诊断"}
          </strong>
        </div>
      </div>
      <details className="json-details">
        <summary>查看完整 JSON</summary>
        <CodeBlock code={json} label={`${item.tag}.json`} />
      </details>
    </article>
  );
}

function ApiTable() {
  const rows = [
    ["card", "unknown", "不可信的卡片 JSON 输入；必须显式声明 schema: \"2.0\""],
    ["locale", "string", "国际化 locale，默认 zh_cn"],
    ["colorScheme", "\"light\" | \"dark\"", "渲染主题"],
    ["device", "\"pc\" | \"mobile\"", "设备语义与响应式字段选择"],
    ["resolveImage", "ResourceResolver<string>", "把 img_key 解析为图片地址"],
    ["resolvePerson", "ResourceResolver<Person>", "把人员 ID 解析为宿主人员信息"],
    ["onAction", "(action: CardAction) => void", "接收 callback 与 open_url 标准化动作"],
    ["onDiagnostic", "(items) => void", "接收 fatal/recoverable 诊断"],
    ["fallback", "ReactNode | function", "fatal 输入的宿主降级视图"],
  ];
  return (
    <div className="api-table-wrap">
      <table className="api-table">
        <thead><tr><th>属性</th><th>类型</th><th>作用</th></tr></thead>
        <tbody>
          {rows.map(([name, type, description]) => (
            <tr key={name}>
              <td><code>{name}</code></td>
              <td><code>{type}</code></td>
              <td>{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cardForSearch(item: CatalogItem, query: string) {
  const haystack = `${item.tag} ${item.title} ${item.summary} ${item.category}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [device, setDevice] = useState<Device>("pc");
  const [query, setQuery] = useState("");
  const visibleCatalog = useMemo(
    () => catalog.filter((item) => cardForSearch(item, query)),
    [query],
  );
  const grouped = useMemo(
    () => categories.map((category) => ({
      category,
      items: visibleCatalog.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0),
    [visibleCatalog],
  );

  return (
    <div className={`site-shell site-theme-${theme}`}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回顶部">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>Feishu Card Renderer</span>
        </a>
        <nav aria-label="主要导航">
          <a href="#guide">使用方式</a>
          <a href="#components">组件</a>
          <a href="https://github.com/meixg/feishu-card-renderer">GitHub</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker">React · JSON 2.0 · Web Renderer</span>
            <h1>让飞书卡片在<br />你的 Web 应用里可靠呈现。</h1>
            <p>
              一个宿主无关、可诊断、可交互的飞书卡片 JSON 2.0 渲染器。
              本页直接运行项目源码，并逐项展示全部 26 个运行时 tag 与顶层 header。
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="#guide">快速开始</a>
              <a className="button-secondary" href="#components">浏览 27 项组件</a>
            </div>
            <div className="hero-badges" aria-label="项目能力">
              <span>严格 JSON 2.0</span>
              <span>Light / Dark</span>
              <span>PC / Mobile</span>
              <span>键盘可用</span>
            </div>
          </div>
          <div className="hero-demo">
            <span className="window-label">LIVE PREVIEW</span>
            <CardRenderer
              colorScheme={theme}
              device={device}
              resolvePerson={(id) => people[id]}
              card={{
                schema: "2.0",
                config: { update_multi: true, width_mode: "fill" },
                header: {
                  title: { tag: "plain_text", content: "Renderer 已就绪" },
                  subtitle: { tag: "lark_md", content: "全部 **27 项**展示已连接" },
                },
                body: {
                  elements: [
                    { tag: "div", text: { tag: "lark_md", content: "协议校验、安全渲染与本地交互，在同一个 React 边界内完成。" } },
                    { tag: "person_list", persons: [{ id: "ou_demo_ada" }, { id: "ou_demo_lin" }], show_avatar: true, show_name: true },
                    { tag: "button", text: { tag: "plain_text", content: "查看组件目录" }, disabled: true },
                  ],
                },
              }}
            />
          </div>
        </section>

        <section className="metrics" aria-label="项目概览">
          <div><strong>2.0</strong><span>唯一协议边界</span></div>
          <div><strong>26</strong><span>运行时 tags</span></div>
          <div><strong>200</strong><span>单卡元素上限</span></div>
          <div><strong>5</strong><span>容器嵌套上限</span></div>
        </section>

        <section className="docs-section" id="guide">
          <div className="section-intro">
            <span className="eyebrow">使用方式</span>
            <h2>从一张未知 JSON 到可控的 React 视图</h2>
            <p>
              渲染器只负责视图、本地交互和标准化事件。鉴权、消息发送、真实回调、
              图片上传与人员目录由宿主应用负责。
            </p>
          </div>
          <div className="guide-grid">
            <div className="guide-copy">
              <span className="step-number">01</span>
              <h3>安装与样式</h3>
              <p>包发布 ESM、TypeScript 声明和带作用域的预编译 CSS；宿主无需配置 Tailwind。</p>
            </div>
            <div>
              <CodeBlock code={installCode} label="Terminal" />
              <CodeBlock code={quickStartCode} label="CardHost.tsx" />
            </div>
          </div>
          <div className="guide-grid">
            <div className="guide-copy">
              <span className="step-number">02</span>
              <h3>接入资源与诊断</h3>
              <p>
                <code>img_key</code> 和人员 ID 不是可直接显示的 URL 或姓名。
                resolver 支持同步或异步结果，并接收 AbortSignal。
              </p>
            </div>
            <CodeBlock code={resolverCode} label="Adapters.tsx" />
          </div>
          <div className="guide-grid guide-grid-wide">
            <div className="guide-copy">
              <span className="step-number">03</span>
              <h3>公共渲染契约</h3>
              <p>
                recoverable 问题产生诊断并继续稳定渲染；版本等 fatal 问题进入 fallback。
                所有业务动作通过 <code>onAction</code> 交还宿主。
              </p>
            </div>
            <ApiTable />
          </div>
          <div className="boundary-grid">
            <article>
              <span>Validation</span>
              <h3>先解释，再渲染</h3>
              <p>输入不会被修改。normalization 纯函数集中默认值，未知 tag 使用稳定占位。</p>
            </article>
            <article>
              <span>Interaction</span>
              <h3>只输出标准动作</h3>
              <p>callback、open_url、表单值与时区通过 CardAction 输出，不直接调用业务 API。</p>
            </article>
            <article>
              <span>Security</span>
              <h3>协议输入不可信</h3>
              <p>Markdown、URL、RGBA、尺寸、图片地址和图表定义都经过明确边界处理。</p>
            </article>
            <article>
              <span>SSR</span>
              <h3>结构可安全输出</h3>
              <p>图表在浏览器挂载后懒加载；宿主仍应使用严格 CSP 并处理资源权限。</p>
            </article>
          </div>
        </section>

        <section className="component-section" id="components">
          <div className="section-intro">
            <span className="eyebrow">组件目录</span>
            <h2>27 项能力，逐个真实渲染</h2>
            <p>
              顶层 header 加上注册表中的 26 个运行时 tag。容器示例遵守合法嵌套，
              交互结果只写入本页 action 日志。
            </p>
          </div>
          <div className="catalog-controls">
            <label>
              <span className="sr-only">搜索组件</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索 tag、名称或类别…"
              />
            </label>
            <Segmented
              label="渲染主题"
              value={theme}
              values={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              onChange={setTheme}
            />
            <Segmented
              label="设备模式"
              value={device}
              values={[
                { value: "pc", label: "PC" },
                { value: "mobile", label: "Mobile" },
              ]}
              onChange={setDevice}
            />
          </div>
          <div className="catalog-layout">
            <aside className="catalog-nav">
              <div>
                <strong>组件索引</strong>
                <span>{visibleCatalog.length} / {catalog.length}</span>
              </div>
              {grouped.map((group) => (
                <section key={group.category}>
                  <h3>{group.category}</h3>
                  {group.items.map((item) => (
                    <a key={item.id} href={`#${item.id}`}>
                      <code>{item.tag}</code>
                      <span>{item.title}</span>
                    </a>
                  ))}
                </section>
              ))}
            </aside>
            <div className="catalog-list">
              {visibleCatalog.length ? visibleCatalog.map((item) => (
                <ComponentDemo
                  key={item.id}
                  item={item}
                  theme={theme}
                  device={device}
                />
              )) : (
                <div className="empty-state">没有匹配的组件。试试 tag 或中文名称。</div>
              )}
            </div>
          </div>
        </section>

        <section className="limitations">
          <span className="eyebrow">兼容性与限制</span>
          <h2>协议一致，不假装复制某个客户端版本。</h2>
          <div>
            <p>
              项目只支持 JSON 2.0，不提供 1.0 兼容层，也不模拟飞书鉴权、消息发送、
              图片上传、人员目录或真实业务回调。
            </p>
            <p>
              VChart 兼容范围、尚未消费的视觉字段和保守校验策略以仓库兼容矩阵为准。
              视觉目标是稳定、可访问且协议一致。
            </p>
          </div>
          <div className="limitations-actions">
            <a href="https://github.com/meixg/feishu-card-renderer/blob/main/docs/integration.md">完整集成指南</a>
            <a href="https://github.com/meixg/feishu-card-renderer/blob/main/docs/compatibility-matrix.md">1.0 兼容矩阵</a>
            <a href="https://open.larkoffice.com/document/feishu-cards/card-json-v2-components/component-json-v2-overview">飞书官方组件文档</a>
          </div>
        </section>
      </main>

      <footer>
        <span>Feishu Card Renderer</span>
        <span>JSON 2.0 · React · GitHub Pages</span>
      </footer>
    </div>
  );
}
