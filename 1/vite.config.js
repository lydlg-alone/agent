import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  root: "renderer",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./renderer/src", import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: "127.0.0.1"
  },
  build: {
    outDir: "../dist/renderer",
    emptyOutDir: true
  }
});
