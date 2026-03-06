import type { OutputMode, TokenSchema } from "../../common/messages";

export interface PaletteToken {
  name: string;
  hex: string;
  rgb: [number, number, number];
  description: string;
}

export interface ReportData {
  extractionMethods: string[];
  keyColors: Array<{
    hex: string;
    lch: [number, number, number];
    sources: string[];
  }>;
  harmonyRules: string[];
  wcagPairs: Array<{
    fg: string;
    bg: string;
    ratio: number;
    score: string;
  }>;
}

export interface MappedOutput {
  mode: OutputMode;
  schema: TokenSchema;
  tokens: PaletteToken[];
  reportData?: ReportData;
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
    rgb: [number, number, number];
    parentIndex: number;
    relationship: string;
    rule: string;
  }>;
  wcagPairs: Array<{ fg: string; bg: string; ratio: number; score: string }>;
  activeMethods: string[];
  activeRules: string[];
}
