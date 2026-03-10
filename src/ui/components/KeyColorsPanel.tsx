import { useCallback } from "react";
import type { UiToSandboxMessage, KeyColor } from "../../common/messages";
import { SwatchCard } from "./SwatchCard";

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
  keyColors: KeyColor[];
}

export function KeyColorsPanel({ postMessage, keyColors }: Props) {
  const handleLock = useCallback(
    (index: number, locked: boolean) => {
      postMessage({ type: "lock-color", payload: { index, locked } });
    },
    [postMessage],
  );

  const handleOverride = useCallback(
    (index: number, hex: string) => {
      postMessage({ type: "override-color", payload: { index, hex } });
    },
    [postMessage],
  );

  if (keyColors.length === 0) {
    return null;
  }

  return (
    <div className="swatch-grid">
      {keyColors.map((kc, i) => (
        <SwatchCard
          key={i}
          color={kc}
          index={i}
          onLock={handleLock}
          onOverride={handleOverride}
        />
      ))}
    </div>
  );
}
