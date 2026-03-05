const figmaManifest = {
  name: "ChromaExtract",
  id: "chromaextract-dev",
  api: "1.0.0",
  main: "plugin.js",
  ui: "index.html",
  editorType: ["figma"],
  documentAccess: "dynamic-page",
  networkAccess: {
    allowedDomains: ["none"],
  },
} as const;

export default figmaManifest;
