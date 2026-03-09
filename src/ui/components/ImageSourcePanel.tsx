import React, { useCallback, useRef } from "react";
import type { UiToSandboxMessage } from "../../common/messages";

interface Props {
  postMessage: (msg: UiToSandboxMessage) => void;
}

export function ImageSourcePanel({ postMessage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          postMessage({
            type: "upload-image",
            payload: {
              width: img.width,
              height: img.height,
              pixels: Array.from(imageData.data),
            },
          });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    [postMessage],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
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
    <section className="panel">
      <h2>Image Source</h2>
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        <span>Drop image or click to upload</span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button className="btn btn-secondary" onClick={handleSelectLayer}>
        Extract from Selection
      </button>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </section>
  );
}
