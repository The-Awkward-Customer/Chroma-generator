import { defineConfig } from "vite";
import path from "node:path";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => ({
  plugins: [viteSingleFile()],
  root: path.resolve("src/ui"),
  esbuild: {
    jsxImportSource: "preact",
    jsx: "automatic",
  },
  build: {
    minify: mode === "production",
    cssMinify: mode === "production",
    sourcemap: mode !== "production" ? "inline" : false,
    emptyOutDir: false,
    outDir: path.resolve("dist"),
  },
  resolve: {
    alias: {
      "@common": path.resolve("src/common"),
      "@ui": path.resolve("src/ui"),
      "react": "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    },
  },
}));
