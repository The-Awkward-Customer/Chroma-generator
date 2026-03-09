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
      const MAX_DIM = 256;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          // Downsample in UI canvas to keep message payload small.
          // This avoids the sandbox VM crash when it tries to deep-wrap
          // millions of numbers in the message.
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

          // Send as Uint8Array — transferred as a single buffer, not per-element
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
