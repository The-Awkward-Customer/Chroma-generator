import { h } from "preact";
import { IconButton, Text } from "@create-figma-plugin/ui";
import { IconLockLocked16, IconLockUnlocked16 } from "@create-figma-plugin/ui";
import type { KeyColor } from "../../common/messages";

interface SwatchCardProps {
  color: KeyColor;
  index: number;
  onLock: (index: number, locked: boolean) => void;
  onOverride: (index: number, hex: string) => void;
}

export function SwatchCard({ color, index, onLock, onOverride }: SwatchCardProps) {
  return (
    <div className="swatch-card">
      <div className="swatch-color" style={{ backgroundColor: color.hex }} />
      <div className="swatch-info">
        <input
          type="color"
          value={color.hex}
          onChange={(e: any) => onOverride(index, e.target.value)}
          className="color-picker"
        />
        <span className="swatch-hex">{color.hex.toUpperCase()}</span>
        <IconButton onClick={() => onLock(index, !color.locked)}>
          {color.locked ? <IconLockLocked16 /> : <IconLockUnlocked16 />}
        </IconButton>
      </div>
      <div className="swatch-meta">
        <Text>{color.sourceMethods.join(", ")}</Text>
        {color.overridden && <span className="tag">edited</span>}
      </div>
    </div>
  );
}
