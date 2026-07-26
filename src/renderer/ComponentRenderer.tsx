import type { CardElement, UnsupportedCardElement } from "../schema/components";
import { registry } from "./registry";
import { UnknownComponent } from "./UnknownComponent";

export function ComponentRenderer({ element, path }: {
  element: CardElement | UnsupportedCardElement;
  path: string;
}): React.JSX.Element {
  if (element.tag === "__unsupported") {
    return <UnknownComponent tag={element.originalTag} />;
  }
  const Renderer = registry[element.tag];
  return Renderer
    ? <Renderer element={element as never} path={path} />
    : <UnknownComponent tag={String(element.tag)} />;
}
