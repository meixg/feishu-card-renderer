import { Fragment } from "react";

import type { TextElement } from "../../schema/components";
import { safeUrl } from "../../styles/safe";

const TOKEN = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^) \n]+\))/g;

function RichText({ content }: { content: string }): React.JSX.Element {
  const parts = content.split(TOKEN);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={index}>{part.slice(1, -1)}</code>;
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
          const href = safeUrl(link[2]);
          return href
            ? <a key={index} href={href} target="_blank"
                rel="noopener noreferrer">{link[1]}</a>
            : <Fragment key={index}>{link[1]}</Fragment>;
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

export function SafeText({ text }: { text: TextElement }): React.JSX.Element {
  if (text.tag === "plain_text") return <>{text.content}</>;
  return <RichText content={text.content} />;
}

export function SafeMarkdown({ content }: { content: string }): React.JSX.Element {
  const lines = content.split(/\r?\n/);
  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 && <br />}
          <RichText content={line.replace(/^#{1,6}\s+/, "")} />
        </Fragment>
      ))}
    </>
  );
}
