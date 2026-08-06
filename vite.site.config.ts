import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  base: "/feishu-card-renderer/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // Keep the site aligned with the pinned library browser baseline.
    target: ["chrome111", "edge111", "firefox114", "safari16.4"],
    outDir: "../site-dist",
    emptyOutDir: true,
  },
});
