import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => ({
  cacheDir: `node_modules/.vite-${mode}`,
  optimizeDeps:
    command === "serve" && (mode === "sanctum" || mode === "fantasy-ui")
      ? { entries: [`dev/${mode}.html`] }
      : undefined,
  plugins: [
    command === "serve" &&
      mode === "sanctum" && {
        name: "sanctum-preview-boundaries",
        enforce: "pre",
        resolveId(source, importer) {
          if (source === "@clerk/clerk-react")
            return path.resolve(__dirname, "dev/sanctum/auth.tsx");
          const resolved =
            importer && source.startsWith(".")
              ? path.resolve(path.dirname(importer.split("?")[0]), source)
              : source;
          if (
            source === "@/utils/trpc" ||
            resolved === path.resolve(__dirname, "src/utils/trpc")
          )
            return path.resolve(__dirname, "dev/sanctum/trpc.ts");
        },
      },
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      // Only the main dev server generates routes; previews share its output.
      enableRouteGeneration: !(
        command === "serve" &&
        (mode === "sanctum" || mode === "fantasy-ui")
      ),
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../server/dist",
  },
  server: {
    // Falling back to another port starts a second route generator in this tree.
    strictPort: true,
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
}));
