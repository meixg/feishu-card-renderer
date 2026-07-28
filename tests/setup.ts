import "@testing-library/jest-dom/vitest";

if (typeof MouseEvent !== "undefined" &&
  typeof globalThis.PointerEvent === "undefined") {
  Object.defineProperty(globalThis, "PointerEvent", {
    configurable: true,
    value: MouseEvent,
  });
}
