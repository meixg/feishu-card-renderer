import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TextElement } from "../../schema/components";
import { useRendererContext } from "../../renderer/context";
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

type ActiveModal = {
  cancel: () => void;
  id: symbol;
};

const activeModalByDocument = new WeakMap<Document, ActiveModal>();

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
  const { locale } = useRendererContext();
  const isChinese = locale.toLowerCase().startsWith("zh");
  const copy = isChinese
    ? { title: "确认操作", text: "是否继续？", cancel: "取消", confirm: "确认" }
    : { title: "Confirm action", text: "Do you want to continue?",
      cancel: "Cancel", confirm: "Confirm" };
  const confirmed = useRef(false);
  const suppressFinalFocus = useRef(false);
  const cancelRef = useRef(onCancel);
  const modalRef = useRef<ActiveModal | null>(null);
  const [modalActive, setModalActive] = useState(false);
  cancelRef.current = onCancel;
  if (!modalRef.current) {
    modalRef.current = {
      cancel: () => {
        suppressFinalFocus.current = true;
        cancelRef.current();
      },
      id: Symbol("fcr-confirm-dialog"),
    };
  }
  const modal = modalRef.current;

  useEffect(() => {
    if (!open) confirmed.current = false;
  }, [open]);
  useLayoutEffect(() => {
    const document = trigger.current?.ownerDocument;
    if (!open || !document) {
      setModalActive(false);
      return undefined;
    }
    suppressFinalFocus.current = false;

    const previous = activeModalByDocument.get(document);
    if (previous && previous.id !== modal.id) previous.cancel();
    activeModalByDocument.set(document, modal);
    setModalActive(true);

    return () => {
      if (activeModalByDocument.get(document)?.id === modal.id) {
        activeModalByDocument.delete(document);
      }
    };
  }, [modal, open, trigger]);

  const effectiveOpen = open && modalActive;
  return (
    <AlertDialog
      open={effectiveOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <AlertDialogContent finalFocus={() =>
        suppressFinalFocus.current ? false : trigger.current}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title?.content ?? copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {text?.content ?? copy.text}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">{copy.cancel}</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={() => {
              if (confirmed.current) return;
              confirmed.current = true;
              onConfirm();
            }}
          >
            {copy.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
