import type {
  UiToSandboxMessage,
  SandboxToUiMessage,
  ExtractionMethod,
  HarmonyRule,
  PresetName,
  KeyColor,
  DerivedColor,
  WcagPair,
  ExportConfig,
} from "@common/messages";

import { downsamplePixels, pixelsToLabArray } from "./image-decoder";
import {
  kmeansExtract,
  medianCutExtract,
  octreeExtract,
  hashmapExtract,
  deltaEExtract,
  mergeAndDedup,
  PRESETS,
} from "./extraction";
import type { ExtractedColor, ExtractionInput } from "./extraction/types";
import type { PresetConfig } from "./extraction/presets";
import { computeHarmony } from "./harmony";
import { validatePalette } from "./wcag";
import * as UPNG from "upng-js";
import {
  SemanticMapper,
  EnumeratedMapper,
  MathReportMapper,
} from "./output";
import type { PaletteData, TokenMapper } from "./output";
import { renderFigmaStyles } from "./output/figma-styles-renderer";
import { renderFigmaVariables } from "./output/figma-variables-renderer";
import { renderCanvasFrame } from "./output/canvas-renderer";
import { renderJsonTokens } from "./output/json-renderer";
import { hexToLab, labToLch, labToRgb01, hexToHsl } from "./color-utils";

// ---------------------------------------------------------------------------
// Max dimension for downsampling
// ---------------------------------------------------------------------------
const MAX_DIM = 256;

// ---------------------------------------------------------------------------
// Mapper registry
// ---------------------------------------------------------------------------
const MAPPERS: Record<string, TokenMapper> = {
  semantic: new SemanticMapper(),
  enumerated: new EnumeratedMapper(),
  "math-report": new MathReportMapper(),
};

// ---------------------------------------------------------------------------
// Extraction runners
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractFn = (input: ExtractionInput, params: any) => { colors: ExtractedColor[] };

const EXTRACTORS: Record<ExtractionMethod, ExtractFn> = {
  kmeans: kmeansExtract,
  mediancut: medianCutExtract,
  octree: octreeExtract,
  hashmap: hashmapExtract,
  deltae: deltaEExtract,
};

// ---------------------------------------------------------------------------
// Plugin State
// ---------------------------------------------------------------------------
export interface PluginState {
  /** Raw RGBA pixels from the image source */
  pixels: Uint8Array | null;
  width: number;
  height: number;

  /** CIELAB array derived from downsampled pixels */
  labs: [number, number, number][];

  /** Active preset */
  preset: PresetConfig;

  /** Per-method enabled overrides (for custom preset) */
  methodOverrides: Record<ExtractionMethod, boolean>;

  /** Active harmony rules */
  activeRules: Set<HarmonyRule>;

  /** Number of key colors to keep */
  keyCount: number;

  /** Key colors after extraction + merge */
  keyColors: KeyColor[];

  /** Derived harmony colors */
  derivedColors: DerivedColor[];

  /** WCAG contrast pairs */
  wcagPairs: WcagPair[];
}

