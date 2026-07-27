import type { MarkdownNode } from "./bounded";

const TASK_MARKER = /^\[([ xX])\](?:[ \t]+|$)/;

/**
 * Adds presentation-only task state to the owned Markdown tree. The parser
 * deliberately remains CommonMark-based; task markers are recognized only at
 * the start of a list item's first paragraph and the protocol source is never
 * mutated.
 */
export function decorateTaskListItems(node: MarkdownNode): void {
  if (node.type === "listItem") {
    const paragraph = node.children?.[0];
    const first = paragraph?.type === "paragraph"
      ? paragraph.children?.[0]
      : undefined;
    const value = first?.type === "text" && typeof first.value === "string"
      ? first.value
      : undefined;
    const match = value === undefined ? null : TASK_MARKER.exec(value);
    if (match) {
      node.checked = match[1]?.toLowerCase() === "x";
      first!.value = value!.slice(match[0].length);
    }
  }
  for (const child of node.children ?? []) decorateTaskListItems(child);
}
