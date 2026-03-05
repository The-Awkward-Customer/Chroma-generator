# ChromaExtract Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Figma plugin that extracts colors from images, generates WCAG-compliant palettes with harmony rules, and outputs them as Figma styles, variables, canvas frames, and JSON tokens.

**Architecture:** Heavy Sandbox — all color science runs in the Figma sandbox thread. UI iframe (React) handles rendering and local image decoding only. Communication via typed postMessage.

**Tech Stack:** TypeScript, React, Vite, culori, wcag-contrast, upng-js, @figma/plugin-typings

**Design Doc:** `docs/plans/2026-03-05-chromaextract-design.md`

---

## Task 1: Plugin Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.plugin.ts`
- Create: `vite.config.ui.ts`
- Create: `figma.manifest.ts`
- Create: `src/plugin/plugin.ts`
- Create: `src/ui/index.html`
- Create: `src/ui/main.tsx`
- Create: `src/ui/App.tsx`
- Create: `src/ui/App.css`
- Create: `src/common/messages.ts`
- Create: `.gitignore`

**Step 1: Initialize npm and install dependencies**

```bash
npm init -y
npm install react react-dom culori wcag-contrast upng-js
npm install --save-dev typescript vite @vitejs/plugin-react vite-plugin-singlefile vite-plugin-generate-file concurrently @figma/plugin-typings @types/react @types/react-dom @types/culori
```

**Step 2: Create `.gitignore`**

```
node_modules/
dist/
*.js.map
.DS_Store
```

**Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["es2017", "dom"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@common/*": ["src/common/*"],
      "@plugin/*": ["src/plugin/*"],
      "@ui/*": ["src/ui/*"]
    },
    "typeRoots": [
      "./node_modules/@types",
      "./node_modules/@figma"
    ]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create `figma.manifest.ts`**

```ts
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
```

**Step 5: Create `vite.config.plugin.ts`**

```ts
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
  build: {
    minify: mode === "production",
    sourcemap: mode !== "production" ? "inline" : false,
    target: "es2017",
    emptyOutDir: false,
    outDir: path.resolve("dist"),
    rollupOptions: {
      input: path.resolve("src/plugin/plugin.ts"),
      output: { entryFileNames: "plugin.js" },
    },
  },
  resolve: {
    alias: {
      "@common": path.resolve("src/common"),
      "@plugin": path.resolve("src/plugin"),
    },
  },
}));
```

**Step 6: Create `vite.config.ui.ts`**

```ts
import { defineConfig } from "vite";
import path from "node:path";
import { viteSingleFile } from "vite-plugin-singlefile";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react(), viteSingleFile()],
  root: path.resolve("src/ui"),
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
    },
  },
}));
```

**Step 7: Create `src/common/messages.ts`**

```ts
// UI → Sandbox messages
export type UiToSandboxMessage =
  | { type: "upload-image"; payload: { width: number; height: number; pixels: number[] } }
  | { type: "select-layer" }
  | { type: "set-key-count"; payload: { count: number } }
  | { type: "toggle-method"; payload: { method: ExtractionMethod; enabled: boolean } }
  | { type: "toggle-harmony"; payload: { rule: HarmonyRule; enabled: boolean } }
  | { type: "lock-color"; payload: { index: number; locked: boolean } }
  | { type: "override-color"; payload: { index: number; hex: string } }
  | { type: "select-preset"; payload: { preset: PresetName } }
  | { type: "export-figma"; payload: ExportConfig }
  | { type: "export-json" };

// Sandbox → UI messages
export type SandboxToUiMessage =
  | { type: "extraction-result"; payload: ExtractionResult }
  | { type: "harmony-result"; payload: HarmonyResult }
  | { type: "wcag-result"; payload: WcagResult }
  | { type: "export-complete"; payload: { success: boolean; message: string } }
  | { type: "error"; payload: { message: string } };

export type ExtractionMethod = "kmeans" | "mediancut" | "octree" | "hashmap" | "deltae";
export type HarmonyRule = "complementary" | "split-complementary" | "analogous" | "triadic" | "tetradic" | "accent" | "tints-shades";
export type PresetName = "photographic" | "graphic" | "high-fidelity" | "custom";
export type OutputMode = "semantic" | "enumerated" | "math-report";
export type TokenSchema = "material" | "tailwind" | "custom";

export interface ExportConfig {
  mode: OutputMode;
  schema: TokenSchema;
  customPrefix?: string;
  outputs: {
    styles: boolean;
    variables: boolean;
    canvasFrame: boolean;
    json: boolean;
  };
}

export interface ColorSwatch {
  lab: [number, number, number];
  lch: [number, number, number];
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  weight: number;
  sourceMethods: ExtractionMethod[];
}

export interface KeyColor extends ColorSwatch {
  locked: boolean;
  overridden: boolean;
}

export interface DerivedColor extends ColorSwatch {
  parentIndex: number;
  relationship: string;
  rule: HarmonyRule;
}

export interface WcagPair {
  fgIndex: number;
  bgHex: string;
  ratio: number;
  scoreAA: boolean;
  scoreAAA: boolean;
  scoreLargeAA: boolean;
  suggestedFix?: string;
}

export interface ExtractionResult {
  keyColors: KeyColor[];
}

export interface HarmonyResult {
  derivedColors: DerivedColor[];
}

export interface WcagResult {
  pairs: WcagPair[];
}
```

**Step 8: Create `src/plugin/plugin.ts`**

```ts
import type { UiToSandboxMessage } from "@common/messages";

figma.showUI(__html__, { width: 400, height: 700, themeColors: true });

figma.ui.onmessage = async (msg: UiToSandboxMessage) => {
  switch (msg.type) {
    case "select-layer":
      // TODO: implement layer selection
      break;
    default:
      console.log("Unknown message type:", msg.type);
  }
};
```

**Step 9: Create `src/ui/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ChromaExtract</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**Step 10: Create `src/ui/main.tsx`**

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
```

**Step 11: Create `src/ui/App.tsx`**

```tsx
import React from "react";

export default function App() {
  return (
    <div className="app">
      <h1>ChromaExtract</h1>
      <p>Plugin loaded.</p>
    </div>
  );
}
```

**Step 12: Create `src/ui/App.css`**

```css
.app {
  font-family: Inter, system-ui, sans-serif;
  padding: 12px;
  color: var(--figma-color-text, #333);
  background: var(--figma-color-bg, #fff);
}

h1 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}
```

**Step 13: Add build scripts to `package.json`**

Add to scripts section:
```json
{
  "scripts": {
    "dev": "concurrently \"vite build --config vite.config.plugin.ts --watch\" \"vite build --config vite.config.ui.ts --watch\"",
    "build": "vite build --config vite.config.plugin.ts && vite build --config vite.config.ui.ts"
  }
}
```

**Step 14: Build and verify**

```bash
npm run build
```

Expected: `dist/` contains `plugin.js`, `index.html`, `manifest.json`. No errors.

**Step 15: Commit**

```bash
git add -A && git commit -m "feat: scaffold Figma plugin with React + Vite + TypeScript"
```

---

## Task 2: Color Conversion Utilities

**Files:**
- Create: `src/plugin/color-utils.ts`
- Create: `src/plugin/__tests__/color-utils.test.ts`

**Step 1: Install test runner**

```bash
npm install --save-dev vitest
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`

**Step 2: Write failing tests for color-utils**

```ts
// src/plugin/__tests__/color-utils.test.ts
import { describe, it, expect } from "vitest";
import {
  rgbaPixelToLab,
  labToHex,
  labToLch,
  lchToLab,
  lchToHex,
  hexToLab,
  labToRgb01,
  contrastRatio,
  wcagScore,
} from "../color-utils";

describe("rgbaPixelToLab", () => {
  it("converts black pixel to near-zero L", () => {
    const lab = rgbaPixelToLab(0, 0, 0);
    expect(lab[0]).toBeCloseTo(0, 0);
  });
  it("converts white pixel to near-100 L", () => {
    const lab = rgbaPixelToLab(255, 255, 255);
    expect(lab[0]).toBeCloseTo(100, 0);
  });
  it("converts red pixel", () => {
    const lab = rgbaPixelToLab(255, 0, 0);
    expect(lab[0]).toBeGreaterThan(50);
    expect(lab[1]).toBeGreaterThan(0); // positive a = red
  });
});

describe("labToHex", () => {
  it("converts black lab to #000000", () => {
    expect(labToHex([0, 0, 0])).toBe("#000000");
  });
  it("converts white lab to #ffffff", () => {
    expect(labToHex([100, 0, 0])).toBe("#ffffff");
  });
});

describe("labToLch / lchToLab round-trip", () => {
  it("round-trips through LCH", () => {
    const lab: [number, number, number] = [50, 30, -20];
    const lch = labToLch(lab);
    const back = lchToLab(lch);
    expect(back[0]).toBeCloseTo(lab[0], 1);
    expect(back[1]).toBeCloseTo(lab[1], 1);
    expect(back[2]).toBeCloseTo(lab[2], 1);
  });
});

describe("contrastRatio", () => {
  it("black vs white = 21", () => {
    const ratio = contrastRatio("#000000", "#ffffff");
    expect(ratio).toBeCloseTo(21, 0);
  });
  it("same color = 1", () => {
    const ratio = contrastRatio("#ff0000", "#ff0000");
    expect(ratio).toBeCloseTo(1, 0);
  });
});

describe("wcagScore", () => {
  it("21:1 = AAA", () => {
    expect(wcagScore(21)).toBe("AAA");
  });
  it("4.5:1 = AA", () => {
    expect(wcagScore(4.5)).toBe("AA");
  });
  it("3.0:1 = AA Large", () => {
    expect(wcagScore(3.0)).toBe("AA Large");
  });
  it("2.0:1 = Fail", () => {
    expect(wcagScore(2.0)).toBe("Fail");
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
npx vitest run src/plugin/__tests__/color-utils.test.ts
```

Expected: FAIL — module not found.

**Step 4: Implement `src/plugin/color-utils.ts`**

```ts
import { converter, formatHex, differenceCiede2000, clampChroma } from "culori";
import { hex as wcagHex, score } from "wcag-contrast";

const toRgb = converter("rgb");
const toLab = converter("lab");
const toLch = converter("lch");

/** Convert 0-255 RGBA pixel to CIELAB [L, a, b] */
export function rgbaPixelToLab(r: number, g: number, b: number): [number, number, number] {
  const lab = toLab({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 });
  return [lab!.l, lab!.a, lab!.b];
}

/** CIELAB → hex string */
export function labToHex(lab: [number, number, number]): string {
  return formatHex({ mode: "lab", l: lab[0], a: lab[1], b: lab[2] })!;
}

/** CIELAB → LCH */
export function labToLch(lab: [number, number, number]): [number, number, number] {
  const lch = toLch({ mode: "lab", l: lab[0], a: lab[1], b: lab[2] });
  return [lch!.l, lch!.c, lch!.h ?? 0];
}

/** LCH → CIELAB */
export function lchToLab(lch: [number, number, number]): [number, number, number] {
  const lab = toLab({ mode: "lch", l: lch[0], c: lch[1], h: lch[2] });
  return [lab!.l, lab!.a, lab!.b];
}

/** LCH → hex (with gamut clamping) */
export function lchToHex(lch: [number, number, number]): string {
  const clamped = clampChroma({ mode: "lch", l: lch[0], c: lch[1], h: lch[2] }, "lch");
  return formatHex(clamped)!;
}

/** Hex → CIELAB */
export function hexToLab(hex: string): [number, number, number] {
  const lab = toLab(hex);
  return [lab!.l, lab!.a, lab!.b];
}

/** CIELAB → RGB [0..1, 0..1, 0..1] */
export function labToRgb01(lab: [number, number, number]): [number, number, number] {
  const rgb = toRgb({ mode: "lab", l: lab[0], a: lab[1], b: lab[2] });
  return [
    Math.max(0, Math.min(1, rgb!.r)),
    Math.max(0, Math.min(1, rgb!.g)),
    Math.max(0, Math.min(1, rgb!.b)),
  ];
}

/** Hex → RGB [0..1] */
export function hexToRgb01(hex: string): [number, number, number] {
  const rgb = toRgb(hex);
  return [rgb!.r, rgb!.g, rgb!.b];
}

/** Hex → HSL [h, s%, l%] */
export function hexToHsl(hex: string): [number, number, number] {
  const hsl = converter("hsl")(hex);
  return [hsl!.h ?? 0, (hsl!.s ?? 0) * 100, (hsl!.l ?? 0) * 100];
}

/** Delta-E 2000 between two LAB colors */
const _deltaE = differenceCiede2000();
export function deltaE2000(a: [number, number, number], b: [number, number, number]): number {
  return _deltaE(
    { mode: "lab", l: a[0], a: a[1], b: a[2] },
    { mode: "lab", l: b[0], a: b[1], b: b[2] }
  );
}

/** WCAG contrast ratio between two hex colors */
export function contrastRatio(hexA: string, hexB: string): number {
  return wcagHex(hexA, hexB);
}

/** WCAG score string for a contrast ratio */
export function wcagScore(ratio: number): "AAA" | "AA" | "AA Large" | "Fail" {
  return score(ratio) as "AAA" | "AA" | "AA Large" | "Fail";
}
```

**Step 5: Run tests to verify they pass**

```bash
npx vitest run src/plugin/__tests__/color-utils.test.ts
```

Expected: All PASS.

**Step 6: Commit**

```bash
git add src/plugin/color-utils.ts src/plugin/__tests__/color-utils.test.ts vitest.config.ts package.json
git commit -m "feat: add color conversion utilities with tests"
```

---

## Task 3: Image Pixel Extraction

**Files:**
- Create: `src/plugin/image-decoder.ts`
- Create: `src/plugin/__tests__/image-decoder.test.ts`

**Step 1: Write failing tests**

```ts
// src/plugin/__tests__/image-decoder.test.ts
import { describe, it, expect } from "vitest";
import { downsamplePixels, pixelsToLabArray } from "../image-decoder";

describe("downsamplePixels", () => {
  it("passes through small images unchanged", () => {
    const pixels = new Uint8Array(4 * 4 * 4); // 4x4 RGBA
    const result = downsamplePixels(pixels, 4, 4, 512);
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it("downsamples large images to max dimension", () => {
    const w = 1024, h = 768;
    const pixels = new Uint8Array(w * h * 4);
    const result = downsamplePixels(pixels, w, h, 512);
    expect(result.width).toBeLessThanOrEqual(512);
    expect(result.height).toBeLessThanOrEqual(512);
    expect(result.pixels.length).toBe(result.width * result.height * 4);
  });
});

describe("pixelsToLabArray", () => {
  it("converts RGBA pixels to LAB array", () => {
    // 2 pixels: black and white
    const pixels = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]);
    const labs = pixelsToLabArray(pixels, 2, 1);
    expect(labs.length).toBe(2);
    expect(labs[0][0]).toBeCloseTo(0, 0); // black L ≈ 0
    expect(labs[1][0]).toBeCloseTo(100, 0); // white L ≈ 100
  });

  it("skips fully transparent pixels", () => {
    const pixels = new Uint8Array([255, 0, 0, 0, 0, 0, 255, 255]); // transparent red, opaque blue
    const labs = pixelsToLabArray(pixels, 2, 1);
    expect(labs.length).toBe(1); // only blue
  });
});
```

**Step 2: Run tests to verify failure**

```bash
npx vitest run src/plugin/__tests__/image-decoder.test.ts
```

**Step 3: Implement `src/plugin/image-decoder.ts`**

```ts
import { rgbaPixelToLab } from "./color-utils";

export interface PixelData {
  width: number;
  height: number;
  pixels: Uint8Array;
}

/** Downsample RGBA pixel array using nearest-neighbor to fit within maxDim */
export function downsamplePixels(
  pixels: Uint8Array,
  width: number,
  height: number,
  maxDim: number
): PixelData {
  if (width <= maxDim && height <= maxDim) {
    return { width, height, pixels };
  }
  const scale = maxDim / Math.max(width, height);
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);
  const out = new Uint8Array(newW * newH * 4);

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const srcX = Math.floor(x / scale);
      const srcY = Math.floor(y / scale);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * newW + x) * 4;
      out[dstIdx] = pixels[srcIdx];
      out[dstIdx + 1] = pixels[srcIdx + 1];
      out[dstIdx + 2] = pixels[srcIdx + 2];
      out[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return { width: newW, height: newH, pixels: out };
}

