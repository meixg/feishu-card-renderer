import { tokenizeCode, type SyntaxLanguage } from "./syntax-tokenizer";

export function SyntaxHighlightedCode({
  code,
  language,
}: {
  code: string;
  language: SyntaxLanguage;
}) {
  return <code className={`syntax-code language-${language}`}>
    {tokenizeCode(code, language).map((token, index) => token.kind
      ? <span className={`syntax-${token.kind}`} data-syntax-token={token.kind}
          key={`${index}:${token.kind}`}>{token.value}</span>
      : token.value)}
  </code>;
}
