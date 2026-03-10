import { useCallback, useState } from "react";
import { Button, Checkbox, Dropdown, Textbox, Banner, Text } from "@create-figma-plugin/ui";
import { IconCheck16, IconWarning16 } from "@create-figma-plugin/ui";
import type {
  UiToSandboxMessage,
  OutputMode,
  TokenSchema,
  ExportConfig,
} from "../../common/messages";

const OUTPUT_MODE_OPTIONS: Array<{ value: string; text: string }> = [
  { value: "semantic", text: "Semantic Tokens" },
  { value: "enumerated", text: "Enumerated Palette" },
  { value: "math-report", text: "Color Math Report" },
];

const SCHEMA_OPTIONS: Array<{ value: string; text: string }> = [
  { value: "material", text: "Material Design" },
  { value: "tailwind", text: "Tailwind" },
  { value: "custom", text: "Custom" },
];

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
  exportResult: { success: boolean; message: string } | null;
  hasKeyColors: boolean;
  isExporting?: boolean;
}

export function OutputPanel({ postMessage, exportResult, hasKeyColors, isExporting }: Props) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <Text style={{ fontWeight: "bold" }}>Output Mode</Text>
        <Dropdown
          options={OUTPUT_MODE_OPTIONS}
          value={mode}
          onValueChange={(val: string) => setMode(val as OutputMode)}
        />
      </div>

      <div>
        <Text style={{ fontWeight: "bold" }}>Token Schema</Text>
        <Dropdown
          options={SCHEMA_OPTIONS}
          value={schema}
          onValueChange={(val: string) => setSchema(val as TokenSchema)}
        />
      </div>

      {schema === "custom" && (
        <div>
          <Text style={{ fontWeight: "bold" }}>Custom Prefix</Text>
          <Textbox
            value={customPrefix}
            onValueInput={(val: string) => setCustomPrefix(val)}
            placeholder="color"
          />
        </div>
      )}

      <div>
        <Text style={{ fontWeight: "bold" }}>Figma Outputs</Text>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          <Checkbox value={outputs.styles} onValueChange={() => toggleOutput("styles")}>
            <Text>Paint Styles</Text>
          </Checkbox>
          <Checkbox value={outputs.variables} onValueChange={() => toggleOutput("variables")}>
            <Text>Variables</Text>
          </Checkbox>
          <Checkbox value={outputs.canvasFrame} onValueChange={() => toggleOutput("canvasFrame")}>
            <Text>Canvas Frame</Text>
          </Checkbox>
          <Checkbox value={outputs.json} onValueChange={() => toggleOutput("json")}>
            <Text>JSON (W3C Design Tokens)</Text>
          </Checkbox>
        </div>
      </div>

      <div className="export-actions">
        <Button onClick={handleExport} disabled={!hasKeyColors} loading={isExporting}>
          Export to Figma
        </Button>
        <Button secondary onClick={handleExportJson} disabled={!hasKeyColors}>
          Export JSON
        </Button>
      </div>

      {exportResult && (
        exportResult.success ? (
          <Banner icon={<IconCheck16 />} variant="success">
            {outputs.json ? "JSON exported" : "Export complete"}
          </Banner>
        ) : (
          <Banner icon={<IconWarning16 />} variant="warning">
            {exportResult.message}
          </Banner>
        )
      )}
    </div>
  );
}
