import { h } from "preact";
import { useState } from "preact/hooks";
import { Banner, Disclosure, Text } from "@create-figma-plugin/ui";
import { IconWarning16, IconCheck16 } from "@create-figma-plugin/ui";
import type { WcagPair } from "../../common/messages";

interface WcagWarningsSectionProps {
  wcagPairs: WcagPair[];
}

export function WcagWarningsSection({ wcagPairs }: WcagWarningsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const failingPairs = wcagPairs.filter((p) => !p.scoreAA);

  if (wcagPairs.length === 0) return null;

  if (failingPairs.length === 0) {
    return (
      <Banner icon={<IconCheck16 />} variant="success">
        All color pairs pass WCAG AA
      </Banner>
    );
  }

  return (
    <div className="wcag-warnings">
      <Banner icon={<IconWarning16 />} variant="warning">
        {failingPairs.length} pair{failingPairs.length !== 1 ? "s" : ""} fail WCAG AA
      </Banner>
      <Disclosure open={isOpen} onClick={() => setIsOpen(!isOpen)} title="View failing pairs">
        {failingPairs.map((p, i) => (
          <div key={i} className="wcag-pair">
            <div className="wcag-swatch-pair">
              <div className="mini-swatch" style={{ backgroundColor: p.bgHex }} />
            </div>
            <span className="wcag-ratio">{p.ratio.toFixed(1)}:1</span>
            {p.suggestedFix && (
              <span className="wcag-fix" title="Suggested fix">{p.suggestedFix}</span>
            )}
          </div>
        ))}
      </Disclosure>
    </div>
  );
}
