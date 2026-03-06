import { contrastRatio, hexToLab, labToLch, lchToHex } from "../color-utils";

export interface WcagPairResult {
  fgHex: string;
  bgHex: string;
  ratio: number;
  scoreAA: boolean;
  scoreAAA: boolean;
  scoreLargeAA: boolean;
  suggestedFix?: string;
}

/**
 * Validate every foreground color against a background for WCAG contrast compliance.
 */
export function validatePalette(hexColors: string[], bgHex = "#ffffff"): WcagPairResult[] {
  return hexColors.map((fgHex) => {
    const ratio = contrastRatio(fgHex, bgHex);
    const scoreAA = ratio >= 4.5;
    const scoreAAA = ratio >= 7;
    const scoreLargeAA = ratio >= 3;

    const result: WcagPairResult = {
      fgHex,
      bgHex,
      ratio,
      scoreAA,
      scoreAAA,
      scoreLargeAA,
    };

    if (!scoreAA) {
      const fix = suggestFix(fgHex, bgHex, 4.5);
      if (fix !== undefined) {
        result.suggestedFix = fix;
      }
    }

    return result;
  });
}

/**
 * Suggest an adjusted foreground hex that meets the target contrast ratio against bgHex.
 * Uses binary search on the LCH Lightness channel.
 * Returns undefined if the pair already passes or no fix can be found.
 */
export function suggestFix(
  fgHex: string,
  bgHex: string,
  targetRatio: number,
): string | undefined {
  // Already passing — no fix needed.
  if (contrastRatio(fgHex, bgHex) >= targetRatio) {
    return undefined;
  }

  const bgLab = hexToLab(bgHex);
  const bgLch = labToLch(bgLab);
  const bgL = bgLch[0];

  const fgLab = hexToLab(fgHex);
  const fgLch = labToLch(fgLab);

  // Determine search direction based on background lightness.
  // Light background → darken foreground (lower L).
  // Dark background → lighten foreground (higher L).
  let lo: number;
  let hi: number;

  if (bgL > 50) {
    lo = 0;
    hi = fgLch[0];
  } else {
    lo = fgLch[0];
    hi = 100;
  }

  let bestHex: string | undefined;

  for (let i = 0; i < 30; i++) {
    const midL = (lo + hi) / 2;
    const candidate = lchToHex([midL, fgLch[1], fgLch[2]]);
    const ratio = contrastRatio(candidate, bgHex);

    if (ratio >= targetRatio) {
      bestHex = candidate;
      // Try to find a value closer to the original (less extreme adjustment).
      if (bgL > 50) {
        lo = midL;
      } else {
        hi = midL;
      }
    } else {
      // Need more contrast — push further away from background.
      if (bgL > 50) {
        hi = midL;
      } else {
        lo = midL;
      }
    }
  }

  return bestHex;
}
