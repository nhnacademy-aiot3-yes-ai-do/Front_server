import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/react/" : "/",
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: "../target/classes/static/react",
    sourcemap: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/backend": {
        autoRewrite: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ""),
        target: "http://127.0.0.1:8082",
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
}));
