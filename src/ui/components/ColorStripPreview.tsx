import { h } from "preact";
import type { KeyColor } from "../../common/messages";

interface ColorStripPreviewProps {
  keyColors: KeyColor[];
}

export function ColorStripPreview({ keyColors }: ColorStripPreviewProps) {
  if (keyColors.length === 0) return null;
  const totalWeight = keyColors.reduce((sum, kc) => sum + kc.weight, 0) || 1;
  return (
    <div className="color-strip">
      {keyColors.map((kc, i) => (
        <div
          key={i}
          className="color-strip-segment"
          style={{
            backgroundColor: kc.hex,
            flex: kc.weight / totalWeight,
          }}
          title={kc.hex}
        />
      ))}
    </div>
  );
}
