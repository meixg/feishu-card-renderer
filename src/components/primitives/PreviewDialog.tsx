import { useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";

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

  const current = items[index];
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setIndex(initialIndex);
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger
        ref={trigger}
        render={<Button type="button" variant="ghost"
          className="fcr-preview-trigger" />}
        aria-label={label}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {children}
      </DialogTrigger>
      {current && (
        <DialogContent
          closeLabel="关闭预览"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" && items.length > 1) {
              event.preventDefault();
              setIndex((value) => Math.max(0, value - 1));
            }
            if (event.key === "ArrowRight" && items.length > 1) {
              event.preventDefault();
              setIndex((value) => Math.min(items.length - 1, value + 1));
            }
          }}
        >
          <DialogHeader className="fcr-preview-toolbar">
            <DialogTitle>{current.label}</DialogTitle>
            <DialogDescription className="fcr-sr-only">
              图片预览，可使用左右方向键切换。
            </DialogDescription>
            <span className="fcr-preview-toolbar-actions">
              {items.length > 1 && <span aria-live="polite">{index + 1} / {items.length}</span>}
            </span>
          </DialogHeader>
          <div className="fcr-preview-result">{current.content}</div>
          {items.length > 1 && (
            <>
              <div className="fcr-preview-nav">
                <Button type="button" variant="outline" size="icon"
                  disabled={index === 0} aria-label="上一张"
                  onClick={() => setIndex(index - 1)}>
                  <ChevronLeftIcon aria-hidden="true" />
                </Button>
                <Button type="button" variant="outline" size="icon"
                  disabled={index === items.length - 1} aria-label="下一张"
                  onClick={() => setIndex(index + 1)}>
                  <ChevronRightIcon aria-hidden="true" />
                </Button>
              </div>
              <div className="fcr-preview-thumbnails" aria-label="缩略图导航">
                {items.map((item, itemIndex) => (
                  <Button type="button" variant="ghost" key={itemIndex}
                    aria-label={`查看第 ${itemIndex + 1} 张`}
                    aria-current={itemIndex === index}
                    onClick={() => setIndex(itemIndex)}>
                    {item.thumbnail ?? itemIndex + 1}
                  </Button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
