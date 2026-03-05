# ChromaExtract — Design Document

**Date:** 2026-03-05
**Status:** Approved
**Platform:** Figma Plugin (TypeScript + Figma Plugin API)
**Scope:** Single image, Light mode, WCAG 2.1 compliance

---

## 1. Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target | Real Figma plugin | PRD requirement |
| Architecture | Heavy Sandbox (Approach A) | Simplest data flow; sandbox is single source of truth; direct Figma API access |
| UI Framework | React + Vite | Mature ecosystem, good Figma plugin templates |
| Canvas output | Yes — render palette frame on canvas | In addition to styles/variables |
| JSON export format | W3C Design Tokens only | Aligns with emerging standard |
| Presets | 4 built-in only, not user-saveable | Simpler, no persistence needed |

---

## 2. Architecture

### Dual-Process Model

All interaction occurs within the Figma plugin panel. The sandbox/iframe split is an invisible implementation detail — the user sees one plugin panel inside Figma.

```
┌─────────────────────────────────┐     postMessage      ┌──────────────────────────────┐
│        SANDBOX (main thread)    │◄────────────────────►│       UI IFRAME (React)       │
│                                 │                       │                               │
│  • Figma Plugin API access      │                       │  • User-uploaded image decode  │
│  • Read image fills from layers │                       │    via <canvas> → pixel array  │
│  • All color science:           │                       │  • All UI rendering (React)    │
│    - Extraction algorithms      │                       │  • Color picker overlays       │
│    - Harmony calculations       │                       │  • Swatch grid, badges, toggles│
│    - Delta-E merge/dedup        │                       │  • Image preview               │
│    - WCAG validation            │                       │  • JSON export download trigger │
│  • Create color styles          │                       │                               │
│  • Create variable collections  │                       │                               │
│  • Generate canvas palette frame│                       │                               │
└─────────────────────────────────┘                       └──────────────────────────────┘
```

### Message Protocol

All communication is typed `postMessage` events:

- **UI → Sandbox:** `upload-image` (with pixel data), `select-layer`, `set-key-count`, `toggle-method`, `toggle-harmony`, `lock-color`, `override-color`, `select-preset`, `export-figma`, `export-json`
- **Sandbox → UI:** `extraction-result`, `harmony-result`, `wcag-result`, `export-complete`, `error`

### State Ownership

The sandbox holds the canonical state (current pixel data, extracted colors, derived harmonies, WCAG results). The UI is a stateless view that mirrors what the sandbox sends it, plus local-only UI state (panel open/closed, hover states).

---

## 3. Image Ingestion Pipeline

Two input paths, one output format:

| Source | How it works | Pixel data format |
|--------|-------------|-------------------|
| **Local upload** | `<input type="file">` in UI iframe → decoded via `<canvas>` `getImageData()` → raw `Uint8Array` RGBA sent to sandbox via `postMessage` | `{width, height, pixels: Uint8Array}` |
| **Figma layer** | User selects frame/layer with image fill → sandbox reads via `figma.getImageByHash()` → decodes to pixel array using pure-JS decoder | Same `{width, height, pixels: Uint8Array}` |

**Constraints:**
- One image active at a time — loading new image clears all extraction state
- Accepted formats: JPG, PNG, WebP
- Image preview rendered in plugin panel (thumbnail)
- Large images downsampled to max 512x512 before extraction
- Sandbox image decoding uses `upng-js` (PNG) + lightweight JPEG decoder (no DOM dependency)

---

## 4. Color Extraction Engine

Five extraction methods as independent, pure-function modules.

### Common Interface

```
Input:  { width, height, pixels: Uint8Array, params: MethodParams }
Output: { colors: Array<{ lab: [L,a,b], hex: string, weight: number }> }
```

All color math operates in CIELAB color space (via `culori`).

### Methods

| Method | Tunable Param | Default | Notes |
|--------|--------------|---------|-------|
| K-Means | K (cluster count) | 8 | Iterates in LAB space, max 20 iterations, random++ seeding |
| Median Cut | Depth (subdivisions) | 4 | Recursive median split, returns 2^depth colors |
| Octree | Max colors retained | 32 | Tree-based quantization, prunes least-populated leaves |
| HashMap Frequency | Bucket size / top-N | bucket=8, N=16 | Quantizes each channel by bucket size, counts frequency |
| Delta-E Perceptual | Distance threshold (ΔE) | 10 | Seeds first color, adds next only if ΔE₀₀ > threshold |

