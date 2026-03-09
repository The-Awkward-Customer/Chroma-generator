import type { TokenSchema } from "../../common/messages";
import type { PaletteData, MappedOutput, TokenMapper } from "./types";

/**
 * Produces no tokens but populates reportData with the full extraction/harmony
 * analysis data from the palette pipeline. Useful for exporting analytics or
 * generating visual reports.
 */
export class MathReportMapper implements TokenMapper {
  map(palette: PaletteData, schema: TokenSchema, _customPrefix?: string): MappedOutput {
    return {
      mode: "math-report",
      schema,
      tokens: [],
      reportData: {
        extractionMethods: [...palette.activeMethods],
        keyColors: palette.keyColors.map((kc) => ({
          hex: kc.hex,
          lch: kc.lch,
          sources: [...kc.sourceMethods],
        })),
        harmonyRules: [...palette.activeRules],
        wcagPairs: palette.wcagPairs.map((p) => ({
          fg: p.fg,
          bg: p.bg,
          ratio: p.ratio,
          score: p.score,
        })),
      },
    };
  }
}
