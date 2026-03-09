import type { TokenSchema } from "../../common/messages";
import type { PaletteData, PaletteToken, MappedOutput, TokenMapper } from "./types";

const SEMANTIC_ROLES = [
  "primary",
  "secondary",
  "accent",
  "surface",
  "background",
] as const;

/**
 * Maps palette colors to semantic design-token roles (primary, secondary, etc.)
 * and derives on-color / outline tokens from the lightest and darkest key colors.
 */
export class SemanticMapper implements TokenMapper {
  map(palette: PaletteData, schema: TokenSchema, customPrefix?: string): MappedOutput {
    const tokens: PaletteToken[] = [];
    const prefix = customPrefix ?? "color";

    // Assign key colors to semantic roles in order
    for (let i = 0; i < palette.keyColors.length && i < SEMANTIC_ROLES.length; i++) {
      const kc = palette.keyColors[i];
      const role = SEMANTIC_ROLES[i];
      tokens.push({
        name: formatName(schema, role, undefined, prefix),
        hex: kc.hex,
        rgb: to255(kc.rgb),
        description: `${role} color`,
      });
    }

    // Generate variant tokens for key colors beyond the base roles
    for (let i = SEMANTIC_ROLES.length; i < palette.keyColors.length; i++) {
      const kc = palette.keyColors[i];
      const variantName = `${SEMANTIC_ROLES[(i - 1) % SEMANTIC_ROLES.length]}-variant`;
      tokens.push({
        name: formatName(schema, variantName, undefined, prefix),
        hex: kc.hex,
        rgb: to255(kc.rgb),
        description: `${variantName} color`,
      });
    }

    // Derive on-color and outline tokens from lightest/darkest key colors
    if (palette.keyColors.length > 0) {
      const sorted = [...palette.keyColors].sort((a, b) => a.lch[0] - b.lch[0]);
      const darkest = sorted[0];
      const lightest = sorted[sorted.length - 1];

      tokens.push({
        name: formatName(schema, "on-primary", undefined, prefix),
        hex: lightest.hex,
        rgb: to255(lightest.rgb),
        description: "on-primary color (lightest key color)",
      });

      tokens.push({
        name: formatName(schema, "on-surface", undefined, prefix),
        hex: darkest.hex,
        rgb: to255(darkest.rgb),
        description: "on-surface color (darkest key color)",
      });

      tokens.push({
        name: formatName(schema, "outline", undefined, prefix),
        hex: darkest.hex,
        rgb: to255(darkest.rgb),
        description: "outline color (darkest key color)",
      });
    }

    return { mode: "semantic", schema, tokens };
  }
}

/** Convert [0..1] RGB to [0..255] RGB */
function to255(rgb: [number, number, number]): [number, number, number] {
  return [
    Math.round(rgb[0] * 255),
    Math.round(rgb[1] * 255),
    Math.round(rgb[2] * 255),
  ];
}

/** Format a token name according to the target schema */
function formatName(
  schema: TokenSchema,
  role: string,
  weight: number | undefined,
  prefix: string,
): string {
  switch (schema) {
    case "material":
      return weight !== undefined
        ? `md/sys/color/${role}/${weight}`
        : `md/sys/color/${role}`;
    case "tailwind":
      return weight !== undefined
        ? `colors/${role}/${weight}`
        : `colors/${role}/500`;
    case "custom":
      return weight !== undefined
        ? `${prefix}/${role}/${weight}`
        : `${prefix}/${role}`;
  }
}
