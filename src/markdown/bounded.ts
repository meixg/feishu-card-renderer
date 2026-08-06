import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmTable } from "micromark-extension-gfm-table";

import type { CardDiagnostic, ProtocolPath } from "../schema/diagnostics";
import { safeUrl } from "../styles/safe";
import { decorateTaskListItems } from "./task-list";

export const MARKDOWN_LIMITS = {
  characters: 20_000,
  depth: 12,
  nodes: 1_000,
  complexNodes: 200,
  tableRows: 50,
  tableColumns: 12,
  tableNodes: 600,
} as const;

export type MarkdownNode = {
  type: string;
  value?: string;
  color?: string;
  url?: string;
  alt?: string | null;
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  lang?: string | null;
  checked?: boolean | null;
  align?: Array<"left" | "right" | "center" | null>;
  children?: MarkdownNode[];
};

const FONT_COLORS = new Set([
  "blue",
  "wathet",
  "turquoise",
  "green",
  "yellow",
  "orange",
  "red",
  "carmine",
  "violet",
  "purple",
  "indigo",
  "grey",
  "white",
]);

function fontColorOpening(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = /^<font\s+color\s*=\s*(?:"([a-z]+)"|'([a-z]+)')\s*>$/i
    .exec(value);
  const color = (match?.[1] ?? match?.[2])?.toLowerCase();
  return color && FONT_COLORS.has(color) ? color : undefined;
}

function isFontColorClosing(value: string | undefined): boolean {
  return typeof value === "string" && /^<\/font\s*>$/i.test(value);
}

function isFontOpeningMarkup(value: string | undefined): boolean {
  return typeof value === "string" && /^<font\b[^>]*>$/i.test(value);
}

function transformFontColorExtensions(node: MarkdownNode): void {
  if (!node.children) return;
  const source = node.children;
  const transformed: MarkdownNode[] = [];
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const color = current.type === "html"
      ? fontColorOpening(current.value)
      : undefined;
    if (!color) {
      transformFontColorExtensions(current);
      transformed.push(current);
      continue;
    }

    let nesting = 1;
    let closingIndex = index + 1;
    for (; closingIndex < source.length; closingIndex += 1) {
      const candidate = source[closingIndex];
      if (candidate.type !== "html") continue;
      if (isFontOpeningMarkup(candidate.value)) nesting += 1;
      else if (isFontColorClosing(candidate.value)) nesting -= 1;
      if (nesting === 0) break;
    }
    if (nesting !== 0) {
      transformed.push(current);
      continue;
    }

    const extension: MarkdownNode = {
      type: "fontColor",
      color,
      children: source.slice(index + 1, closingIndex),
    };
    transformFontColorExtensions(extension);
    transformed.push(extension);
    index = closingIndex;
  }
  node.children = transformed;
}

function transformSoftBreaks(node: MarkdownNode): void {
  if (!node.children) return;
  const transformed: MarkdownNode[] = [];
  for (const child of node.children) {
    if (child.type !== "text" || !child.value?.includes("\n")) {
      transformSoftBreaks(child);
      transformed.push(child);
      continue;
    }

    const lines = child.value.split("\n");
    lines.forEach((line, index) => {
      if (line) transformed.push({ type: "text", value: line });
      if (index < lines.length - 1) transformed.push({ type: "break" });
    });
  }
  node.children = transformed;
}

export type MarkdownAnalysis = {
  tree: MarkdownNode;
  diagnostics: readonly CardDiagnostic[];
  limited: boolean;
  parseFailed: boolean;
  fallback: string;
};

function warning(
  code: CardDiagnostic["code"],
  path: ProtocolPath,
  message: string,
): CardDiagnostic {
  return {
    code,
    path,
    classification: "recoverable",
    severity: "warning",
    message,
  };
}

