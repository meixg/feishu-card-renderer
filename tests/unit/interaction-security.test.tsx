// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";

it("never executes getters and remains stable for cyclic card and action values", () => {
  const getter = vi.fn(() => "secret");
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  Object.defineProperty(cyclic, "trap", { enumerable: true, get: getter });
  const behaviorValue: Record<string, unknown> = { safe: "yes" };
  behaviorValue.self = behaviorValue;
  Object.defineProperty(behaviorValue, "trap", { enumerable: true, get: getter });
  const card = {
    schema: "2.0",
    body: { elements: [{ tag: "button",
      text: { tag: "plain_text", content: "安全动作" },
      behaviors: [{ type: "callback", value: behaviorValue }],
      opaque: cyclic }],
    },
  };
  const onAction = vi.fn();
  expect(() => render(<CardRenderer card={card} onAction={onAction} />)).not.toThrow();
  fireEvent.click(screen.getByRole("button", { name: "安全动作" }));
  expect(getter).not.toHaveBeenCalled();
  expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
    value: { safe: "yes" },
  }));
  expect(() => JSON.stringify(onAction.mock.calls[0][0])).not.toThrow();
});

it("renders a stable placeholder when the protocol tree itself is cyclic", () => {
  const card: Record<string, unknown> = { schema: "2.0" };
  const elements: unknown[] = [];
  card.body = { elements };
  elements.push(card);
  expect(() => render(<CardRenderer card={card} />)).not.toThrow();
  expect(screen.getByRole("note")).toHaveTextContent("不支持");
});
