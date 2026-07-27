import { Fragment, type ReactNode } from "react";

import type { MarkdownAnalysis, MarkdownNode } from "../../markdown/bounded";
import { MARKDOWN_LIMITS } from "../../markdown/bounded";
import { safeUrl } from "../../styles/safe";

type Budget = { nodes: number; complexNodes: number };

function sourceText(node: MarkdownNode): string {
  if (node.type === "image") return node.alt || "图片";
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(sourceText).join("");
}

function children(
  node: MarkdownNode,
  budget: Budget,
  depth: number,
): ReactNode {
  return node.children?.map((child, index) => (
    <Fragment key={index}>{renderNode(child, budget, depth + 1)}</Fragment>
  ));
}

function renderNode(
  node: MarkdownNode,
  budget: Budget,
  depth: number,
): ReactNode {
  budget.nodes += 1;
  if (depth > MARKDOWN_LIMITS.depth || budget.nodes > MARKDOWN_LIMITS.nodes) {
    return null;
  }
  if (["link", "image", "listItem"].includes(node.type)) {
    budget.complexNodes += 1;
    if (budget.complexNodes > MARKDOWN_LIMITS.complexNodes) return null;
  }
  switch (node.type) {
    case "root": return children(node, budget, depth);
    case "text": return node.value;
    case "paragraph": return <p>{children(node, budget, depth)}</p>;
    case "heading": {
      const level = Math.min(6, Math.max(1, node.depth ?? 1));
      if (level === 1) return <h1>{children(node, budget, depth)}</h1>;
      if (level === 2) return <h2>{children(node, budget, depth)}</h2>;
      if (level === 3) return <h3>{children(node, budget, depth)}</h3>;
      if (level === 4) return <h4>{children(node, budget, depth)}</h4>;
      if (level === 5) return <h5>{children(node, budget, depth)}</h5>;
      return <h6>{children(node, budget, depth)}</h6>;
    }
    case "emphasis": return <em>{children(node, budget, depth)}</em>;
    case "strong": return <strong>{children(node, budget, depth)}</strong>;
    case "delete": return <del>{children(node, budget, depth)}</del>;
    case "inlineCode": return <code>{node.value}</code>;
    case "break": return <br />;
    case "thematicBreak": return <hr />;
    case "blockquote": return <blockquote>{children(node, budget, depth)}</blockquote>;
    case "list": {
      const content = children(node, budget, depth);
      return node.ordered
        ? <ol start={node.start ?? undefined}>{content}</ol>
        : <ul>{content}</ul>;
    }
    case "listItem": return <li>{children(node, budget, depth)}</li>;
    case "link": {
      const href = safeUrl(node.url);
      return href
        ? <a href={href} target="_blank" rel="noopener noreferrer">
            {children(node, budget, depth)}
          </a>
        : <>{children(node, budget, depth)}</>;
    }
    case "image":
      return <span className="fcr-markdown-image-alt">{node.alt || "图片"}</span>;
    case "html":
      return node.value;
    default:
      return sourceText(node);
  }
}

export function MarkdownContent({
  analysis,
}: {
  analysis: MarkdownAnalysis;
}): React.JSX.Element {
  const content = analysis.parseFailed
    ? <p>{analysis.fallback}</p>
    : renderNode(analysis.tree, { nodes: 0, complexNodes: 0 }, 0);
  return <>
    {content}
    {analysis.limited && (
      <span className="fcr-markdown-truncated" role="note"
        aria-label="Markdown 内容已截断">
        内容已截断
      </span>
    )}
  </>;
}
