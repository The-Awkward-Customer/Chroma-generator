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

/** CIELAB -> hex string */
export function labToHex(lab: [number, number, number]): string {
  return formatHex({ mode: "lab", l: lab[0], a: lab[1], b: lab[2] })!;
}

/** CIELAB -> LCH */
export function labToLch(lab: [number, number, number]): [number, number, number] {
  const lch = toLch({ mode: "lab", l: lab[0], a: lab[1], b: lab[2] });
  return [lch!.l, lch!.c, lch!.h ?? 0];
}

/** LCH -> CIELAB */
export function lchToLab(lch: [number, number, number]): [number, number, number] {
  const lab = toLab({ mode: "lch", l: lch[0], c: lch[1], h: lch[2] });
  return [lab!.l, lab!.a, lab!.b];
}

/** LCH -> hex (with gamut clamping) */
export function lchToHex(lch: [number, number, number]): string {
  const clamped = clampChroma({ mode: "lch", l: lch[0], c: lch[1], h: lch[2] }, "lch");
  return formatHex(clamped)!;
}

/** Hex -> CIELAB */
export function hexToLab(hex: string): [number, number, number] {
  const lab = toLab(hex);
  return [lab!.l, lab!.a, lab!.b];
}

/** CIELAB -> RGB [0..1, 0..1, 0..1] */
export function labToRgb01(lab: [number, number, number]): [number, number, number] {
  const rgb = toRgb({ mode: "lab", l: lab[0], a: lab[1], b: lab[2] });
  return [
    Math.max(0, Math.min(1, rgb!.r)),
    Math.max(0, Math.min(1, rgb!.g)),
    Math.max(0, Math.min(1, rgb!.b)),
  ];
}

/** Hex -> RGB [0..1] */
export function hexToRgb01(hex: string): [number, number, number] {
  const rgb = toRgb(hex);
  return [rgb!.r, rgb!.g, rgb!.b];
}

/** Hex -> HSL [h, s%, l%] */
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
