import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const markdownRequire = createRequire(
  import.meta.resolve("mdast-util-from-markdown"),
);

export default defineConfig({
  // The published ESM entry must stay importable in SSR/Node. In particular,
  // do not select decode-named-character-reference's DOM conditional export.
  resolve: {
    alias: [{
      find: /^decode-named-character-reference$/,
      replacement: markdownRequire.resolve("decode-named-character-reference"),
    }],
  },
  plugins: [
    react(),
    dts({
      include: ["src"],
      insertTypesEntry: true,
      rollupTypes: false,
    }),
  ],
  build: {
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
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
});
