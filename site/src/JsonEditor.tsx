import { useRef, type UIEvent } from "react";

import { SyntaxHighlightedCode } from "./SyntaxHighlightedCode";

export function JsonEditor({
  describedBy,
  invalid,
  onChange,
  value,
}: {
  describedBy: string;
  invalid: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const highlightRef = useRef<HTMLPreElement>(null);

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (!highlightRef.current) return;
    highlightRef.current.scrollTop = event.currentTarget.scrollTop;
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
  };

  return <div className="playground-editor-layers">
    <pre aria-hidden="true" className="playground-editor-highlight"
      ref={highlightRef}>
      <SyntaxHighlightedCode code={value.endsWith("\n") ? `${value} ` : value}
        language="json" />
    </pre>
    <textarea
      aria-describedby={describedBy}
      aria-invalid={invalid}
      aria-label="飞书卡片 JSON 2.0"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onScroll={syncScroll}
      spellCheck={false}
    />
  </div>;
}
