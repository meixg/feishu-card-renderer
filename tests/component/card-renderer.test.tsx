import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardRenderer } from "../../src";

describe("CardRenderer", () => {
  it("renders a stable placeholder without interpreting card input", () => {
    const card = Object.freeze({ schema: "2.0" });

    render(<CardRenderer card={card} className="host-class" />);

    expect(screen.getByRole("status")).toHaveClass("fcr-root", "host-class");
    expect(card).toEqual({ schema: "2.0" });
  });
});
