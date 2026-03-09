import type { TokenSchema } from "../../common/messages";
import { lchToHex } from "../color-utils";
import type { PaletteData, PaletteToken, MappedOutput, TokenMapper } from "./types";

/** Weight stops for the generated tint/shade scale */
const WEIGHT_STOPS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/**
 * Maps each key color to a numbered tint/shade scale (100-900) using
 * the color's HSL hue angle to derive a human-readable hue group name.
 */
export class EnumeratedMapper implements TokenMapper {
  map(palette: PaletteData, schema: TokenSchema, customPrefix?: string): MappedOutput {
    const tokens: PaletteToken[] = [];
    const prefix = customPrefix ?? "color";

    for (const kc of palette.keyColors) {
      const hueName = hueToName(kc.hsl[0]);
      const [l, c, h] = kc.lch;

      for (const weight of WEIGHT_STOPS) {
        // Map weight 100..900 -> lightness 95..15 (light to dark)
        const targetL = 95 - ((weight - 100) / 800) * 80;
        const hex = lchToHex([targetL, c, h]);
        const rgb = hexToRgb255(hex);

        tokens.push({
          name: formatName(schema, hueName, weight, prefix),
          hex,
          rgb,
          description: `${hueName} ${weight}`,
        });
      }

      // Also insert the original key color at weight 500 position
      // (replace the generated 500 with the actual key color)
      const idx500 = tokens.findIndex(
        (t) => t.name === formatName(schema, hueName, 500, prefix),
      );
      if (idx500 !== -1) {
        tokens[idx500] = {
          name: formatName(schema, hueName, 500, prefix),
          hex: kc.hex,
          rgb: [
            Math.round(kc.rgb[0] * 255),
            Math.round(kc.rgb[1] * 255),
            Math.round(kc.rgb[2] * 255),
          ],
          description: `${hueName} 500 (key color)`,
        };
      }
    }

    return { mode: "enumerated", schema, tokens };
  }
}

/** Derive a hue name from an HSL hue angle (0-360) */
function hueToName(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  if (h < 15) return "red";
  if (h < 45) return "orange";
  if (h < 75) return "yellow";
  if (h < 150) return "green";
  if (h < 210) return "cyan";
  if (h < 270) return "blue";
  if (h < 330) return "purple";
  return "red";
}

/** Format a token name according to the target schema */
function formatName(
  schema: TokenSchema,
  hue: string,
  weight: number,
  prefix: string,
): string {
  switch (schema) {
    case "material":
      return `md/ref/palette/${hue}/${weight}`;
    case "tailwind":
      return `colors/${hue}/${weight}`;
    case "custom":
      return `${prefix}/${hue}/${weight}`;
  }
}

/** Convert hex string to [0..255] RGB tuple */
function hexToRgb255(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  return [
    parseInt(raw.substring(0, 2), 16),
    parseInt(raw.substring(2, 4), 16),
    parseInt(raw.substring(4, 6), 16),
  ];
}
