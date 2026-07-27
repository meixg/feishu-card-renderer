export const PLAYGROUND_INPUT_LIMIT = 200_000;

export const playgroundExample = {
  schema: "2.0",
  config: {
    update_multi: true,
    width_mode: "fill",
  },
  header: {
    title: {
      tag: "plain_text",
      content: "Playground 预览",
    },
    subtitle: {
      tag: "lark_md",
      content: "编辑左侧 **JSON**，右侧会立即更新",
    },
    template: "blue",
  },
  body: {
    elements: [
      {
        tag: "markdown",
        content: "### 飞书卡片 JSON 2.0\n\n- 安全解析\n- 实时诊断\n- Light / Dark 与 PC / Mobile 预览",
      },
      {
        tag: "button",
        text: {
          tag: "plain_text",
          content: "测试 callback",
        },
        behaviors: [
          {
            type: "callback",
            value: {
              source: "playground",
            },
          },
        ],
      },
    ],
  },
} as const;

export const playgroundExampleJson = JSON.stringify(playgroundExample, null, 2);

export type PlaygroundParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

function lineAndColumn(source: string, position: number): string {
  const before = source.slice(0, position);
  const lines = before.split("\n");
  return `第 ${lines.length} 行，第 ${lines.at(-1)!.length + 1} 列`;
}

export function parsePlaygroundJson(source: string): PlaygroundParseResult {
  if (source.length > PLAYGROUND_INPUT_LIMIT) {
    return {
      ok: false,
      error: `JSON 超过 ${PLAYGROUND_INPUT_LIMIT.toLocaleString("en-US")} 字符上限`,
    };
  }
  if (!source.trim()) {
    return { ok: false, error: "请输入飞书卡片 JSON 2.0" };
  }

  try {
    return { ok: true, value: JSON.parse(source) as unknown };
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : "";
    const position = /position\s+(\d+)/i.exec(message)?.[1];
    const location = position === undefined
      ? "请检查括号、逗号和字符串引号"
      : lineAndColumn(source, Number(position));
    return { ok: false, error: `JSON 语法错误（${location}）` };
  }
}
