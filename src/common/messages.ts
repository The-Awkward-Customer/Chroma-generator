// UI → Sandbox messages
export type UiToSandboxMessage =
  | { type: "upload-image"; payload: { width: number; height: number; pixels: Uint8Array; sourceName?: string } }
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
