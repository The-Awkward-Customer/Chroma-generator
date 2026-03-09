import React, { useCallback, useState } from "react";
import type {
  UiToSandboxMessage,
  OutputMode,
  TokenSchema,
  ExportConfig,
} from "../../common/messages";

const OUTPUT_MODES: { key: OutputMode; label: string }[] = [
  { key: "semantic", label: "Semantic Tokens" },
  { key: "enumerated", label: "Enumerated Palette" },
  { key: "math-report", label: "Color Math Report" },
];

const SCHEMAS: { key: TokenSchema; label: string }[] = [
  { key: "material", label: "Material Design" },
  { key: "tailwind", label: "Tailwind" },
  { key: "custom", label: "Custom" },
];

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
  exportResult: { success: boolean; message: string } | null;
  hasKeyColors: boolean;
}

export function OutputPanel({ postMessage, exportResult, hasKeyColors }: Props) {
  const [mode, setMode] = useState<OutputMode>("semantic");
  const [schema, setSchema] = useState<TokenSchema>("material");
  const [customPrefix, setCustomPrefix] = useState("color");
  const [outputs, setOutputs] = useState({
    styles: true,
    variables: true,
    canvasFrame: true,
    json: false,
  });

  const handleExport = useCallback(() => {
    const config: ExportConfig = {
      mode,
      schema,
      customPrefix: schema === "custom" ? customPrefix : undefined,
      outputs,
    };
    postMessage({ type: "export-figma", payload: config });
  }, [mode, schema, customPrefix, outputs, postMessage]);

  const handleExportJson = useCallback(() => {
    postMessage({ type: "export-json" });
  }, [postMessage]);

  const toggleOutput = (key: keyof typeof outputs) => {
    setOutputs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="panel">
      <h2>Output</h2>

      <div className="field">
        <label>Output Mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as OutputMode)}>
          {OUTPUT_MODES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Token Schema</label>
        <select value={schema} onChange={(e) => setSchema(e.target.value as TokenSchema)}>
          {SCHEMAS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {schema === "custom" && (
        <div className="field">
          <label>Custom Prefix</label>
          <input
            type="text"
            value={customPrefix}
            onChange={(e) => setCustomPrefix(e.target.value)}
            placeholder="color"
          />
        </div>
      )}

      <div className="field">
        <label>Figma Outputs</label>
        <label className="checkbox-label">
          <input type="checkbox" checked={outputs.styles} onChange={() => toggleOutput("styles")} />
          Paint Styles
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={outputs.variables} onChange={() => toggleOutput("variables")} />
          Variables
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={outputs.canvasFrame} onChange={() => toggleOutput("canvasFrame")} />
          Canvas Frame
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={outputs.json} onChange={() => toggleOutput("json")} />
          JSON (W3C Design Tokens)
        </label>
      </div>

      <div className="export-actions">
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={!hasKeyColors}
        >
          Export to Figma
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleExportJson}
          disabled={!hasKeyColors}
        >
          Export JSON
        </button>
      </div>

      {exportResult && (
        <div className={`export-result ${exportResult.success ? "success" : "error"}`}>
          {exportResult.success
            ? outputs.json
              ? "JSON exported"
              : "Export complete"
            : exportResult.message}
        </div>
      )}
    </section>
  );
}
