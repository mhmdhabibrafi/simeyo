"use client";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { cropRectangle } from "@/lib/image-crop";

export function PhotoCropper({
  file,
  kind,
  busy,
  uploadError,
  onSave,
  onClose,
}: {
  file: File;
  kind: "avatar" | "cover";
  busy: boolean;
  uploadError: string;
  onSave: (file: File) => Promise<boolean>;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0.5, y: 0.5 });
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const aspect = kind === "avatar" ? 1 : 3;
  const locked = busy || exporting;
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const picture = new window.Image();
    let cancelled = false;
    picture.onload = () => {
      if (!cancelled) setImage(picture);
    };
    picture.onerror = () => {
      if (!cancelled) setError("Gambar tidak dapat dibuka. Pilih foto lain.");
    };
    picture.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const crop = cropRectangle(
      image.naturalWidth,
      image.naturalHeight,
      aspect,
      zoom,
      pan.x,
      pan.y,
    );
    canvas.current
      .getContext("2d")
      ?.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        600,
        600 / aspect,
      );
  }, [image, aspect, zoom, pan]);
  async function save() {
    if (!image || locked) return;
    setExporting(true);
    setError("");
    try {
      const output = document.createElement("canvas");
      output.width = kind === "avatar" ? 1024 : 2048;
      output.height = Math.round(output.width / aspect);
      const crop = cropRectangle(
        image.naturalWidth,
        image.naturalHeight,
        aspect,
        zoom,
        pan.x,
        pan.y,
      );
      const context = output.getContext("2d");
      if (!context) throw new Error("Pratinjau tidak tersedia.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, output.width, output.height);
      context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        output.width,
        output.height,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(new Error("Foto belum dapat diproses.")),
          "image/jpeg",
          0.9,
        ),
      );
      if (
        await onSave(
          new File([blob], `${kind}-cropped.jpg`, { type: "image/jpeg" }),
        )
      )
        onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Foto belum dapat diproses.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open && !locked) onClose();
      }}
      title={kind === "avatar" ? "Atur foto profil" : "Atur foto sampul"}
      description="Geser foto dan atur perbesaran. Gunakan tombol panah untuk menggeser dengan keyboard."
    >
      {!image && !error && <p role="status">Membuka foto...</p>}
      <canvas
        ref={canvas}
        width={600}
        height={600 / aspect}
        tabIndex={0}
        role="img"
        aria-label="Pratinjau foto; gunakan tombol panah untuk menggeser"
        className={`mx-auto w-full max-w-80 touch-none bg-[var(--soft)] ${kind === "avatar" ? "rounded-full" : "rounded-xl"} ${locked ? "cursor-wait" : "cursor-grab active:cursor-grabbing"}`}
        onPointerDown={(event) => {
          if (!image || locked) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
          };
        }}
        onPointerMove={(event) => {
          if (!drag.current || !image || locked) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const crop = cropRectangle(
            image.naturalWidth,
            image.naturalHeight,
            aspect,
            zoom,
            pan.x,
            pan.y,
          );
          setPan({
            x: Math.max(
              0,
              Math.min(
                1,
                drag.current.panX -
                  ((event.clientX - drag.current.x) * crop.width) /
                    rect.width /
                    Math.max(1, image.naturalWidth - crop.width),
              ),
            ),
            y: Math.max(
              0,
              Math.min(
                1,
                drag.current.panY -
                  ((event.clientY - drag.current.y) * crop.height) /
                    rect.height /
                    Math.max(1, image.naturalHeight - crop.height),
              ),
            ),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (
            locked ||
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          )
            return;
          event.preventDefault();
          setPan((p) => ({
            x: Math.max(
              0,
              Math.min(
                1,
                p.x +
                  (event.key === "ArrowRight"
                    ? 0.03
                    : event.key === "ArrowLeft"
                      ? -0.03
                      : 0),
              ),
            ),
            y: Math.max(
              0,
              Math.min(
                1,
                p.y +
                  (event.key === "ArrowDown"
                    ? 0.03
                    : event.key === "ArrowUp"
                      ? -0.03
                      : 0),
              ),
            ),
          }));
        }}
      />
      <label
        className="mt-5 flex items-center justify-between text-sm"
        htmlFor="photo-zoom"
      >
        Perbesaran foto
        <span className="text-xs text-[var(--muted)]">{zoom.toFixed(1)}x</span>
      </label>
      <input
        id="photo-zoom"
        type="range"
        min="1"
        max="3"
        step="0.05"
        value={zoom}
        disabled={locked || !image}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="my-3 w-full accent-[var(--foreground)]"
      />
      {(error || uploadError) && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error || uploadError}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={locked}
          onClick={() => {
            setZoom(1);
            setPan({ x: 0.5, y: 0.5 });
          }}
        >
          Atur ulang
        </Button>
        <Button disabled={locked || !image} onClick={save}>
          {locked ? "Menyimpan..." : "Simpan foto"}
        </Button>
      </div>
    </ConfirmDialog>
  );
}
