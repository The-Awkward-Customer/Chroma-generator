import React, { useCallback } from "react";
import type { UiToSandboxMessage, KeyColor } from "../../common/messages";

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
    return (
      <section className="panel">
        <h2>Key Colors</h2>
        <p className="muted">Upload an image to extract colors.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Key Colors</h2>
      <div className="swatch-grid">
        {keyColors.map((kc, i) => (
          <div key={i} className="swatch-card">
            <div
              className="swatch-color"
              style={{ backgroundColor: kc.hex }}
            />
            <div className="swatch-info">
              <input
                type="color"
                value={kc.hex}
                onChange={(e) => handleOverride(i, e.target.value)}
                className="color-picker"
              />
              <span className="swatch-hex">{kc.hex.toUpperCase()}</span>
              <button
                className={`btn-icon ${kc.locked ? "locked" : ""}`}
                onClick={() => handleLock(i, !kc.locked)}
                title={kc.locked ? "Unlock" : "Lock"}
              >
                {kc.locked ? "\u{1F512}" : "\u{1F513}"}
              </button>
            </div>
            <div className="swatch-meta">
              {kc.sourceMethods.join(", ")}
              {kc.overridden && <span className="tag">edited</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
