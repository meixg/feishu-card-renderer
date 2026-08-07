import "@testing-library/jest-dom/vitest";

if (typeof MouseEvent !== "undefined" &&
  typeof globalThis.PointerEvent === "undefined") {
  Object.defineProperty(globalThis, "PointerEvent", {
    configurable: true,
    value: MouseEvent,
  });
}

if (typeof Range !== "undefined" && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}