/** Convert RGBA pixel array to array of LAB tuples, skipping transparent pixels */
export function pixelsToLabArray(
  pixels: Uint8Array,
  width: number,
  height: number
): Array<[number, number, number]> {
  const labs: Array<[number, number, number]> = [];
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    if (pixels[idx + 3] < 128) continue; // skip transparent
    labs.push(rgbaPixelToLab(pixels[idx], pixels[idx + 1], pixels[idx + 2]));
  }
  return labs;
}
```

**Step 4: Run tests**

```bash
npx vitest run src/plugin/__tests__/image-decoder.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/plugin/image-decoder.ts src/plugin/__tests__/
git commit -m "feat: add image pixel extraction and downsampling"
```

---

## Task 4: K-Means Extraction

**Files:**
- Create: `src/plugin/extraction/kmeans.ts`
- Create: `src/plugin/extraction/__tests__/kmeans.test.ts`
- Create: `src/plugin/extraction/types.ts`

**Step 1: Create shared extraction types**

```ts
// src/plugin/extraction/types.ts
export interface ExtractionInput {
  labs: Array<[number, number, number]>;
}

export interface ExtractedColor {
  lab: [number, number, number];
  hex: string;
  weight: number;
}

export interface ExtractionOutput {
  colors: ExtractedColor[];
}

export interface ExtractionMethod {
  name: string;
  extract(input: ExtractionInput, params: Record<string, number>): ExtractionOutput;
}
```

**Step 2: Write failing tests**

```ts
// src/plugin/extraction/__tests__/kmeans.test.ts
import { describe, it, expect } from "vitest";
import { kmeansExtract } from "../kmeans";

describe("kmeansExtract", () => {
  it("returns K colors from uniform input", () => {
    // 100 pixels of the same red-ish LAB color
    const labs: Array<[number, number, number]> = Array(100).fill([53, 80, 67]);
    const result = kmeansExtract({ labs }, { k: 3 });
    expect(result.colors.length).toBeLessThanOrEqual(3);
    expect(result.colors.length).toBeGreaterThanOrEqual(1);
  });

  it("finds two clusters in bimodal data", () => {
    const black = Array(50).fill([0, 0, 0]) as Array<[number, number, number]>;
    const white = Array(50).fill([100, 0, 0]) as Array<[number, number, number]>;
    const result = kmeansExtract({ labs: [...black, ...white] }, { k: 2 });
    expect(result.colors.length).toBe(2);
    // One cluster near L=0, one near L=100
    const ls = result.colors.map((c) => c.lab[0]).sort((a, b) => a - b);
    expect(ls[0]).toBeLessThan(10);
    expect(ls[1]).toBeGreaterThan(90);
  });

  it("assigns weights that sum to 1", () => {
    const labs: Array<[number, number, number]> = [
      ...Array(70).fill([50, 30, -20]),
      ...Array(30).fill([80, -10, 40]),
    ];
    const result = kmeansExtract({ labs }, { k: 2 });
    const totalWeight = result.colors.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 2);
  });

  it("each color has a valid hex string", () => {
    const labs: Array<[number, number, number]> = Array(20).fill([50, 0, 0]);
    const result = kmeansExtract({ labs }, { k: 2 });
    for (const c of result.colors) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
```

**Step 3: Run tests to verify failure**

```bash
npx vitest run src/plugin/extraction/__tests__/kmeans.test.ts
```

**Step 4: Implement K-Means**

```ts
// src/plugin/extraction/kmeans.ts
import type { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex } from "../color-utils";

const MAX_ITERATIONS = 20;

export function kmeansExtract(
  input: ExtractionInput,
  params: { k: number }
): ExtractionOutput {
  const { labs } = input;
  const k = Math.min(params.k, labs.length);
  if (labs.length === 0) return { colors: [] };

  // K-means++ initialization
  let centroids = initCentroids(labs, k);
  let assignments = new Int32Array(labs.length);

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Assign each point to nearest centroid
    let changed = false;
    for (let i = 0; i < labs.length; i++) {
      const nearest = findNearest(labs[i], centroids);
      if (nearest !== assignments[i]) {
        assignments[i] = nearest;
        changed = true;
      }
    }
    if (!changed) break;

    // Recompute centroids
    centroids = recomputeCentroids(labs, assignments, k, centroids);
  }

  // Compute weights
  const counts = new Float64Array(k);
  for (let i = 0; i < labs.length; i++) {
    counts[assignments[i]]++;
  }

  const colors = centroids
    .map((c, i) => ({
      lab: c as [number, number, number],
      hex: labToHex(c as [number, number, number]),
      weight: counts[i] / labs.length,
    }))
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  return { colors };
}

function initCentroids(
  labs: Array<[number, number, number]>,
  k: number
): Array<[number, number, number]> {
  const centroids: Array<[number, number, number]> = [];
  // Pick first centroid randomly
  centroids.push([...labs[Math.floor(Math.random() * labs.length)]]);

  for (let c = 1; c < k; c++) {
    // Weight by squared distance to nearest existing centroid
    const dists = labs.map((p) => {
      let minD = Infinity;
      for (const cent of centroids) {
        const d = labDist2(p, cent);
        if (d < minD) minD = d;
      }
      return minD;
    });
    const totalDist = dists.reduce((s, d) => s + d, 0);
    if (totalDist === 0) break;

    let r = Math.random() * totalDist;
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i];
      if (r <= 0) {
        centroids.push([...labs[i]]);
        break;
      }
    }
  }
  return centroids;
}

function findNearest(point: [number, number, number], centroids: Array<[number, number, number]>): number {
  let minD = Infinity;
  let minI = 0;
  for (let i = 0; i < centroids.length; i++) {
    const d = labDist2(point, centroids[i]);
    if (d < minD) {
      minD = d;
      minI = i;
    }
  }
  return minI;
}

function recomputeCentroids(
  labs: Array<[number, number, number]>,
  assignments: Int32Array,
  k: number,
  oldCentroids: Array<[number, number, number]>
): Array<[number, number, number]> {
  const sums = Array.from({ length: k }, () => [0, 0, 0]);
  const counts = new Float64Array(k);

  for (let i = 0; i < labs.length; i++) {
    const c = assignments[i];
    sums[c][0] += labs[i][0];
    sums[c][1] += labs[i][1];
    sums[c][2] += labs[i][2];
    counts[c]++;
  }

  return sums.map((s, i) =>
    counts[i] > 0
      ? [s[0] / counts[i], s[1] / counts[i], s[2] / counts[i]] as [number, number, number]
      : oldCentroids[i]
  );
}

function labDist2(a: [number, number, number], b: [number, number, number]): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dl * dl + da * da + db * db;
}
```

**Step 5: Run tests**

```bash
npx vitest run src/plugin/extraction/__tests__/kmeans.test.ts
```

Expected: All PASS.

**Step 6: Commit**

```bash
git add src/plugin/extraction/
git commit -m "feat: add K-Means extraction method"
```

---

## Task 5: Median Cut Extraction

**Files:**
- Create: `src/plugin/extraction/mediancut.ts`
- Create: `src/plugin/extraction/__tests__/mediancut.test.ts`

**Step 1: Write failing tests**

```ts
// src/plugin/extraction/__tests__/mediancut.test.ts
import { describe, it, expect } from "vitest";
import { medianCutExtract } from "../mediancut";

describe("medianCutExtract", () => {
  it("returns 2^depth colors", () => {
    const labs: Array<[number, number, number]> = [];
    for (let i = 0; i < 200; i++) {
      labs.push([Math.random() * 100, Math.random() * 200 - 100, Math.random() * 200 - 100]);
    }
    const result = medianCutExtract({ labs }, { depth: 3 });
    expect(result.colors.length).toBeLessThanOrEqual(8); // 2^3
    expect(result.colors.length).toBeGreaterThan(0);
  });

  it("weights sum to 1", () => {
    const labs: Array<[number, number, number]> = Array.from({ length: 100 }, (_, i) => [
      i, i % 50, -(i % 50),
    ]);
    const result = medianCutExtract({ labs }, { depth: 2 });
    const total = result.colors.reduce((s, c) => s + c.weight, 0);
    expect(total).toBeCloseTo(1, 2);
  });
});
```

**Step 2: Run tests to verify failure**

```bash
npx vitest run src/plugin/extraction/__tests__/mediancut.test.ts
```

**Step 3: Implement**

```ts
// src/plugin/extraction/mediancut.ts
import type { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex } from "../color-utils";

