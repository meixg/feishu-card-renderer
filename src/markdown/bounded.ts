import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";

import type { CardDiagnostic, ProtocolPath } from "../schema/diagnostics";
import { safeUrl } from "../styles/safe";
import { decorateTaskListItems } from "./task-list";

export const MARKDOWN_LIMITS = {
  characters: 20_000,
  depth: 12,
  nodes: 1_000,
  complexNodes: 200,
} as const;

export type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  lang?: string | null;
  checked?: boolean | null;
  children?: MarkdownNode[];
};

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
      extensions: [gfmStrikethrough()],
      mdastExtensions: [gfmStrikethroughFromMarkdown()],
    }) as MarkdownNode;
    decorateTaskListItems(tree);
    let nodes = 0;
    let complexNodes = 0;
    let structurallyLimited = false;
    let sawMarkup = false;
    let sawImage = false;
    let sawUnsafeUrl = false;
    const pending: Array<{ node: MarkdownNode; depth: number }> = [
      { node: tree, depth: 0 },
    ];
    while (pending.length > 0) {
      const current = pending.pop();
      if (!current) break;
      nodes += 1;
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
        pending.push({ node: child, depth: current.depth + 1 });
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
