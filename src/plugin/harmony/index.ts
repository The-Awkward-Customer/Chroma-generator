import type { HarmonyRule } from "../../common/messages";
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

/** Wrap hue into [0, 360) */
function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

/** Build a full HarmonyColor from LCH components */
function lchToFullColor(
  l: number,
  c: number,
  h: number,
  relationship: string,
  rule: HarmonyRule
): HarmonyColor {
  const hNorm = normalizeHue(h);
  const lch: [number, number, number] = [l, c, hNorm];
  const hex = lchToHex(lch);
  const lab = lchToLab(lch);
  const rgb = labToRgb01(lab);
  const hsl = hexToHsl(hex);
  return { lab, lch, hex, rgb, hsl, relationship, rule };
}

export function computeHarmony(
  lch: [number, number, number],
  rule: HarmonyRule
): HarmonyColor[] {
  const [l, c, h] = lch;

  switch (rule) {
    case "complementary":
      return [lchToFullColor(l, c, h + 180, "complementary", rule)];

    case "split-complementary":
      return [
        lchToFullColor(l, c, h + 150, "split-complementary-a", rule),
        lchToFullColor(l, c, h + 210, "split-complementary-b", rule),
      ];

    case "analogous":
      return [
        lchToFullColor(l, c, h - 30, "analogous-a", rule),
        lchToFullColor(l, c, h + 30, "analogous-b", rule),
      ];

    case "triadic":
      return [
        lchToFullColor(l, c, h + 120, "triadic-a", rule),
        lchToFullColor(l, c, h + 240, "triadic-b", rule),
      ];

    case "tetradic":
      return [
        lchToFullColor(l, c, h + 90, "tetradic-a", rule),
        lchToFullColor(l, c, h + 180, "tetradic-b", rule),
        lchToFullColor(l, c, h + 270, "tetradic-c", rule),
      ];

    case "accent": {
      const targetL = l < 50 ? Math.min(95, l + 60) : Math.max(5, l - 60);
      return [lchToFullColor(targetL, c, h, "accent", rule)];
    }

    case "tints-shades": {
      const colors: HarmonyColor[] = [];
      for (let i = 0; i < 10; i++) {
        const stepL = 5 + (90 / 9) * i;
        colors.push(lchToFullColor(stepL, c, h, `tint-shade-${i + 1}`, rule));
      }
      return colors;
    }
  }
}
