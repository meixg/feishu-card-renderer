import { act, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";
import {
  UiPortal,
  UiPortalProvider,
} from "../../src/renderer/portal";
import { useUiPortalCleanup } from "../../src/renderer/portal-context";

const emptyCard = { schema: "2.0" };

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

  it("does not create a portal host for a fatal card", () => {
    const { container } = render(<CardRenderer card={null} />);

    expect(container.querySelector("[data-fcr-portal-host]")).toBeNull();
  });

  it("isolates portal events and cleans registered tasks on unmount", () => {
    const onParentClick = vi.fn();
    const onParentPointerDown = vi.fn();
    const onParentKeyDown = vi.fn();
    const onPortalClick = vi.fn();
    const onCleanup = vi.fn();

    function PortalContent() {
      useUiPortalCleanup(onCleanup);
      return <button type="button" onClick={onPortalClick}>Portal action</button>;
    }

    const rendered = render(
      <div
        onClick={onParentClick}
        onPointerDown={onParentPointerDown}
        onKeyDown={onParentKeyDown}
      >
        <UiPortalProvider>
          <UiPortal><PortalContent /></UiPortal>
        </UiPortalProvider>
      </div>,
    );

    const button = screen.getByRole("button", { name: "Portal action" });
    expect(button.closest("[data-fcr-portal-host]")).toBeInTheDocument();

    fireEvent.pointerDown(button);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);

    expect(onPortalClick).toHaveBeenCalledTimes(1);
    expect(onParentPointerDown).not.toHaveBeenCalled();
    expect(onParentKeyDown).not.toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();

    rendered.unmount();
    expect(onCleanup).toHaveBeenCalledTimes(1);
    expect(button.isConnected).toBe(false);
  });

  it("hydrates the server portal host without replacing it", async () => {
    const serverHtml = renderToString(
      <CardRenderer card={emptyCard} colorScheme="dark" />,
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
        <CardRenderer card={emptyCard} colorScheme="dark" />,
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