export function medianCutExtract(
  input: ExtractionInput,
  params: { depth: number }
): ExtractionOutput {
  const { labs } = input;
  if (labs.length === 0) return { colors: [] };

  let buckets: Array<Array<[number, number, number]>> = [labs];

  for (let d = 0; d < params.depth; d++) {
    const newBuckets: Array<Array<[number, number, number]>> = [];
    for (const bucket of buckets) {
      if (bucket.length <= 1) {
        newBuckets.push(bucket);
        continue;
      }
      // Find channel with greatest range
      const ranges = [0, 1, 2].map((ch) => {
        const vals = bucket.map((c) => c[ch]);
        return Math.max(...vals) - Math.min(...vals);
      });
      const splitCh = ranges.indexOf(Math.max(...ranges));

      // Sort by that channel and split at median
      const sorted = [...bucket].sort((a, b) => a[splitCh] - b[splitCh]);
      const mid = Math.floor(sorted.length / 2);
      newBuckets.push(sorted.slice(0, mid));
      newBuckets.push(sorted.slice(mid));
    }
    buckets = newBuckets;
  }

  const total = labs.length;
  const colors = buckets
    .filter((b) => b.length > 0)
    .map((bucket) => {
      const avg: [number, number, number] = [0, 0, 0];
      for (const c of bucket) {
        avg[0] += c[0];
        avg[1] += c[1];
        avg[2] += c[2];
      }
      avg[0] /= bucket.length;
      avg[1] /= bucket.length;
      avg[2] /= bucket.length;
      return {
        lab: avg,
        hex: labToHex(avg),
        weight: bucket.length / total,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  return { colors };
}
```

**Step 4: Run tests, then commit**

```bash
npx vitest run src/plugin/extraction/__tests__/mediancut.test.ts
git add src/plugin/extraction/mediancut.ts src/plugin/extraction/__tests__/mediancut.test.ts
git commit -m "feat: add Median Cut extraction method"
```

---

## Task 6: Octree Extraction

**Files:**
- Create: `src/plugin/extraction/octree.ts`
- Create: `src/plugin/extraction/__tests__/octree.test.ts`

**Step 1: Write failing tests**

```ts
// src/plugin/extraction/__tests__/octree.test.ts
import { describe, it, expect } from "vitest";
import { octreeExtract } from "../octree";

describe("octreeExtract", () => {
  it("returns at most maxColors colors", () => {
    const labs: Array<[number, number, number]> = Array.from({ length: 500 }, () => [
      Math.random() * 100, Math.random() * 200 - 100, Math.random() * 200 - 100,
    ]);
    const result = octreeExtract({ labs }, { maxColors: 16 });
    expect(result.colors.length).toBeLessThanOrEqual(16);
    expect(result.colors.length).toBeGreaterThan(0);
  });

  it("weights sum to 1", () => {
    const labs: Array<[number, number, number]> = Array.from({ length: 100 }, () => [50, 0, 0]);
    const result = octreeExtract({ labs }, { maxColors: 8 });
    const total = result.colors.reduce((s, c) => s + c.weight, 0);
    expect(total).toBeCloseTo(1, 2);
  });
});
```

**Step 2: Implement `src/plugin/extraction/octree.ts`**

Uses a simplified octree that quantizes LAB values into a grid, merging the least-populated cells until maxColors is reached.

```ts
// src/plugin/extraction/octree.ts
import type { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex } from "../color-utils";

interface OctreeNode {
  sum: [number, number, number];
  count: number;
  children: (OctreeNode | null)[];
  level: number;
  isLeaf: boolean;
}

export function octreeExtract(
  input: ExtractionInput,
  params: { maxColors: number }
): ExtractionOutput {
  const { labs } = input;
  if (labs.length === 0) return { colors: [] };

  // Simplified approach: quantize LAB into buckets, then merge smallest
  const bucketSize = 10;
  const bucketMap = new Map<string, { sum: [number, number, number]; count: number }>();

  for (const lab of labs) {
    const key = [
      Math.floor(lab[0] / bucketSize),
      Math.floor((lab[1] + 128) / bucketSize),
      Math.floor((lab[2] + 128) / bucketSize),
    ].join(",");

    const existing = bucketMap.get(key);
    if (existing) {
      existing.sum[0] += lab[0];
      existing.sum[1] += lab[1];
      existing.sum[2] += lab[2];
      existing.count++;
    } else {
      bucketMap.set(key, { sum: [...lab], count: 1 });
    }
  }

  // Convert to array and sort by count descending
  let buckets = Array.from(bucketMap.values())
    .map((b) => ({
      lab: [b.sum[0] / b.count, b.sum[1] / b.count, b.sum[2] / b.count] as [number, number, number],
      count: b.count,
    }))
    .sort((a, b) => b.count - a.count);

  // Trim to maxColors — merge smallest into nearest neighbor
  while (buckets.length > params.maxColors) {
    // Find smallest bucket
    const smallest = buckets[buckets.length - 1];
    buckets.pop();

    // Find nearest remaining bucket
    let minDist = Infinity;
    let minIdx = 0;
    for (let i = 0; i < buckets.length; i++) {
      const d = labDist2(smallest.lab, buckets[i].lab);
      if (d < minDist) {
        minDist = d;
        minIdx = i;
      }
    }

    // Merge
    const target = buckets[minIdx];
    const totalCount = target.count + smallest.count;
    target.lab = [
      (target.lab[0] * target.count + smallest.lab[0] * smallest.count) / totalCount,
      (target.lab[1] * target.count + smallest.lab[1] * smallest.count) / totalCount,
      (target.lab[2] * target.count + smallest.lab[2] * smallest.count) / totalCount,
    ];
    target.count = totalCount;

    // Re-sort
    buckets.sort((a, b) => b.count - a.count);
  }

  const total = labs.length;
  return {
    colors: buckets.map((b) => ({
      lab: b.lab,
      hex: labToHex(b.lab),
      weight: b.count / total,
    })),
  };
}

function labDist2(a: [number, number, number], b: [number, number, number]): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dl * dl + da * da + db * db;
}
```

**Step 3: Run tests, then commit**

```bash
npx vitest run src/plugin/extraction/__tests__/octree.test.ts
git add src/plugin/extraction/octree.ts src/plugin/extraction/__tests__/octree.test.ts
git commit -m "feat: add Octree extraction method"
```

---

## Task 7: HashMap Frequency Extraction

**Files:**
- Create: `src/plugin/extraction/hashmap.ts`
- Create: `src/plugin/extraction/__tests__/hashmap.test.ts`

**Step 1: Write failing tests**

```ts
// src/plugin/extraction/__tests__/hashmap.test.ts
import { describe, it, expect } from "vitest";
import { hashmapExtract } from "../hashmap";

describe("hashmapExtract", () => {
  it("returns top-N most frequent bucket colors", () => {
    const labs: Array<[number, number, number]> = [
      ...Array(80).fill([50, 30, -20]),
      ...Array(20).fill([80, -10, 40]),
    ];
    const result = hashmapExtract({ labs }, { bucketSize: 8, topN: 2 });
    expect(result.colors.length).toBeLessThanOrEqual(2);
    expect(result.colors[0].weight).toBeGreaterThan(result.colors[1]?.weight ?? 0);
  });

  it("weights sum to 1", () => {
    const labs: Array<[number, number, number]> = Array.from({ length: 100 }, (_, i) => [
      i % 50, 0, 0,
    ]);
    const result = hashmapExtract({ labs }, { bucketSize: 10, topN: 10 });
    const total = result.colors.reduce((s, c) => s + c.weight, 0);
    expect(total).toBeCloseTo(1, 2);
  });
});
```

**Step 2: Implement**

```ts
// src/plugin/extraction/hashmap.ts
import type { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex } from "../color-utils";

export function hashmapExtract(
  input: ExtractionInput,
  params: { bucketSize: number; topN: number }
): ExtractionOutput {
  const { labs } = input;
  if (labs.length === 0) return { colors: [] };

  const { bucketSize, topN } = params;
  const map = new Map<string, { sum: [number, number, number]; count: number }>();

  for (const lab of labs) {
    const key = [
      Math.floor(lab[0] / bucketSize),
      Math.floor((lab[1] + 128) / bucketSize),
      Math.floor((lab[2] + 128) / bucketSize),
    ].join(",");

    const existing = map.get(key);
    if (existing) {
      existing.sum[0] += lab[0];
      existing.sum[1] += lab[1];
      existing.sum[2] += lab[2];
      existing.count++;
    } else {
      map.set(key, { sum: [...lab], count: 1 });
    }
  }

  const total = labs.length;
  const colors = Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map((b) => ({
      lab: [b.sum[0] / b.count, b.sum[1] / b.count, b.sum[2] / b.count] as [number, number, number],
      hex: labToHex([b.sum[0] / b.count, b.sum[1] / b.count, b.sum[2] / b.count]),
      weight: b.count / total,
    }));

  return { colors };
}
```

**Step 3: Run tests, commit**

```bash
npx vitest run src/plugin/extraction/__tests__/hashmap.test.ts
git add src/plugin/extraction/hashmap.ts src/plugin/extraction/__tests__/hashmap.test.ts
git commit -m "feat: add HashMap frequency extraction method"
```

---

## Task 8: Delta-E Perceptual Extraction

**Files:**
- Create: `src/plugin/extraction/deltae.ts`
- Create: `src/plugin/extraction/__tests__/deltae.test.ts`

**Step 1: Write failing tests**

```ts
// src/plugin/extraction/__tests__/deltae.test.ts
import { describe, it, expect } from "vitest";
import { deltaEExtract } from "../deltae";

describe("deltaEExtract", () => {
  it("returns only perceptually distinct colors", () => {
    // Many similar reds + one distinct blue
    const labs: Array<[number, number, number]> = [
      ...Array(50).fill([53, 80, 67]),
      ...Array(50).fill([32, 79, -108]),
    ];
    const result = deltaEExtract({ labs }, { threshold: 10 });
    expect(result.colors.length).toBe(2);
  });

  it("returns single color for uniform input", () => {
    const labs: Array<[number, number, number]> = Array(100).fill([50, 0, 0]);
    const result = deltaEExtract({ labs }, { threshold: 10 });
    expect(result.colors.length).toBe(1);
  });
});
```

**Step 2: Implement**

```ts
// src/plugin/extraction/deltae.ts
import type { ExtractionInput, ExtractionOutput } from "./types";
import { labToHex, deltaE2000 } from "../color-utils";

export function deltaEExtract(
  input: ExtractionInput,
  params: { threshold: number }
): ExtractionOutput {
  const { labs } = input;
  if (labs.length === 0) return { colors: [] };

  // Sort by frequency first — bucket similar colors
  const bucketSize = 5;
  const map = new Map<string, { sum: [number, number, number]; count: number }>();
  for (const lab of labs) {
    const key = [
      Math.floor(lab[0] / bucketSize),
      Math.floor((lab[1] + 128) / bucketSize),
      Math.floor((lab[2] + 128) / bucketSize),
    ].join(",");
    const existing = map.get(key);
    if (existing) {
      existing.sum[0] += lab[0];
      existing.sum[1] += lab[1];
      existing.sum[2] += lab[2];
      existing.count++;
    } else {
      map.set(key, { sum: [...lab], count: 1 });
    }
  }

  const candidates = Array.from(map.values())
    .map((b) => ({
      lab: [b.sum[0] / b.count, b.sum[1] / b.count, b.sum[2] / b.count] as [number, number, number],
      count: b.count,
    }))
    .sort((a, b) => b.count - a.count);

  const total = labs.length;
  const accepted: Array<{ lab: [number, number, number]; count: number }> = [];

  for (const candidate of candidates) {
    let tooClose = false;
    for (const existing of accepted) {
      if (deltaE2000(candidate.lab, existing.lab) < params.threshold) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      accepted.push(candidate);
    }
  }

  return {
    colors: accepted.map((a) => ({
      lab: a.lab,
      hex: labToHex(a.lab),
      weight: a.count / total,
    })),
  };
}
```

**Step 3: Run tests, commit**

```bash
npx vitest run src/plugin/extraction/__tests__/deltae.test.ts
git add src/plugin/extraction/deltae.ts src/plugin/extraction/__tests__/deltae.test.ts
git commit -m "feat: add Delta-E perceptual extraction method"
```

---

## Task 9: Merge/Dedup Layer + Presets

**Files:**
- Create: `src/plugin/extraction/merge.ts`
- Create: `src/plugin/extraction/presets.ts`
- Create: `src/plugin/extraction/__tests__/merge.test.ts`
- Create: `src/plugin/extraction/index.ts`

**Step 1: Write failing tests**

```ts
// src/plugin/extraction/__tests__/merge.test.ts
import { describe, it, expect } from "vitest";
import { mergeAndDedup } from "../merge";
import type { ExtractedColor } from "../types";

describe("mergeAndDedup", () => {
  it("deduplicates colors within tolerance", () => {
    const colorsA: ExtractedColor[] = [
      { lab: [50, 30, -20], hex: "#000000", weight: 0.5 },
      { lab: [50, 31, -19], hex: "#000001", weight: 0.3 }, // very close to first
    ];
    const colorsB: ExtractedColor[] = [
      { lab: [80, -10, 40], hex: "#ffffff", weight: 0.4 },
    ];
    const result = mergeAndDedup([colorsA, colorsB], { tolerance: 8, maxColors: 10 });
    expect(result.length).toBe(2); // similar colors merged
  });

  it("trims to maxColors", () => {
    const colors: ExtractedColor[] = Array.from({ length: 20 }, (_, i) => ({
      lab: [i * 5, 0, 0] as [number, number, number],
      hex: "#000000",
      weight: 1 / 20,
    }));
    const result = mergeAndDedup([colors], { tolerance: 2, maxColors: 5 });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("tags source methods", () => {
    const colorsA: ExtractedColor[] = [
      { lab: [50, 30, -20], hex: "#000000", weight: 0.5 },
    ];
    // Same color from different method
    const colorsB: ExtractedColor[] = [
      { lab: [50, 30, -20], hex: "#000000", weight: 0.5 },
    ];
    const result = mergeAndDedup(
      [colorsA, colorsB],
      { tolerance: 8, maxColors: 10 },
      ["kmeans", "deltae"]
    );
    expect(result[0].sourceMethods).toContain("kmeans");
    expect(result[0].sourceMethods).toContain("deltae");
  });
});
```

**Step 2: Implement merge + presets + index**

```ts
// src/plugin/extraction/merge.ts
import { deltaE2000, labToHex, labToLch, hexToHsl, labToRgb01 } from "../color-utils";
import type { ExtractedColor } from "./types";
import type { ExtractionMethod as MethodName, ColorSwatch } from "@common/messages";

export interface MergedColor {
  lab: [number, number, number];
  lch: [number, number, number];
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  weight: number;
  sourceMethods: MethodName[];
}

export function mergeAndDedup(
  colorSets: ExtractedColor[][],
  params: { tolerance: number; maxColors: number },
  methodNames?: MethodName[]
): MergedColor[] {
  // Pool all candidates with source tags
  const pool: Array<ExtractedColor & { sources: MethodName[] }> = [];
  colorSets.forEach((set, i) => {
    const name = methodNames?.[i] ?? ("unknown" as MethodName);
    for (const c of set) {
      pool.push({ ...c, sources: [name] });
    }
  });

  // Sort by weight descending
  pool.sort((a, b) => b.weight - a.weight);

  // Deduplicate
  const accepted: Array<ExtractedColor & { sources: MethodName[] }> = [];
  for (const candidate of pool) {
    let merged = false;
    for (const existing of accepted) {
      if (deltaE2000(candidate.lab, existing.lab) < params.tolerance) {
        // Merge: keep higher-weight color, combine source tags
        for (const s of candidate.sources) {
          if (!existing.sources.includes(s)) existing.sources.push(s);
        }
        merged = true;
        break;
      }
    }
    if (!merged) {
      accepted.push({ ...candidate });
    }
  }

  // Trim and convert to full swatch format
  return accepted.slice(0, params.maxColors).map((c) => ({
    lab: c.lab,
    lch: labToLch(c.lab),
    hex: labToHex(c.lab),
    rgb: labToRgb01(c.lab),
    hsl: hexToHsl(labToHex(c.lab)),
    weight: c.weight,
    sourceMethods: c.sources,
  }));
}
```

```ts
// src/plugin/extraction/presets.ts
import type { ExtractionMethod, PresetName } from "@common/messages";

export interface PresetConfig {
  name: PresetName;
  label: string;
  methods: Record<ExtractionMethod, boolean>;
  params: Record<ExtractionMethod, Record<string, number>>;
  mergeTolerance: number;
}

export const PRESETS: Record<PresetName, PresetConfig> = {
  photographic: {
    name: "photographic",
    label: "Photographic",
    methods: { kmeans: true, mediancut: false, octree: false, hashmap: false, deltae: true },
    params: {
      kmeans: { k: 10 },
      mediancut: { depth: 4 },
      octree: { maxColors: 32 },
      hashmap: { bucketSize: 8, topN: 16 },
      deltae: { threshold: 12 },
    },
    mergeTolerance: 8,
  },
  graphic: {
    name: "graphic",
    label: "Graphic / Flat",
    methods: { kmeans: false, mediancut: true, octree: false, hashmap: true, deltae: false },
    params: {
      kmeans: { k: 8 },
      mediancut: { depth: 5 },
      octree: { maxColors: 32 },
      hashmap: { bucketSize: 4, topN: 16 },
      deltae: { threshold: 10 },
    },
    mergeTolerance: 8,
  },
  "high-fidelity": {
    name: "high-fidelity",
    label: "High Fidelity",
    methods: { kmeans: true, mediancut: true, octree: true, hashmap: true, deltae: true },
    params: {
      kmeans: { k: 10 },
      mediancut: { depth: 4 },
      octree: { maxColors: 32 },
      hashmap: { bucketSize: 8, topN: 16 },
      deltae: { threshold: 10 },
    },
    mergeTolerance: 5,
  },
  custom: {
    name: "custom",
    label: "Custom",
    methods: { kmeans: true, mediancut: false, octree: false, hashmap: false, deltae: false },
    params: {
      kmeans: { k: 8 },
      mediancut: { depth: 4 },
      octree: { maxColors: 32 },
      hashmap: { bucketSize: 8, topN: 16 },
      deltae: { threshold: 10 },
    },
    mergeTolerance: 8,
  },
};
```

```ts
// src/plugin/extraction/index.ts
export { kmeansExtract } from "./kmeans";
export { medianCutExtract } from "./mediancut";
export { octreeExtract } from "./octree";
export { hashmapExtract } from "./hashmap";
export { deltaEExtract } from "./deltae";
export { mergeAndDedup } from "./merge";
export { PRESETS } from "./presets";
export type { PresetConfig } from "./presets";
export type { ExtractionInput, ExtractionOutput, ExtractedColor } from "./types";
```

**Step 3: Run tests, commit**

```bash
npx vitest run src/plugin/extraction/__tests__/merge.test.ts
git add src/plugin/extraction/
git commit -m "feat: add merge/dedup layer, presets, and extraction barrel export"
```

---

## Task 10: Harmony Rule Engine

**Files:**
- Create: `src/plugin/harmony/index.ts`
- Create: `src/plugin/harmony/__tests__/harmony.test.ts`

**Step 1: Write failing tests**

```ts
// src/plugin/harmony/__tests__/harmony.test.ts
import { describe, it, expect } from "vitest";
import { computeHarmony } from "../index";

describe("complementary", () => {
  it("rotates hue by 180°", () => {
    const result = computeHarmony([50, 40, 30], "complementary"); // L=50, C=40, H=30
    expect(result.length).toBe(1);
    expect(result[0].lch[2]).toBeCloseTo(210, 0); // 30 + 180
  });
});

describe("split-complementary", () => {
  it("returns 2 colors at 150° and 210° offsets", () => {
    const result = computeHarmony([50, 40, 30], "split-complementary");
    expect(result.length).toBe(2);
    expect(result[0].lch[2]).toBeCloseTo(180, 0); // 30 + 150
    expect(result[1].lch[2]).toBeCloseTo(240, 0); // 30 + 210
  });
});

describe("analogous", () => {
  it("returns 2 colors at ±30°", () => {
    const result = computeHarmony([50, 40, 180], "analogous");
    expect(result.length).toBe(2);
    expect(result[0].lch[2]).toBeCloseTo(150, 0);
    expect(result[1].lch[2]).toBeCloseTo(210, 0);
  });
});

describe("triadic", () => {
  it("returns 2 colors at 120° intervals", () => {
    const result = computeHarmony([50, 40, 0], "triadic");
    expect(result.length).toBe(2);
    expect(result[0].lch[2]).toBeCloseTo(120, 0);
    expect(result[1].lch[2]).toBeCloseTo(240, 0);
  });
});

describe("tetradic", () => {
  it("returns 3 colors at 90° intervals", () => {
    const result = computeHarmony([50, 40, 0], "tetradic");
    expect(result.length).toBe(3);
  });
});

describe("accent", () => {
  it("returns 1 color with maximized lightness delta", () => {
    const result = computeHarmony([20, 40, 30], "accent");
    expect(result.length).toBe(1);
    expect(result[0].lch[0]).toBeGreaterThan(70); // dark input → light accent
  });
});

describe("tints-shades", () => {
  it("returns 10 colors", () => {
    const result = computeHarmony([50, 40, 30], "tints-shades");
    expect(result.length).toBe(10);
    // L values should span from ~5 to ~95
    const ls = result.map((c) => c.lch[0]).sort((a, b) => a - b);
    expect(ls[0]).toBeLessThan(15);
    expect(ls[ls.length - 1]).toBeGreaterThan(85);
  });
});
```

**Step 2: Implement**

```ts
// src/plugin/harmony/index.ts
import type { HarmonyRule } from "@common/messages";
import { lchToHex, lchToLab, labToRgb01, hexToHsl } from "../color-utils";

export interface HarmonyColor {
  lab: [number, number, number];
  lch: [number, number, number];
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  relationship: string;
  rule: HarmonyRule;
}

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function lchToFullColor(l: number, c: number, h: number, relationship: string, rule: HarmonyRule): HarmonyColor {
  const lch: [number, number, number] = [l, c, normalizeHue(h)];
  const hex = lchToHex(lch);
  const lab = lchToLab(lch);
  return {
    lab,
    lch,
    hex,
    rgb: labToRgb01(lab),
    hsl: hexToHsl(hex),
    relationship,
    rule,
  };
}

export function computeHarmony(
  lch: [number, number, number],
  rule: HarmonyRule
): HarmonyColor[] {
  const [l, c, h] = lch;

  switch (rule) {
    case "complementary":
      return [lchToFullColor(l, c, h + 180, "Complementary", rule)];

    case "split-complementary":
      return [
        lchToFullColor(l, c, h + 150, "Split-Comp A", rule),
        lchToFullColor(l, c, h + 210, "Split-Comp B", rule),
      ];

    case "analogous":
      return [
        lchToFullColor(l, c, h - 30, "Analogous A", rule),
        lchToFullColor(l, c, h + 30, "Analogous B", rule),
      ];

    case "triadic":
      return [
        lchToFullColor(l, c, h + 120, "Triadic A", rule),
        lchToFullColor(l, c, h + 240, "Triadic B", rule),
      ];

    case "tetradic":
      return [
        lchToFullColor(l, c, h + 90, "Tetradic A", rule),
        lchToFullColor(l, c, h + 180, "Tetradic B", rule),
        lchToFullColor(l, c, h + 270, "Tetradic C", rule),
      ];

    case "accent":
      const targetL = l < 50 ? Math.min(95, l + 60) : Math.max(5, l - 60);
      return [lchToFullColor(targetL, c, h, "Accent", rule)];

    case "tints-shades":
      return Array.from({ length: 10 }, (_, i) => {
        const stepL = 5 + (90 / 9) * i; // 5, 15, 25, ... 95
        return lchToFullColor(stepL, c, h, `Shade ${(i + 1) * 100}`, rule);
      });

    default:
      return [];
  }
}
```

**Step 3: Run tests, commit**

```bash
npx vitest run src/plugin/harmony/__tests__/harmony.test.ts
git add src/plugin/harmony/
git commit -m "feat: add harmony rule engine with 7 rules"
```

---

## Task 11: WCAG Validator

**Files:**
- Create: `src/plugin/wcag/index.ts`
- Create: `src/plugin/wcag/__tests__/wcag.test.ts`

**Step 1: Write failing tests**

```ts
// src/plugin/wcag/__tests__/wcag.test.ts
import { describe, it, expect } from "vitest";
import { validatePalette, suggestFix } from "../index";

describe("validatePalette", () => {
  it("validates colors against white background", () => {
    const result = validatePalette(["#000000", "#777777", "#ffffff"]);
    // Black on white should pass AAA
    const blackPair = result.find((p) => p.fgHex === "#000000");
    expect(blackPair?.scoreAAA).toBe(true);
    // White on white should fail
    const whitePair = result.find((p) => p.fgHex === "#ffffff");
    expect(whitePair?.scoreAA).toBe(false);
  });
});

describe("suggestFix", () => {
  it("darkens a light failing color to meet AA", () => {
    const fix = suggestFix("#aaaaaa", "#ffffff", 4.5);
    expect(fix).toBeDefined();
    // The fixed color should have higher contrast against white
  });

  it("returns undefined if already passing", () => {
    const fix = suggestFix("#000000", "#ffffff", 4.5);
    expect(fix).toBeUndefined();
  });
});
```

**Step 2: Implement**

```ts
// src/plugin/wcag/index.ts
import { contrastRatio, wcagScore, hexToLab, labToLch, lchToHex } from "../color-utils";

export interface WcagPairResult {
  fgHex: string;
  bgHex: string;
  ratio: number;
  scoreAA: boolean;
  scoreAAA: boolean;
  scoreLargeAA: boolean;
  suggestedFix?: string;
}

export function validatePalette(
  hexColors: string[],
  bgHex: string = "#ffffff"
): WcagPairResult[] {
  return hexColors.map((fgHex) => {
    const ratio = contrastRatio(fgHex, bgHex);
    const result: WcagPairResult = {
      fgHex,
      bgHex,
      ratio: Math.round(ratio * 100) / 100,
      scoreAA: ratio >= 4.5,
      scoreAAA: ratio >= 7,
      scoreLargeAA: ratio >= 3,
    };

    if (!result.scoreAA) {
      result.suggestedFix = suggestFix(fgHex, bgHex, 4.5);
    }

    return result;
  });
}

export function suggestFix(
  fgHex: string,
  bgHex: string,
  targetRatio: number
): string | undefined {
  const currentRatio = contrastRatio(fgHex, bgHex);
  if (currentRatio >= targetRatio) return undefined;

  const lab = hexToLab(fgHex);
  const lch = labToLch(lab);
  const bgLab = hexToLab(bgHex);
  const bgIsLight = bgLab[0] > 50;

  // Binary search for the right lightness
  let lo = bgIsLight ? 0 : lch[0];
  let hi = bgIsLight ? lch[0] : 100;

  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const candidate = lchToHex([mid, lch[1], lch[2]]);
    const ratio = contrastRatio(candidate, bgHex);
    if (ratio >= targetRatio) {
      hi = bgIsLight ? mid : hi;
      lo = bgIsLight ? lo : mid;
    } else {
      lo = bgIsLight ? lo : lo;
      hi = bgIsLight ? hi : hi;
      // Need more contrast → move L further from bg
      if (bgIsLight) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
  }

  const fixedL = bgIsLight ? lo : hi;
  const fixed = lchToHex([fixedL, lch[1], lch[2]]);
  return contrastRatio(fixed, bgHex) >= targetRatio ? fixed : undefined;
}
```

**Step 3: Run tests, commit**

```bash
npx vitest run src/plugin/wcag/__tests__/wcag.test.ts
git add src/plugin/wcag/
git commit -m "feat: add WCAG validator with auto-correct suggestions"
```

---

## Task 12: Output Pipeline — Token Mappers

**Files:**
- Create: `src/plugin/output/types.ts`
- Create: `src/plugin/output/semantic-mapper.ts`
- Create: `src/plugin/output/enumerated-mapper.ts`
- Create: `src/plugin/output/math-report-mapper.ts`
- Create: `src/plugin/output/__tests__/mappers.test.ts`
- Create: `src/plugin/output/index.ts`

This task creates the `PaletteData → TokenMapper` stage. Renderers come in Tasks 13-14.

**Step 1: Define output types**

```ts
// src/plugin/output/types.ts
import type { OutputMode, TokenSchema } from "@common/messages";

export interface PaletteToken {
  name: string;
  hex: string;
  rgb: [number, number, number];
  description: string;
}

export interface MappedOutput {
  mode: OutputMode;
  schema: TokenSchema;
  tokens: PaletteToken[];
  reportData?: ReportData; // only for math-report mode
}

export interface ReportData {
  extractionMethods: string[];
  keyColors: Array<{ hex: string; lch: [number, number, number]; sources: string[] }>;
  harmonyRules: string[];
  wcagPairs: Array<{ fg: string; bg: string; ratio: number; score: string }>;
}

export interface TokenMapper {
  map(palette: PaletteData, schema: TokenSchema, customPrefix?: string): MappedOutput;
}

export interface PaletteData {
  keyColors: Array<{
    hex: string;
    lab: [number, number, number];
    lch: [number, number, number];
    rgb: [number, number, number];
    hsl: [number, number, number];
    sourceMethods: string[];
  }>;
  derivedColors: Array<{
    hex: string;
    lch: [number, number, number];
    parentIndex: number;
    relationship: string;
    rule: string;
  }>;
  wcagPairs: Array<{ fg: string; bg: string; ratio: number; score: string }>;
  activeMethods: string[];
  activeRules: string[];
}
```

**Step 2: Write failing tests**

```ts
// src/plugin/output/__tests__/mappers.test.ts
import { describe, it, expect } from "vitest";
import { SemanticMapper } from "../semantic-mapper";
import { EnumeratedMapper } from "../enumerated-mapper";
import type { PaletteData } from "../types";

const mockPalette: PaletteData = {
  keyColors: [
    { hex: "#3a7bd5", lab: [50, 0, -40], lch: [50, 40, 270], rgb: [0.23, 0.48, 0.84], hsl: [216, 62, 53], sourceMethods: ["kmeans"] },
    { hex: "#d53a3a", lab: [45, 60, 40], lch: [45, 72, 34], rgb: [0.84, 0.23, 0.23], hsl: [0, 62, 53], sourceMethods: ["kmeans"] },
  ],
  derivedColors: [],
  wcagPairs: [],
  activeMethods: ["kmeans"],
  activeRules: [],
};

describe("SemanticMapper", () => {
  it("maps first key color to primary with material schema", () => {
    const mapper = new SemanticMapper();
    const result = mapper.map(mockPalette, "material");
    const primary = result.tokens.find((t) => t.name.includes("primary"));
    expect(primary).toBeDefined();
    expect(primary!.hex).toBe("#3a7bd5");
  });

  it("uses tailwind naming", () => {
    const mapper = new SemanticMapper();
    const result = mapper.map(mockPalette, "tailwind");
    expect(result.tokens[0].name).toContain("colors/");
  });
});

describe("EnumeratedMapper", () => {
  it("generates numbered scale per key color", () => {
    const mapper = new EnumeratedMapper();
    const result = mapper.map(mockPalette, "material");
    const blues = result.tokens.filter((t) => t.name.includes("blue") || t.name.includes("0"));
    expect(blues.length).toBeGreaterThan(0);
  });
});
```

**Step 3: Implement mappers (abbreviated — follow the pattern)**

Create `semantic-mapper.ts`, `enumerated-mapper.ts`, `math-report-mapper.ts` each implementing the `TokenMapper` interface from `types.ts`. The semantic mapper assigns roles (primary, secondary, accent, surface, background, on-surface, on-primary, outline, primary-variant). The enumerated mapper generates 100-900 weight scales. The math report mapper passes through raw data.

**Step 4: Run tests, commit**

```bash
npx vitest run src/plugin/output/__tests__/mappers.test.ts
git add src/plugin/output/
git commit -m "feat: add token mapper pipeline (semantic, enumerated, math-report)"
```

---

## Task 13: Output Renderers — Figma Styles & Variables

**Files:**
- Create: `src/plugin/output/figma-styles-renderer.ts`
- Create: `src/plugin/output/figma-variables-renderer.ts`

These use the Figma Plugin API directly (sandbox only). Testing requires mocking `figma` globals — write integration-style tests that verify the renderer calls the right API methods.

**Step 1: Implement styles renderer**

```ts
// src/plugin/output/figma-styles-renderer.ts
import type { PaletteToken } from "./types";
import { hexToRgb01 } from "../color-utils";

export function renderFigmaStyles(tokens: PaletteToken[], prefix: string = "ChromaExtract"): void {
  const existing = figma.getLocalPaintStyles();

  for (const token of tokens) {
    const fullName = `${prefix}/${token.name}`;
    let style = existing.find((s) => s.name === fullName);

    if (!style) {
      style = figma.createPaintStyle();
      style.name = fullName;
    }

    const [r, g, b] = hexToRgb01(token.hex);
    style.paints = [{ type: "SOLID", color: { r, g, b }, opacity: 1, visible: true }];
    style.description = token.description;
  }
}
```

**Step 2: Implement variables renderer**

```ts
// src/plugin/output/figma-variables-renderer.ts
import type { PaletteToken } from "./types";
import { hexToRgb01 } from "../color-utils";

export function renderFigmaVariables(
  tokens: PaletteToken[],
  collectionName: string = "ChromaExtract Palette"
): void {
  const collection = figma.variables.createVariableCollection(collectionName);
  const modeId = collection.defaultModeId;
  collection.renameMode(modeId, "Light");

  for (const token of tokens) {
    const variable = figma.variables.createVariable(token.name, collection, "COLOR");
    const [r, g, b] = hexToRgb01(token.hex);
    variable.setValueForMode(modeId, { r, g, b });
    variable.description = token.description;
  }
}
```

**Step 3: Commit**

```bash
git add src/plugin/output/figma-styles-renderer.ts src/plugin/output/figma-variables-renderer.ts
git commit -m "feat: add Figma styles and variables output renderers"
```

---

## Task 14: Output Renderers — Canvas Frame & JSON Export

**Files:**
- Create: `src/plugin/output/canvas-renderer.ts`
- Create: `src/plugin/output/json-renderer.ts`

**Step 1: Implement canvas renderer**

Generates an Auto Layout frame on the canvas with labeled swatches. Positions it to the right of existing content.

```ts
// src/plugin/output/canvas-renderer.ts
import type { PaletteToken, MappedOutput, ReportData } from "./types";
import { hexToRgb01 } from "../color-utils";

export function renderCanvasFrame(output: MappedOutput): void {
  if (output.mode === "math-report" && output.reportData) {
    renderMathReport(output.reportData);
    return;
  }

  const frame = figma.createFrame();
  frame.name = `ChromaExtract — ${output.mode === "semantic" ? "Semantic Palette" : "Enumerated Palette"}`;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 16;
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 24;
  frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

  // Position to the right of existing content
  const nodes = figma.currentPage.children;
  let maxX = 0;
  for (const node of nodes) {
    if (node.id !== frame.id) {
      maxX = Math.max(maxX, node.x + node.width);
    }
  }
  frame.x = maxX + 100;
  frame.y = 0;

  // Title
  const title = figma.createText();
  title.characters = frame.name;
  title.fontSize = 24;
  frame.appendChild(title);

  // Swatches
  const swatchRow = figma.createFrame();
  swatchRow.name = "Swatches";
  swatchRow.layoutMode = "HORIZONTAL";
  swatchRow.primaryAxisSizingMode = "AUTO";
  swatchRow.counterAxisSizingMode = "AUTO";
  swatchRow.itemSpacing = 12;
  swatchRow.layoutWrap = "WRAP";
  frame.appendChild(swatchRow);

  for (const token of output.tokens) {
    const swatch = createSwatchNode(token);
    swatchRow.appendChild(swatch);
  }

  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);
}

function createSwatchNode(token: PaletteToken): FrameNode {
  const container = figma.createFrame();
  container.name = token.name;
  container.layoutMode = "VERTICAL";
  container.primaryAxisSizingMode = "AUTO";
  container.counterAxisSizingMode = "AUTO";
  container.itemSpacing = 4;

  const rect = figma.createRectangle();
  rect.name = "Color";
  rect.resize(80, 80);
  rect.cornerRadius = 8;
  const [r, g, b] = hexToRgb01(token.hex);
  rect.fills = [{ type: "SOLID", color: { r, g, b } }];
  container.appendChild(rect);

  const label = figma.createText();
  label.characters = token.hex;
  label.fontSize = 10;
  container.appendChild(label);

  const nameLabel = figma.createText();
  nameLabel.characters = token.name;
  nameLabel.fontSize = 9;
  container.appendChild(nameLabel);

  return container;
}

function renderMathReport(data: ReportData): void {
  const frame = figma.createFrame();
  frame.name = "ChromaExtract — Color Math Report";
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 12;
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 24;
  frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

  const nodes = figma.currentPage.children;
  let maxX = 0;
  for (const node of nodes) {
    if (node.id !== frame.id) maxX = Math.max(maxX, node.x + node.width);
  }
  frame.x = maxX + 100;

  const title = figma.createText();
  title.characters = "Color Math Report";
  title.fontSize = 24;
  frame.appendChild(title);

  const methods = figma.createText();
  methods.characters = `Extraction: ${data.extractionMethods.join(", ")}`;
  methods.fontSize = 12;
  frame.appendChild(methods);

  const rules = figma.createText();
  rules.characters = `Harmony Rules: ${data.harmonyRules.join(", ")}`;
  rules.fontSize = 12;
  frame.appendChild(rules);

  for (const pair of data.wcagPairs) {
    const line = figma.createText();
    line.characters = `${pair.fg} / ${pair.bg}: ${pair.ratio}:1 (${pair.score})`;
    line.fontSize = 10;
    frame.appendChild(line);
  }

  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);
}
```

**Step 2: Implement JSON renderer**

```ts
// src/plugin/output/json-renderer.ts
import type { PaletteToken } from "./types";

export interface W3CDesignToken {
  $type: "color";
  $value: string;
  $description?: string;
}

export function renderJsonTokens(tokens: PaletteToken[]): string {
  const output: Record<string, Record<string, W3CDesignToken>> = {
    color: {},
  };

  for (const token of tokens) {
    output.color[token.name] = {
      $type: "color",
      $value: token.hex,
      ...(token.description ? { $description: token.description } : {}),
    };
  }

  return JSON.stringify(output, null, 2);
}
```

**Step 3: Commit**

```bash
git add src/plugin/output/canvas-renderer.ts src/plugin/output/json-renderer.ts
git commit -m "feat: add canvas frame and JSON export renderers"
```

---

## Task 15: Sandbox Orchestrator

**Files:**
- Modify: `src/plugin/plugin.ts`
- Create: `src/plugin/orchestrator.ts`

Wires together image decoding → extraction → merge → harmony → WCAG → state management. Handles all incoming messages from the UI and dispatches results back.

**Step 1: Create orchestrator**

The orchestrator maintains the canonical plugin state and exposes handler functions for each message type. Full implementation connects all modules built in Tasks 2-14.

**Step 2: Update `plugin.ts`**

Wire `figma.ui.onmessage` to the orchestrator's handler.

**Step 3: Build and verify no errors**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/plugin/
git commit -m "feat: add sandbox orchestrator wiring all modules"
```

---

## Task 16: React UI — Image Source Panel

**Files:**
- Create: `src/ui/components/ImageSource.tsx`
- Create: `src/ui/hooks/usePluginMessages.ts`
- Modify: `src/ui/App.tsx`

Build the image upload and "Use Selection" UI panel. The `usePluginMessages` hook manages the postMessage protocol between UI and sandbox.

**Step 1: Implement message hook and ImageSource component**

**Step 2: Build and verify**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/ui/
git commit -m "feat: add image source panel UI"
```

---

## Task 17: React UI — Extraction Panel

**Files:**
- Create: `src/ui/components/ExtractionPanel.tsx`
- Modify: `src/ui/App.tsx`

Preset dropdown, method checkboxes, key color slider. Sends `toggle-method`, `set-key-count`, `select-preset` messages.

**Step 1: Implement and wire up**

**Step 2: Build, commit**

```bash
git add src/ui/ && git commit -m "feat: add extraction controls panel UI"
```

---

## Task 18: React UI — Key Colors Panel

**Files:**
- Create: `src/ui/components/KeyColorsPanel.tsx`
- Create: `src/ui/components/ColorSwatch.tsx`
- Modify: `src/ui/App.tsx`

Swatch display with HEX/RGB/HSL/LCH values, lock toggles, inline color picker override.

**Step 1: Implement and wire up**

**Step 2: Build, commit**

```bash
git add src/ui/ && git commit -m "feat: add key colors panel with lock and override"
```

---

## Task 19: React UI — Harmony & Preview Panels

**Files:**
- Create: `src/ui/components/HarmonyPanel.tsx`
- Create: `src/ui/components/PalettePreview.tsx`
- Modify: `src/ui/App.tsx`

Harmony rule toggles and the live palette grid with WCAG badges.

**Step 1: Implement and wire up**

**Step 2: Build, commit**

```bash
git add src/ui/ && git commit -m "feat: add harmony rules and palette preview panels"
```

---

## Task 20: React UI — Output Panel

**Files:**
- Create: `src/ui/components/OutputPanel.tsx`
- Modify: `src/ui/App.tsx`

Output mode radio buttons, token schema dropdown, output target checkboxes, Generate button. JSON export triggers a blob download in the iframe.

**Step 1: Implement and wire up**

**Step 2: Build, commit**

```bash
git add src/ui/ && git commit -m "feat: add output panel with mode, schema, and export controls"
```

---

## Task 21: Integration Test & Polish

**Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 2: Build production bundle**

```bash
npm run build
```

**Step 3: Manual smoke test in Figma**

- Load plugin in Figma via manifest.json
- Upload an image → verify extraction runs
- Toggle methods and presets → verify re-extraction
- Toggle harmony rules → verify palette updates
- Check WCAG badges → verify contrast ratios
- Click Generate → verify styles, variables, canvas frame created
- Export JSON → verify file downloads

**Step 4: Final commit**

```bash
git add -A && git commit -m "chore: integration polish and final build"
```
