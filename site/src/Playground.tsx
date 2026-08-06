import { useMemo, useState } from "react";

import { CardRenderer } from "../../src/renderer/CardRenderer";
import type { CardDiagnostic } from "../../src/schema/diagnostics";
import type { CardAction, Person } from "../../src/types";
import type { ResourceResolver } from "../../src/renderer/context";
import { JsonEditor } from "./JsonEditor";
import {
  parsePlaygroundJson,
  playgroundExampleJson,
} from "./playground-data";

type Theme = "light" | "dark";
type Device = "pc" | "mobile";

type PlaygroundProps = {
  theme: Theme;
  device: Device;
  resolveImage?: ResourceResolver<string>;
  resolvePerson?: ResourceResolver<Person>;
};

export function Playground({
  theme,
  device,
  resolveImage,
  resolvePerson,
}: PlaygroundProps) {
  const [source, setSource] = useState(playgroundExampleJson);
  const [diagnostics, setDiagnostics] = useState<readonly CardDiagnostic[]>([]);
  const [action, setAction] = useState<CardAction | null>(null);
  const parsed = useMemo(() => parsePlaygroundJson(source), [source]);

  const formatJson = () => {
    if (parsed.ok) setSource(JSON.stringify(parsed.value, null, 2));
  };

  return (
    <section className="playground-section" id="playground">
      <div className="section-intro">
        <span className="eyebrow">Playground</span>
        <h2>贴一张卡片 JSON，立即看到渲染结果</h2>
        <p>
          内容只在当前浏览器中解析，不会上传。Playground 仅接受 JSON 2.0，
          语法错误与协议诊断会分别显示。
        </p>
      </div>

      <div className="playground-shell">
        <div className="playground-pane playground-editor-pane">
          <div className="playground-toolbar">
            <div>
              <strong>Card JSON</strong>
              <span className={parsed.ok ? "status-ok" : "status-error"}>
                {parsed.ok ? "JSON 语法有效" : "等待修正"}
              </span>
            </div>
            <div className="playground-toolbar-actions">
              <button
                type="button"
                onClick={() => setSource(playgroundExampleJson)}
              >
                载入示例
              </button>
              <button type="button" onClick={formatJson} disabled={!parsed.ok}>
                格式化
              </button>
            </div>
          </div>
          <label className="playground-editor">
            <span className="sr-only">飞书卡片 JSON 2.0</span>
            <JsonEditor
              describedBy="playground-input-status"
              invalid={!parsed.ok}
              value={source}
              onChange={setSource}
            />
          </label>
          <div
            className={parsed.ok ? "playground-input-ok" : "playground-input-error"}
            id="playground-input-status"
            role={parsed.ok ? "status" : "alert"}
          >
            {parsed.ok
              ? `${source.length.toLocaleString("en-US")} 个字符`
              : parsed.error}
          </div>
        </div>

        <div className="playground-pane playground-preview-pane">
          <div className="playground-toolbar">
            <div>
              <strong>实时预览</strong>
              <span>{device === "pc" ? "PC" : "Mobile"} · {theme === "light" ? "Light" : "Dark"}</span>
            </div>
          </div>
          <div className={`playground-stage playground-stage-${device}`}>
            {parsed.ok ? (
              <CardRenderer
                card={parsed.value}
                colorScheme={theme}
                device={device}
                resolveImage={resolveImage}
                resolvePerson={resolvePerson}
                onAction={setAction}
                onDiagnostic={setDiagnostics}
                fallback={(items) => (
                  <div className="playground-fallback">
                    无法渲染：请根据下方 {items.length} 条协议诊断修正 JSON
                  </div>
                )}
              />
            ) : (
              <div className="playground-empty">
                <span aria-hidden="true">{`{ }`}</span>
                <strong>修正 JSON 后将在这里预览</strong>
              </div>
            )}
          </div>
          <div className="playground-output">
            <div>
              <span>协议诊断</span>
              {parsed.ok && diagnostics.length ? (
                <ul>
                  {diagnostics.slice(0, 6).map((item) => (
                    <li key={`${item.code}:${item.path}`}>
                      <code>{item.code}</code>
                      <span>{item.path}</span>
                    </li>
                  ))}
                  {diagnostics.length > 6 && (
                    <li>另有 {diagnostics.length - 6} 条诊断</li>
                  )}
                </ul>
              ) : (
                <strong className={parsed.ok ? "status-ok" : ""}>
                  {parsed.ok ? "无诊断" : "等待有效 JSON"}
                </strong>
              )}
            </div>
            <div>
              <span>Action 日志</span>
              <pre aria-live="polite">
                {action ? JSON.stringify(action, null, 2) : "尚未触发"}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
