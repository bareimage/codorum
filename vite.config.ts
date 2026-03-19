import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  optimizeDeps: {
    include: ["tiptap-markdown", "mermaid"],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      // Ignore non-source files so that saving user content (e.g. chat.md)
      // inside the project directory doesn't trigger a Vite page reload.
      ignored: ["**/src-tauri/**", "**/*.md", "**/*.txt"],
    },
  },
}));
