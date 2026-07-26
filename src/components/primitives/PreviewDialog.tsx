import { useEffect, useId, useRef, useState } from "react";

export type PreviewItem = {
  label: string;
  content: React.ReactNode;
  thumbnail?: React.ReactNode;
};

export function PreviewDialog({
  items,
  initialIndex = 0,
  label,
  children,
}: {
  items: readonly PreviewItem[];
  initialIndex?: number;
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const triggerElement = trigger.current;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft" && items.length > 1) {
        setIndex((value) => (value + items.length - 1) % items.length);
      }
      if (event.key === "ArrowRight" && items.length > 1) {
        setIndex((value) => (value + 1) % items.length);
      }
      if (event.key === "Tab") {
        const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>(
          "button,[href],[tabindex]:not([tabindex='-1'])",
        ) ?? [])].filter((item) => !item.hasAttribute("disabled"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1)!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (previous?.isConnected ? previous : triggerElement)?.focus();
    };
  }, [items.length, open]);

  const current = items[index];
  return (
    <>
      <button ref={trigger} type="button" className="fcr-preview-trigger"
        aria-label={label} onClick={() => { setIndex(initialIndex); setOpen(true); }}>
        {children}
      </button>
      {open && current && (
        <div className="fcr-preview-backdrop" role="presentation">
          <div ref={dialog} className="fcr-preview-dialog" role="dialog"
            aria-modal="true" aria-labelledby={titleId}>
            <div className="fcr-preview-toolbar">
              <span id={titleId}>{current.label}</span>
              {items.length > 1 && <span aria-live="polite">{index + 1} / {items.length}</span>}
              <button type="button" onClick={close} aria-label="关闭预览">×</button>
            </div>
            <div className="fcr-preview-result">{current.content}</div>
            {items.length > 1 && (
              <>
                <div className="fcr-preview-nav">
                  <button type="button" onClick={() =>
                    setIndex((index + items.length - 1) % items.length)}>上一张</button>
                  <button type="button" onClick={() =>
                    setIndex((index + 1) % items.length)}>下一张</button>
                </div>
                <div className="fcr-preview-thumbnails" aria-label="缩略图导航">
                  {items.map((item, itemIndex) => (
                    <button type="button" key={itemIndex}
                      aria-label={`查看第 ${itemIndex + 1} 张`}
                      aria-current={itemIndex === index}
                      onClick={() => setIndex(itemIndex)}>
                      {item.thumbnail ?? itemIndex + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
