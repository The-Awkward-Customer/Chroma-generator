import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * Strip the webpack-style `!` prefix from CSS imports.
 * @create-figma-plugin/ui's render.js uses `import '!../css/base.css'`
 * which is a webpack convention that Vite doesn't understand.
 */
function stripCssImportPrefix(): Plugin {
  return {
    name: "strip-css-import-prefix",
    resolveId(source, importer) {
      if (source.startsWith("!") && source.endsWith(".css")) {
        return this.resolve(source.slice(1), importer, { skipSelf: true });
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [stripCssImportPrefix(), viteSingleFile()],
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
