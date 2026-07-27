import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const shared = {
  plugins: [react()],
  test: {
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true,
  },
};

export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        test: {
          ...shared.test,
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
        },
      },
      {
        ...shared,
        test: {
          ...shared.test,
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.{ts,tsx}"],
        },
      },
      {
        ...shared,
        test: {
          ...shared.test,
          name: "accessibility",
          environment: "jsdom",
          include: ["tests/accessibility/**/*.test.{ts,tsx}"],
        },
      },
    ],
  },
});
