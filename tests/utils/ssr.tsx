import { renderToString } from "react-dom/server";

import { CardRenderer } from "../../src";

export function renderCardToString(card: unknown): string {
  return renderToString(<CardRenderer card={card} />);
}