export function analyzeMarkdown(
  content: string,
  path: ProtocolPath,
): MarkdownAnalysis {
  const diagnostics: CardDiagnostic[] = [];
  const prefix = content.slice(0, MARKDOWN_LIMITS.characters);
  let characterLimited = prefix.length !== content.length;
  try {
    const tree = fromMarkdown(prefix, {
      extensions: [gfmStrikethrough(), gfmTable()],
      mdastExtensions: [
        gfmStrikethroughFromMarkdown(),
        gfmTableFromMarkdown(),
      ],
    }) as MarkdownNode;
    transformFontColorExtensions(tree);
    transformSoftBreaks(tree);
    decorateTaskListItems(tree);
    let nodes = 0;
    let complexNodes = 0;
    let structurallyLimited = false;
    let sawMarkup = false;
    let sawImage = false;
    let sawUnsafeUrl = false;
    let tableNodes = 0;
    const pending: Array<{
      node: MarkdownNode;
      depth: number;
      inTable: boolean;
    }> = [
      { node: tree, depth: 0, inTable: false },
    ];
    while (pending.length > 0) {
      const current = pending.pop();
      if (!current) break;
      nodes += 1;
      const inTable = current.inTable || current.node.type === "table";
      if (inTable && [
        "table",
        "tableRow",
        "tableCell",
      ].includes(current.node.type)) {
        tableNodes += 1;
        if (tableNodes > MARKDOWN_LIMITS.tableNodes) structurallyLimited = true;
      }
      if (current.node.type === "table") {
        const rows = current.node.children ?? [];
        const columns = rows[0]?.children?.length ?? 0;
        if (rows.length - 1 > MARKDOWN_LIMITS.tableRows ||
          columns > MARKDOWN_LIMITS.tableColumns) structurallyLimited = true;
      }
      if (current.depth > MARKDOWN_LIMITS.depth ||
        nodes > MARKDOWN_LIMITS.nodes) structurallyLimited = true;
      if (["link", "image", "listItem"].includes(current.node.type)) {
        complexNodes += 1;
        if (complexNodes > MARKDOWN_LIMITS.complexNodes) structurallyLimited = true;
      }
      if (current.node.type === "html") sawMarkup = true;
      if (current.node.type === "image") sawImage = true;
      if (current.node.type === "link" && !safeUrl(current.node.url)) {
        sawUnsafeUrl = true;
      }
      for (const child of current.node.children ?? []) {
        pending.push({
          node: child,
          depth: current.depth + 1,
          inTable,
        });
      }
    }
    const limited = characterLimited || structurallyLimited;
    if (limited) diagnostics.push(warning(
      "markdown_limit_exceeded",
      path,
      "Markdown exceeded a rendering bound and was truncated.",
    ));
    if (sawMarkup) diagnostics.push(warning(
      "markdown_unsupported_markup",
      path,
      "Raw HTML or an unsupported extension is shown as source text.",
    ));
    if (sawImage) diagnostics.push(warning(
      "markdown_image_blocked",
      path,
      "Markdown image loading is blocked; alt text is shown.",
    ));
    if (sawUnsafeUrl) diagnostics.push(warning(
      "unsafe_url",
      path,
      "A Markdown link used a disallowed URL protocol.",
    ));
    return {
      tree,
      diagnostics,
      limited,
      parseFailed: false,
      fallback: prefix,
    };
  } catch {
    characterLimited = characterLimited || content.length > prefix.length;
    diagnostics.push(warning(
      "markdown_parse_failed",
      path,
      "Markdown parsing failed; safe source text is shown.",
    ));
    if (characterLimited) diagnostics.push(warning(
      "markdown_limit_exceeded",
      path,
      "Markdown exceeded a rendering bound and was truncated.",
    ));
    return {
      tree: { type: "root", children: [] },
      diagnostics,
      limited: characterLimited,
      parseFailed: true,
      fallback: prefix,
    };
  }
}

export function collectMarkdownAnalyses(
  card: unknown,
): ReadonlyMap<string, MarkdownAnalysis> {
  const analyses = new Map<string, MarkdownAnalysis>();
  const visit = (value: unknown, path: string): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    const record = value as Record<string, unknown>;
    if (record.tag === "markdown" && typeof record.content === "string") {
      const contentPath = `${path}.content` as ProtocolPath;
      analyses.set(path, analyzeMarkdown(record.content, contentPath));
      return;
    }
    for (const [key, child] of Object.entries(record)) {
      visit(child, `${path}.${key}`);
    }
  };
  visit(card, "$");
  return analyses;
}
