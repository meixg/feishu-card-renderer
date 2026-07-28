import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";

const emptyCard = { schema: "2.0" };
const closedOverlayCard = {
  schema: "2.0" as const,
  body: {
    elements: [
      {
        tag: "button",
        text: { tag: "plain_text", content: "确认" },
        confirm: {
          title: { tag: "plain_text", content: "确认操作" },
          text: { tag: "plain_text", content: "继续吗？" },
        },
        behaviors: [{ type: "callback", value: "confirm" }],
      },
      {
        tag: "overflow",
        options: [{
          text: { tag: "plain_text", content: "菜单项" },
          value: "menu",
        }],
      },
      {
        tag: "img_combination",
        img_list: [
          { img_key: "one", alt: { tag: "plain_text", content: "一" } },
          { img_key: "two", alt: { tag: "plain_text", content: "二" } },
        ],
      },
    ],
  },
};

describe("per-card UI foundation", () => {
  it("keeps one stable, theme-scoped portal host per successful card", () => {
    const first = render(
      <CardRenderer card={emptyCard} colorScheme="light" />,
    );
    const firstRoot = first.container.querySelector("article");
    expect(firstRoot).toBeInstanceOf(HTMLElement);
    if (!firstRoot) throw new Error("Expected the first card root.");
    const firstHost = firstRoot.querySelector("[data-fcr-portal-host]");

    expect(firstHost).toBeInstanceOf(HTMLElement);
    expect(firstRoot.querySelectorAll("[data-fcr-portal-host]")).toHaveLength(1);
    expect(firstHost?.closest(".fcr-root")).toBe(firstRoot);

    first.rerender(
      <CardRenderer card={emptyCard} colorScheme="dark" />,
    );
    expect(firstRoot).toHaveClass("fcr-theme-dark");
    expect(firstRoot.querySelector("[data-fcr-portal-host]")).toBe(firstHost);

    const second = render(
      <CardRenderer card={emptyCard} colorScheme="light" />,
    );
    const secondRoot = second.container.querySelector("article");
    expect(secondRoot).toBeInstanceOf(HTMLElement);
    if (!secondRoot) throw new Error("Expected the second card root.");
    const secondHost = secondRoot.querySelector("[data-fcr-portal-host]");

    expect(secondHost).toBeInstanceOf(HTMLElement);
    expect(secondHost).not.toBe(firstHost);
    expect(secondHost?.closest(".fcr-theme-light")).toBe(secondRoot);
    expect(firstHost?.closest(".fcr-theme-dark")).toBe(firstRoot);

    first.unmount();
    expect(firstHost?.isConnected).toBe(false);
    expect(secondHost?.isConnected).toBe(true);

    second.unmount();
    expect(secondHost?.isConnected).toBe(false);
  });

  it("removes an open card portal without disturbing another card", async () => {
    const firstAction = vi.fn();
    const secondAction = vi.fn();
    const card = (owner: "first" | "second", title: string) => ({
      schema: "2.0" as const,
      body: {
        elements: [{
          tag: "interactive_container",
          behaviors: [{ type: "callback", value: { owner: `${owner}-parent` } }],
          elements: [{
            tag: "button",
            text: { tag: "plain_text", content: `打开${title}` },
            confirm: {
              title: { tag: "plain_text", content: title },
              text: { tag: "plain_text", content: `${title}内容` },
            },
            behaviors: [{ type: "callback", value: { owner } }],
          }],
        }],
      },
    });
    const first = render(
      <CardRenderer
        card={card("first", "第一张卡确认")}
        colorScheme="dark"
        onAction={firstAction}
      />,
    );
    const second = render(
      <CardRenderer
        card={card("second", "第二张卡确认")}
        colorScheme="light"
        onAction={secondAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开第一张卡确认" }));
    const firstDialog = first.container.querySelector("[role='alertdialog']");
    if (!firstDialog) throw new Error("Expected the first card dialog.");
    const firstHost = first.container.querySelector("[data-fcr-portal-host]");
    const secondHost = second.container.querySelector("[data-fcr-portal-host]");

    expect(firstDialog.closest("[data-fcr-portal-host]")).toBe(firstHost);
    expect(firstDialog.closest(".fcr-theme-dark")).toBe(
      first.container.querySelector(".fcr-root"),
    );

    first.unmount();

    expect(firstHost?.isConnected).toBe(false);
    expect(firstDialog.isConnected).toBe(false);
    expect(secondHost?.isConnected).toBe(true);
    const secondTrigger = await screen.findByRole("button", {
      name: "打开第二张卡确认",
    });
    expect(secondTrigger.closest("[data-base-ui-inert]")).toBeNull();

    fireEvent.click(secondTrigger);
    const secondDialog = screen.getByRole("alertdialog", {
      name: "第二张卡确认",
    });

    expect(secondDialog.closest("[data-fcr-portal-host]")).toBe(secondHost);
    expect(secondDialog.closest(".fcr-theme-light")).toBe(
      second.container.querySelector(".fcr-root"),
    );
    expect(secondDialog).toBeInTheDocument();
    await waitFor(() => {
      expect(secondDialog.contains(document.activeElement)).toBe(true);
    });

    fireEvent.click(
      within(secondDialog).getByRole("button", { name: "确认" }),
    );
    await waitFor(() => expect(secondDialog).not.toBeInTheDocument());
    expect(firstAction).not.toHaveBeenCalled();
    expect(secondAction.mock.calls.map(([action]) => action)).toEqual([
      expect.objectContaining({
        type: "callback",
        value: { owner: "second" },
      }),
    ]);

    second.unmount();
  });

  it("does not create a portal host for a fatal card", () => {
    const { container } = render(<CardRenderer card={null} />);

    expect(container.querySelector("[data-fcr-portal-host]")).toBeNull();
  });

  it("hydrates the server portal host without replacing it", async () => {
    const serverHtml = renderToString(
      <CardRenderer card={closedOverlayCard} colorScheme="dark" />,
    );
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);
    const serverHost = container.querySelector("[data-fcr-portal-host]");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: Root | undefined;

    expect(serverHost).toBeInstanceOf(HTMLElement);
    await act(async () => {
      root = hydrateRoot(
        container,
        <CardRenderer card={closedOverlayCard} colorScheme="dark" />,
      );
    });

    expect(container.querySelector("[data-fcr-portal-host]")).toBe(serverHost);
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(
      /hydration|didn't match|server rendered/i,
    );

    await act(async () => root?.unmount());
    consoleError.mockRestore();
    container.remove();
  });
});
