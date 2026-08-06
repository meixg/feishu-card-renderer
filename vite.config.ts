import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const markdownRequire = createRequire(
  import.meta.resolve("mdast-util-from-markdown"),
);

export default defineConfig({
  // The published ESM entry must stay importable in SSR/Node. In particular,
  // do not select decode-named-character-reference's DOM conditional export.
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
      {
        find: /^decode-named-character-reference$/,
        replacement: markdownRequire.resolve("decode-named-character-reference"),
      },
    ],
  },
  plugins: [
    react(),
    dts({
      entryRoot: "src",
      include: ["src"],
      insertTypesEntry: true,
    }),
  ],
  build: {
    // Pin Vite 8's 2026 baseline so future tool updates cannot silently raise it.
    target: ["chrome111", "edge111", "firefox114", "safari16.4"],
    lib: {
      entry: {
        index: "src/index.ts",
        schema: "src/schema/index.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
      cssFileName: "styles",
    },
    cssCodeSplit: false,
    rolldownOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
        /^@base-ui\/react(?:\/.*)?$/,
        /^react-day-picker(?:\/.*)?$/,
      ],
    },
  },
});
