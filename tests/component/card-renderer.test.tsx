import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/adapters/vchart-loader", () => ({
  loadVChartRuntime: async () => ({
    createChart: () => ({ update: vi.fn(), release: vi.fn() }),
  }),
}));

import { CardRenderer } from "../../src";
import { completeComplexContentCard } from "../../src/fixtures/complex-content";

describe("CardRenderer", () => {
  it("renders header and supported body without mutating frozen input", () => {
    const card = Object.freeze({
      schema: "2.0",
      header: Object.freeze({ title: Object.freeze({ tag: "plain_text", content: "<b>Title</b>" }) }),
      body: Object.freeze({ elements: Object.freeze([
        Object.freeze({ tag: "div", text: Object.freeze({ tag: "plain_text", content: "<script>x</script>" }) }),
        Object.freeze({ tag: "hr" }),
      ]) }),
    });

    render(<CardRenderer card={card} className="host-class" />);

    expect(screen.getByRole("article")).toHaveClass("fcr-root", "host-class");
    expect(screen.getByText("<b>Title</b>")).toBeInTheDocument();
    expect(screen.getByText("<script>x</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("sanitizes markdown links and never creates raw HTML", () => {
    const { container } = render(<CardRenderer card={{ schema: "2.0", body: { elements: [{
      tag: "markdown",
      content: "**safe** [bad](javascript:alert(1)) [good](https://example.com)",
    }] } }} />);
    expect(screen.getByText("safe").tagName).toBe("STRONG");
    expect([...container.querySelectorAll("a")]
      .some((anchor) => anchor.textContent === "bad")).toBe(false);
    expect(screen.getByRole("link", { name: "good" })).toHaveAttribute(
      "rel", "noopener noreferrer",
    );
  });

  it("renders fatal fallback and batches diagnostics after commit", async () => {
    const onDiagnostic = vi.fn();
    render(<CardRenderer card={null} fallback="Bad card"
      onDiagnostic={onDiagnostic} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Bad card");
    await act(async () => {});
    expect(onDiagnostic).toHaveBeenCalledTimes(1);
    expect(onDiagnostic.mock.calls[0][0][0].code).toBe("invalid_root");
  });

  it("shows an unknown tag and stable protocol path in development", () => {
    render(<CardRenderer card={{
      schema: "2.0",
      body: { elements: [
        { tag: "div", text: { tag: "plain_text", content: "before" } },
        { tag: "future_widget" },
      ] },
    }} />);

    const placeholder = screen.getByRole("note");
    expect(placeholder).toHaveTextContent("future_widget");
    expect(placeholder).toHaveTextContent("$.body.elements[1]");
  });

  it("resolves duplicate image keys once after hydration", async () => {
    let finish!: (value: string) => void;
    const resolveImage = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
    render(<CardRenderer resolveImage={resolveImage} card={{
      schema: "2.0", body: { elements: [
        { tag: "img", img_key: "secret", alt: { tag: "plain_text", content: "A" } },
        { tag: "img", img_key: "secret", alt: { tag: "plain_text", content: "B" } },
      ] },
    }} />);
    expect(resolveImage).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain("secret");
    await act(async () => finish("https://example.com/image.png"));
    expect(document.querySelectorAll("img")).toHaveLength(2);
  });

  it("isolates resource caches when host resolver identities change", async () => {
    const firstImage = vi.fn(() => "https://first.example/image.png");
    const secondImage = vi.fn(() => "https://second.example/image.png");
    const firstPerson = vi.fn(() => ({ id: "same", name: "First tenant" }));
    const secondPerson = vi.fn(() => ({ id: "same", name: "Second tenant" }));
    const card = { schema: "2.0", body: { elements: [
      { tag: "img", img_key: "same",
        alt: { tag: "plain_text", content: "Tenant image" } },
      { tag: "person", user_id: "same" },
    ] } };
    const rendered = render(<CardRenderer card={card}
      resolveImage={firstImage} resolvePerson={firstPerson} />);
    await act(async () => {});
    expect(screen.getByRole("img", { name: "Tenant image" })).toHaveAttribute(
      "src", "https://first.example/image.png",
    );
    expect(screen.getByText("First tenant")).toBeInTheDocument();

    rendered.rerender(<CardRenderer card={card}
      resolveImage={secondImage} resolvePerson={secondPerson} />);
    await act(async () => {});
    expect(screen.getByRole("img", { name: "Tenant image" })).toHaveAttribute(
      "src", "https://second.example/image.png",
    );
    expect(screen.getByText("Second tenant")).toBeInTheDocument();
    expect(firstImage).toHaveBeenCalledTimes(1);
    expect(secondImage).toHaveBeenCalledTimes(1);
    expect(firstPerson).toHaveBeenCalledTimes(1);
    expect(secondPerson).toHaveBeenCalledTimes(1);
  });

  it("aborts pending old resolver scopes before accepting new session resources", async () => {
    let finishOldImage!: (value: string) => void;
    let finishOldPerson!: (value: { id: string; name: string }) => void;
    let oldImageSignal: AbortSignal | undefined;
    let oldPersonSignal: AbortSignal | undefined;
    const oldImage = vi.fn((_key: string, signal: AbortSignal) => {
      oldImageSignal = signal;
      return new Promise<string>((resolve) => { finishOldImage = resolve; });
    });
    const oldPerson = vi.fn((_id: string, signal: AbortSignal) => {
      oldPersonSignal = signal;
      return new Promise<{ id: string; name: string }>((resolve) => {
        finishOldPerson = resolve;
      });
    });
    const card = { schema: "2.0", body: { elements: [
      { tag: "img", img_key: "shared",
        alt: { tag: "plain_text", content: "Scoped image" } },
      { tag: "person", user_id: "shared" },
    ] } };
    const rendered = render(<CardRenderer card={card}
      resolveImage={oldImage} resolvePerson={oldPerson} />);
    expect(oldImageSignal?.aborted).toBe(false);
    expect(oldPersonSignal?.aborted).toBe(false);

    rendered.rerender(<CardRenderer card={card}
      resolveImage={() => "https://new.example/image.png"}
      resolvePerson={() => ({ id: "shared", name: "New session" })} />);
    await act(async () => {});
    expect(oldImageSignal?.aborted).toBe(true);
    expect(oldPersonSignal?.aborted).toBe(true);
    expect(screen.getByRole("img", { name: "Scoped image" })).toHaveAttribute(
      "src", "https://new.example/image.png",
    );
    expect(screen.getByText("New session")).toBeInTheDocument();

    await act(async () => {
      finishOldImage("https://old.example/leak.png");
      finishOldPerson({ id: "shared", name: "Old session" });
    });
    expect(screen.queryByText("Old session")).toBeNull();
    expect(screen.getByRole("img", { name: "Scoped image" })).not.toHaveAttribute(
      "src", "https://old.example/leak.png",
    );
  });

  it("aborts pending image work on unmount", () => {
    let signal: AbortSignal | undefined;
    const { unmount } = render(<CardRenderer
      resolveImage={(_, nextSignal) => {
        signal = nextSignal;
        return new Promise(() => {});
      }}
      card={{ schema: "2.0", body: { elements: [{ tag: "img", img_key: "x" }] } }}
    />);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "file:///etc/passwd",
    "blob:https://example.com/id",
  ])("rejects an unsafe resolver URL without creating an img: %s", async (url) => {
    const { container } = render(<CardRenderer resolveImage={() => url} card={{
      schema: "2.0",
      body: { elements: [{ tag: "img", img_key: "private", alt: {
        tag: "plain_text", content: "Safe alt",
      } }] },
    }} />);

    await act(async () => {});
    expect(container.querySelector("img")).toBeNull();
    expect(within(container).getByRole("img", { name: "Safe alt" }))
      .toHaveAttribute("data-state", "error");
    expect(document.body.textContent).not.toContain(url);
  });

  it("renders a resolver URL with an explicitly allowed HTTPS scheme", async () => {
    render(<CardRenderer resolveImage={() => "https://cdn.example.com/a.png"} card={{
      schema: "2.0",
      body: { elements: [{ tag: "img", img_key: "safe", alt: {
        tag: "plain_text", content: "Safe image",
      } }] },
    }} />);

    await act(async () => {});
    expect(screen.getByRole("img", { name: "Safe image" })).toHaveAttribute(
      "src", "https://cdn.example.com/a.png",
    );
  });

  it.each([
    ["without a resolver", undefined, "unavailable"],
    ["when the resolver returns undefined", (): undefined => undefined, "error"],
    ["when the resolver rejects",
      (): Promise<string | undefined> => Promise.reject(new Error("private")),
      "error"],
  ] as const)(
    "preserves the renderer image placeholder in the trigger and Dialog %s",
    async (_case, resolveImage, expectedState) => {
      const rendered = render(<CardRenderer resolveImage={resolveImage} card={{
        schema: "2.0",
        body: { elements: [{
          tag: "img",
          img_key: "private-resource",
          preview: true,
          alt: { tag: "plain_text", content: "Unavailable diagram" },
        }] },
      }} />);
      await act(async () => {});

      const trigger = within(rendered.container).getByRole(
        "button", { name: "打开图片预览" },
      );
      expect(within(trigger).getByRole("img", { name: "Unavailable diagram" }))
        .toHaveAttribute("data-state", expectedState);
      expect(rendered.container).not.toHaveTextContent("private-resource");

      fireEvent.click(trigger);
      const dialog = within(rendered.container).getByRole(
        "dialog", { name: "Unavailable diagram" },
      );
      expect(within(dialog).getByRole("img", { name: "Unavailable diagram" }))
        .toHaveAttribute("data-state", expectedState);
      expect(dialog).not.toHaveTextContent("private-resource");
    },
  );

  it("keeps the loading image placeholder in both preview surfaces", () => {
    const rendered = render(<CardRenderer
      resolveImage={() => new Promise(() => {})}
      card={{
        schema: "2.0",
        body: { elements: [{
          tag: "img",
          img_key: "pending-resource",
          preview: true,
          alt: { tag: "plain_text", content: "Loading diagram" },
        }] },
      }}
    />);
    const trigger = within(rendered.container).getByRole(
      "button", { name: "打开图片预览" },
    );
    expect(within(trigger).getByRole("img", { name: "Loading diagram" }))
      .toHaveAttribute("data-state", "loading");

    fireEvent.click(trigger);
    const dialog = within(rendered.container).getByRole(
      "dialog", { name: "Loading diagram" },
    );
    expect(within(dialog).getByRole("img", { name: "Loading diagram" }))
      .toHaveAttribute("data-state", "loading");
  });

  it("server-renders and hydrates a closed image preview without mismatch", async () => {
    const card = {
      schema: "2.0",
      body: { elements: [{
        tag: "img",
        img_key: "ssr-image",
        preview: true,
        alt: { tag: "plain_text", content: "SSR preview" },
      }] },
    };
    const firstMarkup = renderToString(<CardRenderer card={card} />);
    expect(renderToString(<CardRenderer card={card} />)).toBe(firstMarkup);
    expect(firstMarkup).not.toContain("data-slot=\"dialog-content\"");
    expect(firstMarkup).toContain("data-fcr-portal-host");

    const container = document.createElement("div");
    container.innerHTML = firstMarkup;
    document.body.append(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const root = hydrateRoot(container, <CardRenderer card={card} />);
    await act(async () => {});
    expect(consoleError).not.toHaveBeenCalled();

    const trigger = within(container).getByRole(
      "button", { name: "打开图片预览" },
    );
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = within(container).getByRole(
      "dialog", { name: "SSR preview" },
    );
    expect(dialog).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "关闭预览" }));
    expect(within(container).queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();

    await act(async () => root.unmount());
    consoleError.mockRestore();
    container.remove();
  });

  it("resolves people synchronously/asynchronously once per id without exposing ids", async () => {
    let finish!: (value: { id: string; name: string; avatarUrl: string }) => void;
    const resolvePerson = vi.fn((id: string) => id === "person-a"
      ? { id, name: "Alice", avatarUrl: "https://cdn.example.com/a.png" }
      : new Promise<{ id: string; name: string; avatarUrl: string }>((resolve) => {
        finish = resolve;
      }));
    render(<CardRenderer card={completeComplexContentCard}
      resolvePerson={resolvePerson} />);
    await act(async () => {});
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(resolvePerson).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).not.toContain("person-a");
    expect(document.body.textContent).not.toContain("person-b");
    await act(async () => finish({ id: "person-b", name: "Bob",
      avatarUrl: "https://cdn.example.com/b.png" }));
    expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
  });

  it("keeps unavailable/failed people anonymous and aborts pending work", async () => {
    const failed = render(<CardRenderer card={{ schema: "2.0", body: {
      elements: [{ tag: "person", user_id: "failed-sensitive" }],
    } }} resolvePerson={() => undefined} />);
    await act(async () => {});
    expect(within(failed.container).getByText("人员不可用")).toBeInTheDocument();
    expect(failed.container).not.toHaveTextContent("failed-sensitive");

    let signal: AbortSignal | undefined;
    let reject!: (reason: Error) => void;
    const { unmount } = render(<CardRenderer card={{ schema: "2.0", body: {
      elements: [{ tag: "person", user_id: "sensitive" }],
    } }} resolvePerson={(_, nextSignal) => {
      signal = nextSignal;
      return new Promise((_, nextReject) => { reject = nextReject; });
    }} />);
    await act(async () => {});
    expect(screen.getByText("加载中")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("sensitive");
    unmount();
    expect(signal?.aborted).toBe(true);
    reject(new Error("internal sensitive"));
  });

  it("renders semantic table types, pages, and never recursively renders row components", async () => {
    const first = render(<CardRenderer card={completeComplexContentCard}
      resolvePerson={(id) => ({ id, name: "Owner" })} />);
    await act(async () => {});
    const table = within(first.container).getByRole("table");
    expect(table).toHaveAttribute("data-slot", "table");
    expect(table.closest('[data-slot="table-container"]')).not.toBeNull();
    expect(within(table).getByRole("columnheader", { name: "金额" })).toBeInTheDocument();
    expect(within(table).getByText("¥1,234.50")).toBeInTheDocument();
    expect(within(table).getByText("2026-07-26")).toBeInTheDocument();
    const pagination = first.container.querySelector('[data-slot="pagination"]');
    expect(pagination).not.toBeNull();
    const nextPage = within(first.container).getByRole("button", { name: "下一页" });
    expect(nextPage).toHaveAttribute("data-slot", "button");
    fireEvent.click(nextPage);
    expect(within(first.container).getByText("项目 B")).toBeInTheDocument();

    const { container } = render(<CardRenderer card={{ schema: "2.0", body: {
      elements: [{ tag: "table", columns: [{ name: "x", display_name: "X" }],
        rows: [{ x: { tag: "button", text: "secret" } }] }],
    } }} />);
    expect(container.querySelector("button")).toBeNull();
    expect(container).not.toHaveTextContent("secret");
  });

  it("supports keyboard image preview navigation, focus trap, Esc, and restoration", async () => {
    const rendered = render(<CardRenderer card={completeComplexContentCard}
      resolveImage={(key) => `https://cdn.example.com/${key}.png`} />);
    await act(async () => {});
    const trigger = within(rendered.container).getByRole(
      "button", { name: "打开图片组预览" },
    );
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = within(rendered.container).getByRole("dialog");
    expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(within(rendered.container).queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("previews only the chart safe-result container through the shared layer", () => {
    const rendered = render(<CardRenderer card={completeComplexContentCard} />);
    const trigger = within(rendered.container).getByRole(
      "button", { name: "打开图表预览" },
    );
    expect(within(trigger).getByRole("img", { name: "图表" })).toHaveAttribute(
      "data-chart-result", "safe",
    );
    fireEvent.click(trigger);
    const dialog = within(rendered.container).getByRole("dialog");
    expect(within(dialog).getByRole("img", { name: "图表预览" })).toHaveAttribute(
      "data-chart-result", "safe",
    );
  });
});