### Merge & Dedup Layer

Runs when ≥1 method is active:

1. Pool all candidate colors from all active methods
2. Sort by weight (perceptual salience) descending
3. Walk list — discard if ΔE₀₀ < tolerance (default 8) from any accepted color
4. Trim to user's N key colors
5. Tag each swatch with source method(s)

### Built-in Presets

| Preset | Active Methods | Special Params |
|--------|---------------|----------------|
| Photographic | K-Means + Delta-E | K=10, ΔE threshold=12 |
| Graphic / Flat | HashMap + Median Cut | bucket=4, depth=5 |
| High Fidelity | All five | ΔE merge tolerance=5 |
| Custom | User-defined | All params exposed |

---

## 5. Key Color Selection & Harmony Engine

### Key Color Controls

- Slider + numeric input: N = 2–12
- Each swatch displays: HEX, RGB, HSL, LCH
- Lock toggle per swatch — locked colors survive re-extraction
- Inline color picker — manual override (auto-locks on override)

### Harmony Rules (7, independently toggleable)

All calculations in LCH color space via `culori`.

```
Input:  keyColor: { l, c, h }
Output: Array<{ l, c, h, hex, relationship: string }>
```

| Rule | Calculation | Output per key color |
|------|------------|---------------------|
| Complementary | h + 180° | 1 color |
| Split-Complementary | h + 150°, h + 210° | 2 colors |
| Analogous | h ± 30° | 2 colors |
| Triadic | h + 120°, h + 240° | 2 colors |
| Tetradic / Square | h + 90°, h + 180°, h + 270° | 3 colors |
| Accent / High-Contrast | Maximize L delta in LCH | 1 color |
| Tints & Shades | 10-step L ramp (5→95), C and H fixed | 10 colors |

Palette preview groups derived colors by parent key color.

---

## 6. WCAG Compliance Validation

### Standards

| Standard | Ratio | Applies To |
|----------|-------|------------|
| WCAG 2.1 AA | ≥ 4.5:1 | Normal text |
| WCAG 2.1 AA | ≥ 3:1 | Large text & UI components |
| WCAG 2.1 AAA | ≥ 7:1 | Enhanced contrast |

### Validation

- Each color checked against `#FFFFFF` and against semantic pair partners
- Contrast ratio badge on every swatch
- Green check (AA), gold star (AAA), red warning (fail)
- Failing swatches show measured ratio and failing pair

### Auto-Correct

- Shifts Lightness (L) in LCH space until nearest compliant value found
- Preserves Chroma and Hue
- "Fix" chip on failing swatches — click to apply
- Targets AA by default; nudges to AAA if nearly passing

### Implementation

`wcag-contrast` for ratio calculation, `culori` for LCH adjustments.

---

## 7. Output System — Extensible Architecture

Output is driven by two independent axes: **Output Mode** (what gets generated) and **Token Schema** (how tokens are named).

### Output Modes

| Mode | Description | Produces |
|------|------------|----------|
| **Semantic Tokens** | Maps key colors to design system roles | Styles + Variables + Canvas frame with semantic labels |
| **Enumerated Palette** | Per-hue numbered scale (e.g. `blue-100` → `blue-900`) | Styles + Variables + Canvas frame with numbered swatches |
| **Color Math Report** | Documents extraction methods, harmony relationships, ΔE distances, WCAG ratios, LCH values | Canvas frame only (reference document) |

All modes can optionally export JSON (W3C Design Tokens format).

### Token Schema Presets

| Schema | Pattern | Example |
|--------|---------|---------|
| Material Design | `md/sys/color/{role}` | `md/sys/color/primary` |
| Tailwind | `colors/{hue}/{weight}` | `colors/blue/500` |
| Custom | User-defined prefix + separator | `brand.color.primary` |

### Pipeline Architecture

```
PaletteData → TokenMapper → OutputRenderer(s)
```

1. **PaletteData** — canonical internal format. Array of colors with metadata (source method, harmony relationship, WCAG results, LCH values). Stable regardless of output mode.

2. **TokenMapper** (swappable):
   - `SemanticMapper` — assigns design system roles
   - `EnumeratedMapper` — generates hue-based numbered scales
   - `MathReportMapper` — preserves raw color science data

