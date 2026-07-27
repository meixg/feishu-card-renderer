import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  base: "/feishu-card-renderer/",
  plugins: [react()],
  build: {
    outDir: "../site-dist",
    emptyOutDir: true,
  },
});
