import { useEffect, useRef } from "react";
import type { TextElement } from "../../schema/components";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export function ConfirmDialog({
  open,
  title,
  text,
  onConfirm,
  onCancel,
  trigger,
}: {
  open: boolean;
  title?: TextElement; text?: TextElement; onConfirm: () => void;
  onCancel: () => void; trigger: React.RefObject<HTMLElement | null>;
}): React.JSX.Element {
  const confirmed = useRef(false);
  useEffect(() => {
    if (!open) confirmed.current = false;
  }, [open]);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <AlertDialogContent finalFocus={trigger}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title?.content ?? "确认操作"}</AlertDialogTitle>
          <AlertDialogDescription>
            {text?.content ?? "是否继续？"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">取消</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={() => {
              if (confirmed.current) return;
              confirmed.current = true;
              onConfirm();
            }}
          >
            确认
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
