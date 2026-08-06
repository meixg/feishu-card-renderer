export type SyntaxLanguage = "json" | "shell" | "tsx";

type TokenKind =
  | "comment"
  | "keyword"
  | "number"
  | "property"
  | "punctuation"
  | "string";

export type SyntaxToken = {
  kind?: TokenKind;
  value: string;
};

const JS_KEYWORDS = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const",
  "continue", "default", "delete", "do", "else", "export", "extends",
  "false", "finally", "for", "from", "function", "if", "import", "in",
  "instanceof", "interface", "let", "new", "null", "of", "return",
  "switch", "throw", "true", "try", "type", "typeof", "undefined", "var",
  "void", "while", "with", "yield",
]);

function nextNonWhitespace(source: string, index: number): string | undefined {
  for (let cursor = index; cursor < source.length; cursor += 1) {
    if (!/\s/.test(source[cursor] ?? "")) return source[cursor];
  }
  return undefined;
}

function tokenizeJson(source: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;
  while (index < source.length) {
    const start = index;
    const character = source[index] ?? "";
    if (character === '"') {
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") index += 2;
        else if (source[index++] === '"') break;
      }
      tokens.push({
        kind: nextNonWhitespace(source, index) === ":" ? "property" : "string",
        value: source.slice(start, index),
      });
    } else if (/[\d-]/.test(character)) {
      const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?/i
        .exec(source.slice(index));
      index += match?.[0].length ?? 1;
      tokens.push({ kind: "number", value: source.slice(start, index) });
    } else if (/[{}[\],:]/.test(character)) {
      index += 1;
      tokens.push({ kind: "punctuation", value: character });
    } else {
      const match = /^(?:true|false|null)\b/.exec(source.slice(index));
      if (match) {
        index += match[0].length;
        tokens.push({ kind: "keyword", value: match[0] });
      } else {
        index += 1;
        while (index < source.length && !/["\d{}[\],:-]/.test(source[index] ?? "")) {
          if (/^(?:true|false|null)\b/.test(source.slice(index))) break;
          index += 1;
        }
        tokens.push({ value: source.slice(start, index) });
      }
    }
  }
  return tokens;
}

function tokenizeTsx(source: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;
  while (index < source.length) {
    const start = index;
    const character = source[index] ?? "";
    const pair = source.slice(index, index + 2);
    if (pair === "//") {
      const end = source.indexOf("\n", index);
      index = end === -1 ? source.length : end;
      tokens.push({ kind: "comment", value: source.slice(start, index) });
    } else if (pair === "/*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      tokens.push({ kind: "comment", value: source.slice(start, index) });
    } else if (character === '"' || character === "'" || character === "`") {
      const quote = character;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") index += 2;
        else if (source[index++] === quote) break;
      }
      tokens.push({ kind: "string", value: source.slice(start, index) });
    } else if (/\d/.test(character)) {
      const match = /^(?:0x[\da-f]+|\d+(?:\.\d+)?)/i.exec(source.slice(index));
      index += match?.[0].length ?? 1;
      tokens.push({ kind: "number", value: source.slice(start, index) });
    } else if (/[A-Za-z_$]/.test(character)) {
      index += 1;
      while (/[\w$]/.test(source[index] ?? "")) index += 1;
      const value = source.slice(start, index);
      tokens.push({ kind: JS_KEYWORDS.has(value) ? "keyword" : undefined, value });
    } else if (/[{}[\](),.;:<>/=]/.test(character)) {
      index += 1;
      tokens.push({ kind: "punctuation", value: character });
    } else {
      index += 1;
      while (index < source.length && !/[/'"`\dA-Za-z_${}[\](),.;:<>/=]/.test(source[index] ?? "")) {
        index += 1;
      }
      tokens.push({ value: source.slice(start, index) });
    }
  }
  return tokens;
}

function tokenizeShell(source: string): SyntaxToken[] {
  return source.split(/(\s+|(?:"(?:\\.|[^"\\])*")|(?:'(?:[^']*)')|--?[\w-]+)/)
    .filter(Boolean)
    .map((value, index) => {
      if (/^\s+$/.test(value)) return { value };
      if (/^['"]/.test(value)) return { kind: "string", value };
      if (/^--?/.test(value)) return { kind: "property", value };
      return { kind: index === 0 ? "keyword" : undefined, value };
    });
}

export function tokenizeCode(source: string, language: SyntaxLanguage): SyntaxToken[] {
  if (language === "json") return tokenizeJson(source);
  if (language === "shell") return tokenizeShell(source);
  return tokenizeTsx(source);
}
