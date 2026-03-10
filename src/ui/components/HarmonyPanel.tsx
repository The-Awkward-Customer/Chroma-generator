import { useCallback, useState } from "react";
import { Toggle, Disclosure, Text } from "@create-figma-plugin/ui";
import type {
  UiToSandboxMessage,
  HarmonyRule,
  DerivedColor,
  WcagPair,
} from "../../common/messages";
import { WcagWarningsSection } from "./WcagWarningsSection";

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
  const [openRules, setOpenRules] = useState<Set<string>>(new Set());

  const handleToggle = useCallback(
    (rule: HarmonyRule, enabled: boolean) => {
      postMessage({ type: "toggle-harmony", payload: { rule, enabled } });
    },
    [postMessage],
  );

  const toggleOpen = (rule: string) => {
    setOpenRules((prev) => {
      const next = new Set(prev);
      if (next.has(rule)) next.delete(rule);
      else next.add(rule);
      return next;
    });
  };

  // Group derived colors by rule
  const grouped = new Map<HarmonyRule, DerivedColor[]>();
  for (const dc of derivedColors) {
    const list = grouped.get(dc.rule) ?? [];
    list.push(dc);
    grouped.set(dc.rule, list);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div>
        <Text style={{ fontWeight: "bold" }}>Harmony Rules</Text>
        <div className="rule-toggles" style={{ marginTop: "4px" }}>
          {RULES.map((r) => (
            <Toggle
              key={r.key}
              value={activeRules.has(r.key)}
              onValueChange={(val: boolean) => handleToggle(r.key, val)}
            >
              <Text>{r.label}</Text>
            </Toggle>
          ))}
        </div>
      </div>

      {derivedColors.length > 0 && (
        <div className="derived-section">
          {Array.from(grouped.entries()).map(([rule, colors]) => (
            <Disclosure
              key={rule}
              open={openRules.has(rule)}
              onClick={() => toggleOpen(rule)}
              title={`${rule} (${colors.length})`}
            >
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
            </Disclosure>
          ))}
        </div>
      )}

      <WcagWarningsSection wcagPairs={wcagPairs} />
    </div>
  );
}
