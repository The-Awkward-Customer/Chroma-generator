import { useCallback, useRef } from "react";
import { Button, FileUploadDropzone, Text } from "@create-figma-plugin/ui";
import type { UiToSandboxMessage } from "../../common/messages";

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
}

export function ImageSourcePanel({ postMessage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const MAX_DIM = 256;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          let w = img.width;
          let h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            const scale = MAX_DIM / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);

          postMessage({
            type: "upload-image",
            payload: {
              width: w,
              height: h,
              pixels: new Uint8Array(imageData.data.buffer),
            },
          });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    [postMessage],
  );

  const handleSelectedFiles = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file && file.type.startsWith("image/")) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleSelectLayer = useCallback(() => {
    postMessage({ type: "select-layer" });
  }, [postMessage]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <FileUploadDropzone
        acceptedFileTypes={["image/png", "image/jpeg", "image/gif", "image/webp"]}
        onSelectedFiles={handleSelectedFiles}
      >
        <Text align="center">Drop image or click to upload</Text>
      </FileUploadDropzone>
      <Button secondary fullWidth onClick={handleSelectLayer}>
        Extract from Selection
      </Button>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