3. **OutputRenderer(s)** (composable, ≥1 active):
   - `FigmaStylesRenderer` → local color styles
   - `FigmaVariablesRenderer` → variable collection (single collection, Light mode)
   - `CanvasRenderer` → visual frame on canvas (Auto Layout, positioned right of existing content)
   - `JsonExportRenderer` → W3C Design Tokens JSON

Adding a new output mode = write a new TokenMapper. Adding a new export target = write a new OutputRenderer.

### Canvas Frame by Mode

- **Semantic:** Swatches labeled with token names + roles, grouped by semantic category
- **Enumerated:** Hue columns × weight rows (standard palette grid)
- **Math Report:** Structured text — extraction methods, ΔE matrix, harmony angles, WCAG pair table, LCH coordinates

### Semantic Token Mapping

Key colors assigned in priority order: `primary` → `secondary` → `accent` → remaining slots. Harmony-derived colors fill `primary-variant`, `on-primary`, etc. `surface`, `background`, `on-surface` derived from lightest/darkest palette entries.

### Figma Output Details

- **Styles:** Prefixed `ChromaExtract/`. Prompt to overwrite if names exist.
- **Variables:** Collection "ChromaExtract Palette", mode "Light".
- **JSON:** W3C Design Tokens Community Group schema, `color/` namespace, `$type: "color"`, `$value` in HEX.

---

## 8. Plugin UI Layout

Single-panel plugin window, vertically scrolling, collapsible sections:

```
┌──────────────────────────────────┐
│  ChromaExtract                   │
├──────────────────────────────────┤
│  ▼ IMAGE SOURCE                  │
│  [Upload Image] [Use Selection]  │
│  ┌────────────┐                  │
│  │  thumbnail  │                 │
│  └────────────┘                  │
├──────────────────────────────────┤
│  ▼ EXTRACTION                    │
│  Preset: [Photographic ▾]        │
│  ☑ K-Means  ☑ Delta-E           │
│  ☐ Median Cut  ☐ Octree         │
│  ☐ HashMap                       │
│  Key Colors: [——●———] 5          │
├──────────────────────────────────┤
│  ▼ KEY COLORS                    │
│  [■] #3A7BD5  🔓  ✎             │
│  [■] #D53A3A  🔒  ✎             │
│  [■] #4AD53A  🔓  ✎             │
│  ...                             │
├──────────────────────────────────┤
│  ▼ HARMONY RULES                 │
│  ☑ Complementary  ☐ Triadic     │
│  ☑ Analogous  ☐ Tetradic        │
│  ☐ Split-Comp  ☑ Tints/Shades   │
│  ☐ Accent/High-Contrast         │
├──────────────────────────────────┤
│  ▼ PALETTE PREVIEW               │
│  ┌──┬──┬──┬──┬──┬──┬──┐         │
│  │  │  │  │  │  │  │  │  ← grid │
│  └──┴──┴──┴──┴──┴──┴──┘         │
│  Each swatch: hex, WCAG badge    │
│  Grouped by key color            │
├──────────────────────────────────┤
│  ▼ OUTPUT                        │
│  Mode: (•) Semantic Tokens       │
│        ( ) Enumerated Palette    │
│        ( ) Color Math Report     │
│  Schema: [Material Design ▾]     │
│  ☑ Styles ☑ Variables            │
│  ☑ Canvas Frame ☐ JSON Export    │
│  [Generate]                      │
└──────────────────────────────────┘
```

### Interaction Flow

1. Load image → extraction runs automatically with default preset
2. Adjust methods/params/key count → re-extraction runs, locked colors preserved
3. Toggle harmony rules → derived colors update live in palette preview
4. WCAG badges update continuously as palette changes
5. Choose output mode + schema + targets → click Generate

---

## 9. Tech Stack

| Layer | Technology |
|-------|-----------|
| Plugin runtime | TypeScript + Figma Plugin API |
| UI framework | React + Vite |
| Color science | `culori` (LCH, LAB, WCAG) |
| Extraction engine | Custom K-Means, Median Cut, Octree, HashMap, Delta-E in TypeScript |
| Contrast checking | `wcag-contrast` (fixed AA/AAA thresholds) |
| Image decoding (sandbox) | `upng-js` + lightweight JPEG decoder |
| Token export | W3C Design Tokens JSON schema |
| Build tooling | Vite + esbuild + `@figma/plugin-typings` |
