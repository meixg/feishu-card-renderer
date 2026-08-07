import { json } from "@codemirror/lang-json";
import { syntaxHighlighting } from "@codemirror/language";
import { Compartment } from "@codemirror/state";
import { EditorView, minimalSetup } from "codemirror";
import { classHighlighter } from "@lezer/highlight";
import { useEffect, useRef } from "react";

function editorAttributes(describedBy: string, invalid: boolean) {
  return EditorView.contentAttributes.of({
    "aria-describedby": describedBy,
    "aria-invalid": String(invalid),
    "aria-label": "飞书卡片 JSON 2.0",
    spellcheck: "false",
  });
}

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
  const attributesRef = useRef(new Compartment());
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const initialAttributesRef = useRef({ describedBy, invalid });
  const initialValueRef = useRef(value);
  const viewRef = useRef<EditorView>(null);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const initialAttributes = initialAttributesRef.current;
    const view = new EditorView({
      doc: initialValueRef.current,
      parent: hostRef.current,
      extensions: [
        minimalSetup,
        json(),
        syntaxHighlighting(classHighlighter),
        attributesRef.current.of(editorAttributes(
          initialAttributes.describedBy,
          initialAttributes.invalid,
        )),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });
    viewRef.current = view;
    return () => {
      if (viewRef.current === view) viewRef.current = null;
      view.destroy();
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: attributesRef.current.reconfigure(
        editorAttributes(describedBy, invalid),
      ),
    });
  }, [describedBy, invalid]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div className="playground-code-editor" ref={hostRef} />;
}
