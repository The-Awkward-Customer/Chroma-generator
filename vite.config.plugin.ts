import path from "node:path";
import { defineConfig } from "vite";
import generateFile from "vite-plugin-generate-file";
import { viteSingleFile } from "vite-plugin-singlefile";
import figmaManifest from "./figma.manifest";

export default defineConfig(({ mode }) => ({
  plugins: [
    viteSingleFile(),
    generateFile({
      type: "json",
      output: "./manifest.json",
      data: figmaManifest,
    }),
  ],
  esbuild: {
    // Figma's sandbox VM cannot handle template literals with embedded newlines.
    // culori's CSS parser uses them, causing "Syntax error on line 4: Unexpected
    // reserved word" because the VM loses parsing context across line breaks.
    supported: {
      "template-literal": false,
    },
  },
  build: {
    minify: mode === "production",
    sourcemap: mode !== "production" ? "inline" : false,
    target: "es2017",
    emptyOutDir: false,
    outDir: path.resolve("dist"),
    modulePreload: false,
    rollupOptions: {
      input: path.resolve("src/plugin/plugin.ts"),
      output: { entryFileNames: "plugin.js", format: "iife" },
    },
  },
  resolve: {
    alias: {
      "@common": path.resolve("src/common"),
      "@plugin": path.resolve("src/plugin"),
    },
  },
}));
