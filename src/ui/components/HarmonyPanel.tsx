import React, { useCallback } from "react";
import type {
  UiToSandboxMessage,
  HarmonyRule,
  DerivedColor,
  WcagPair,
} from "../../common/messages";

const RULES: { key: HarmonyRule; label: string }[] = [
  { key: "complementary", label: "Complementary" },
  { key: "split-complementary", label: "Split Comp." },
  { key: "analogous", label: "Analogous" },
  { key: "triadic", label: "Triadic" },
  { key: "tetradic", label: "Tetradic" },
  { key: "accent", label: "Accent" },
  { key: "tints-shades", label: "Tints & Shades" },
];

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
  activeRules: Set<HarmonyRule>;
  derivedColors: DerivedColor[];
  wcagPairs: WcagPair[];
}

export function HarmonyPanel({
  postMessage,
  activeRules,
  derivedColors,
  wcagPairs,
}: Props) {
  const handleToggle = useCallback(
    (rule: HarmonyRule, enabled: boolean) => {
      postMessage({ type: "toggle-harmony", payload: { rule, enabled } });
    },
    [postMessage],
  );

  // Group derived colors by rule
  const grouped = new Map<HarmonyRule, DerivedColor[]>();
  for (const dc of derivedColors) {
    const list = grouped.get(dc.rule) ?? [];
    list.push(dc);
    grouped.set(dc.rule, list);
  }

  const failingPairs = wcagPairs.filter((p) => !p.scoreAA);

  return (
    <section className="panel">
      <h2>Harmony & Preview</h2>

      <div className="field">
        <label>Harmony Rules</label>
        <div className="rule-toggles">
          {RULES.map((r) => (
            <label key={r.key} className="checkbox-label">
              <input
                type="checkbox"
                checked={activeRules.has(r.key)}
                onChange={(e) => handleToggle(r.key, e.target.checked)}
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      {derivedColors.length > 0 && (
        <div className="derived-section">
          <h3>Derived Colors</h3>
          {Array.from(grouped.entries()).map(([rule, colors]) => (
            <div key={rule} className="derived-group">
              <span className="derived-rule-label">{rule}</span>
              <div className="derived-row">
                {colors.map((dc, i) => (
                  <div
                    key={i}
                    className="mini-swatch"
                    style={{ backgroundColor: dc.hex }}
                    title={`${dc.hex} (${dc.relationship})`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {failingPairs.length > 0 && (
        <div className="wcag-warnings">
          <h3>WCAG Warnings ({failingPairs.length})</h3>
          {failingPairs.slice(0, 5).map((p, i) => (
            <div key={i} className="wcag-pair">
              <div className="wcag-swatch-pair">
                <div className="mini-swatch" style={{ backgroundColor: p.bgHex }} />
              </div>
              <span className="wcag-ratio">{p.ratio.toFixed(1)}:1</span>
              {p.suggestedFix && (
                <span className="wcag-fix" title="Suggested fix">
                  {p.suggestedFix}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
