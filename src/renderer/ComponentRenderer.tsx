import type { CardElement, UnsupportedCardElement } from "../schema/components";
import { CONTAINER_TAGS } from "../schema/components";
import { RecursiveContext, useRecursiveContext } from "./context";
import { registry } from "./registry";
import { UnknownComponent } from "./UnknownComponent";

export function ComponentRenderer({ element, path }: {
  element: CardElement | UnsupportedCardElement;
  path: string;
}): React.JSX.Element {
  const parent = useRecursiveContext();
  if (typeof element !== "object" || element === null ||
    typeof (element as { tag?: unknown }).tag !== "string") {
    return <UnknownComponent tag="invalid" path={path} />;
  }
  if (element.tag === "__unsupported") {
    return <UnknownComponent tag={element.originalTag} path={path} />;
  }
  const Renderer = registry[element.tag];
  const context = {
    ...parent,
    path,
    containerDepth: parent.containerDepth +
      (CONTAINER_TAGS.has(element.tag) ? 1 : 0),
  } as const;
  return (
    <RecursiveContext.Provider value={context}>
      {Renderer
        ? <Renderer element={element as never} path={path} />
        : <UnknownComponent tag={String(element.tag)} path={path} />}
    </RecursiveContext.Provider>
  );
}
