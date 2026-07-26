import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";

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
});