function createInitialState(): PluginState {
  return {
    pixels: null,
    width: 0,
    height: 0,
    labs: [],
    preset: PRESETS["photographic"],
    methodOverrides: { ...PRESETS["photographic"].methods },
    activeRules: new Set<HarmonyRule>(["complementary"]),
    keyCount: 5,
    keyColors: [],
    derivedColors: [],
    wcagPairs: [],
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
export class Orchestrator {
  private state: PluginState;

  constructor(initialState?: PluginState) {
    this.state = initialState ?? createInitialState();
  }

  /** Expose state for testing */
  getState(): Readonly<PluginState> {
    return this.state;
  }

  /** Main message handler — called by plugin.ts onmessage */
  async handleMessage(msg: UiToSandboxMessage): Promise<void> {
    try {
      switch (msg.type) {
        case "upload-image":
          this.handleUploadImage(msg.payload);
          break;
        case "select-layer":
          await this.handleSelectLayer();
          break;
        case "set-key-count":
          this.handleSetKeyCount(msg.payload.count);
          break;
        case "toggle-method":
          this.handleToggleMethod(msg.payload.method, msg.payload.enabled);
          break;
        case "toggle-harmony":
          this.handleToggleHarmony(msg.payload.rule, msg.payload.enabled);
          break;
        case "lock-color":
          this.handleLockColor(msg.payload.index, msg.payload.locked);
          break;
        case "override-color":
          this.handleOverrideColor(msg.payload.index, msg.payload.hex);
          break;
        case "select-preset":
          this.handleSelectPreset(msg.payload.preset);
          break;
        case "export-figma":
          await this.handleExportFigma(msg.payload);
          break;
        case "export-json":
          this.handleExportJson();
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.postToUi({ type: "error", payload: { message } });
    }
  }

  // -----------------------------------------------------------------------
  // Image ingestion
  // -----------------------------------------------------------------------

  private handleUploadImage(payload: { width: number; height: number; pixels: Uint8Array }): void {
    const raw = payload.pixels instanceof Uint8Array ? payload.pixels : new Uint8Array(payload.pixels);
    const downsampled = downsamplePixels(raw, payload.width, payload.height, MAX_DIM);
    this.state.pixels = downsampled.pixels;
    this.state.width = downsampled.width;
    this.state.height = downsampled.height;
    this.state.labs = pixelsToLabArray(downsampled.pixels, downsampled.width, downsampled.height);

    this.runExtractionPipeline();
  }

  private async handleSelectLayer(): Promise<void> {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      this.postToUi({ type: "error", payload: { message: "No layer selected" } });
      return;
    }

    const node = selection[0];

    // Export the node as a PNG and decode it
    const pngBytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });

    // Decode PNG in sandbox using upng-js (statically imported)
    const decoded = UPNG.decode(pngBytes.buffer);
    const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);

    const downsampled = downsamplePixels(rgba, decoded.width, decoded.height, MAX_DIM);
    this.state.pixels = downsampled.pixels;
    this.state.width = downsampled.width;
    this.state.height = downsampled.height;
    this.state.labs = pixelsToLabArray(downsampled.pixels, downsampled.width, downsampled.height);

    this.runExtractionPipeline();
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  private handleSetKeyCount(count: number): void {
    this.state.keyCount = Math.max(1, Math.min(count, 12));
    if (this.state.labs.length > 0) {
      this.runExtractionPipeline();
    }
  }

  private handleToggleMethod(method: ExtractionMethod, enabled: boolean): void {
    this.state.methodOverrides[method] = enabled;
    // Switching to custom preset when toggling methods individually
    this.state.preset = {
      ...PRESETS["custom"],
      methods: { ...this.state.methodOverrides },
    };
    if (this.state.labs.length > 0) {
      this.runExtractionPipeline();
    }
  }

  private handleToggleHarmony(rule: HarmonyRule, enabled: boolean): void {
    if (enabled) {
      this.state.activeRules.add(rule);
    } else {
      this.state.activeRules.delete(rule);
    }
    if (this.state.keyColors.length > 0) {
      this.runHarmonyAndWcag();
    }
  }

  private handleLockColor(index: number, locked: boolean): void {
    if (index >= 0 && index < this.state.keyColors.length) {
      this.state.keyColors[index].locked = locked;
      // Re-send current state
      this.postExtractionResult();
    }
  }

  private handleOverrideColor(index: number, hex: string): void {
    if (index < 0 || index >= this.state.keyColors.length) return;

    const kc = this.state.keyColors[index];
    kc.hex = hex;
    kc.overridden = true;

    // Recalculate color representations from the new hex
    const lab = hexToLab(hex);
    kc.lab = lab;
    kc.lch = labToLch(lab);
    kc.rgb = labToRgb01(lab);
    kc.hsl = hexToHsl(hex);

    this.postExtractionResult();
    this.runHarmonyAndWcag();
  }

  private handleSelectPreset(presetName: PresetName): void {
    const preset = PRESETS[presetName];
    if (!preset) return;
    this.state.preset = preset;
    this.state.methodOverrides = { ...preset.methods };
    if (this.state.labs.length > 0) {
      this.runExtractionPipeline();
    }
  }

  // -----------------------------------------------------------------------
  // Extraction pipeline
  // -----------------------------------------------------------------------

  private runExtractionPipeline(): void {
    if (this.state.labs.length === 0) return;

    const methods = this.getActiveMethods();
    if (methods.length === 0) {
      this.postToUi({ type: "error", payload: { message: "No extraction methods enabled" } });
      return;
    }

    const input: ExtractionInput = { labs: this.state.labs };
    const colorSets: ExtractedColor[][] = [];
    const methodNames: ExtractionMethod[] = [];

    for (const method of methods) {
      const extractFn = EXTRACTORS[method];
      const params = this.state.preset.params[method];
      const result = extractFn(input, params);
      colorSets.push(result.colors);
      methodNames.push(method);
    }

    // Merge and dedup
    const merged = mergeAndDedup(colorSets, {
      tolerance: this.state.preset.mergeTolerance,
      maxColors: this.state.keyCount,
    }, methodNames);

    // Build key colors, preserving locked ones
    const newKeyColors: KeyColor[] = merged.map((mc, i) => {
      // If there's an existing locked color at this index, keep it
      const existing = this.state.keyColors[i];
      if (existing?.locked) {
        return existing;
      }

      return {
        lab: mc.lab,
        lch: mc.lch,
        hex: mc.hex,
        rgb: mc.rgb,
        hsl: mc.hsl,
        weight: mc.weight,
        sourceMethods: mc.sourceMethods as ExtractionMethod[],
        locked: false,
        overridden: false,
      };
    });

    this.state.keyColors = newKeyColors;

    this.postExtractionResult();
    this.runHarmonyAndWcag();
  }

  // -----------------------------------------------------------------------
  // Harmony + WCAG
  // -----------------------------------------------------------------------

  private runHarmonyAndWcag(): void {
    // Run harmony
    const derivedColors: DerivedColor[] = [];
    for (let i = 0; i < this.state.keyColors.length; i++) {
      const kc = this.state.keyColors[i];
      for (const rule of this.state.activeRules) {
        const harmonies = computeHarmony(kc.lch, rule);
        for (const hc of harmonies) {
          derivedColors.push({
            lab: hc.lab,
            lch: hc.lch,
            hex: hc.hex,
            rgb: hc.rgb,
            hsl: hc.hsl,
            weight: 0,
            sourceMethods: [],
            parentIndex: i,
            relationship: hc.relationship,
            rule: hc.rule,
          });
        }
      }
    }
    this.state.derivedColors = derivedColors;

    // Run WCAG validation
    const allHexColors = [
      ...this.state.keyColors.map((kc) => kc.hex),
      ...this.state.derivedColors.map((dc) => dc.hex),
    ];
    const wcagResults = validatePalette(allHexColors);
    this.state.wcagPairs = wcagResults.map((r, idx) => ({
      fgIndex: idx,
      bgHex: r.bgHex,
      ratio: r.ratio,
      scoreAA: r.scoreAA,
      scoreAAA: r.scoreAAA,
      scoreLargeAA: r.scoreLargeAA,
      suggestedFix: r.suggestedFix,
    }));

    this.postHarmonyResult();
    this.postWcagResult();
  }

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  private async handleExportFigma(config: ExportConfig): Promise<void> {
    const paletteData = this.buildPaletteData();
    const mapper = MAPPERS[config.mode];
    if (!mapper) {
      this.postToUi({ type: "error", payload: { message: `Unknown output mode: ${config.mode}` } });
      return;
    }

    const mapped = mapper.map(paletteData, config.schema, config.customPrefix);

    if (config.outputs.styles) {
      renderFigmaStyles(mapped.tokens);
    }
    if (config.outputs.variables) {
      renderFigmaVariables(mapped.tokens);
    }
    if (config.outputs.canvasFrame) {
      await renderCanvasFrame(mapped);
    }
    if (config.outputs.json) {
      const json = renderJsonTokens(mapped.tokens);
      // Store JSON for the UI to retrieve
      this.postToUi({
        type: "export-complete",
        payload: { success: true, message: json },
      });
      return;
    }

    this.postToUi({
      type: "export-complete",
      payload: { success: true, message: "Export complete" },
    });
  }

  private handleExportJson(): void {
    const paletteData = this.buildPaletteData();
    const mapper = MAPPERS["semantic"];
    const mapped = mapper.map(paletteData, "custom");
    const json = renderJsonTokens(mapped.tokens);

    this.postToUi({
      type: "export-complete",
      payload: { success: true, message: json },
    });
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private getActiveMethods(): ExtractionMethod[] {
    const methods: ExtractionMethod[] = [];
    const enabled = this.state.methodOverrides;
    for (const [method, on] of Object.entries(enabled)) {
      if (on) methods.push(method as ExtractionMethod);
    }
    return methods;
  }

  private buildPaletteData(): PaletteData {
    return {
      keyColors: this.state.keyColors.map((kc) => ({
        hex: kc.hex,
        lab: kc.lab,
        lch: kc.lch,
        rgb: kc.rgb,
        hsl: kc.hsl,
        sourceMethods: kc.sourceMethods,
      })),
      derivedColors: this.state.derivedColors.map((dc) => ({
        hex: dc.hex,
        lch: dc.lch,
        rgb: dc.rgb,
        parentIndex: dc.parentIndex,
        relationship: dc.relationship,
        rule: dc.rule,
      })),
      wcagPairs: this.state.wcagPairs.map((p) => ({
        fg: this.state.keyColors[p.fgIndex]?.hex ?? "#000000",
        bg: p.bgHex,
        ratio: p.ratio,
        score: p.scoreAAA ? "AAA" : p.scoreAA ? "AA" : p.scoreLargeAA ? "Large AA" : "Fail",
      })),
      activeMethods: this.getActiveMethods(),
      activeRules: Array.from(this.state.activeRules),
    };
  }

  private postExtractionResult(): void {
    this.postToUi({
      type: "extraction-result",
      payload: { keyColors: this.state.keyColors },
    });
  }

  private postHarmonyResult(): void {
    this.postToUi({
      type: "harmony-result",
      payload: { derivedColors: this.state.derivedColors },
    });
  }

  private postWcagResult(): void {
    this.postToUi({
      type: "wcag-result",
      payload: { pairs: this.state.wcagPairs },
    });
  }

  private postToUi(msg: SandboxToUiMessage): void {
    figma.ui.postMessage(msg);
  }
}
