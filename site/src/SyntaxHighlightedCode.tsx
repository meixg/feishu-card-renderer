import { tsxLanguage } from "@codemirror/lang-javascript";
import { jsonLanguage } from "@codemirror/lang-json";
import { classHighlighter, highlightTree } from "@lezer/highlight";
import type { ReactNode } from "react";

export type SyntaxLanguage = "json" | "plain" | "tsx";

const LANGUAGES = {
  json: jsonLanguage,
  tsx: tsxLanguage,
} as const;

function highlightedNodes(code: string, language: Exclude<SyntaxLanguage, "plain">) {
  const nodes: ReactNode[] = [];
  let position = 0;
  highlightTree(
    LANGUAGES[language].parser.parse(code),
    classHighlighter,
    (from, to, classes) => {
      if (from > position) nodes.push(code.slice(position, from));
      nodes.push(<span className={classes} key={`${from}:${to}`}>
        {code.slice(from, to)}
      </span>);
      position = to;
    },
  );
  if (position < code.length) nodes.push(code.slice(position));
  return nodes;
}

export function SyntaxHighlightedCode({
  code,
  language,
}: {
  code: string;
  language: SyntaxLanguage;
}) {
  return <code className={`syntax-code language-${language}`}>
    {language === "plain" ? code : highlightedNodes(code, language)}
  </code>;
}
