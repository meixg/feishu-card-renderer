import { useEffect, useRef } from "react";
import type { TextElement } from "../../schema/components";

export function ConfirmDialog({ title, text, onConfirm, onCancel, trigger }: {
  title?: TextElement; text?: TextElement; onConfirm: () => void;
  onCancel: () => void; trigger: React.RefObject<HTMLElement | null>;
}): React.JSX.Element {
  const dialog = useRef<HTMLDivElement>(null);
  const close = () => { onCancel(); queueMicrotask(() => trigger.current?.focus()); };
  useEffect(() => {
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab" || !dialog.current) return;
      const controls = [...dialog.current.querySelectorAll<HTMLElement>("button")];
      const index = controls.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (index - 1 + controls.length) % controls.length :
        (index + 1) % controls.length;
      event.preventDefault(); controls[next]?.focus();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });
  return <div className="fcr-confirm-backdrop">
    <div ref={dialog} role="dialog" aria-modal="true"
      aria-label={title?.content ?? "确认操作"} className="fcr-confirm-dialog">
      <strong>{title?.content ?? "确认操作"}</strong>
      <p>{text?.content ?? "是否继续？"}</p>
      <div><button type="button" onClick={close}>取消</button>
        <button type="button" onClick={() => { onConfirm(); close(); }}>确认</button></div>
    </div>
  </div>;
}
