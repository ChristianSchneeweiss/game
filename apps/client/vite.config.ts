import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), TanStackRouterVite({}), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../server/dist",
  },
  server: {
    proxy: {
      "/trpc": {
        target: "http://localhost:3000/trpc",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/trpc/, ""),
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
