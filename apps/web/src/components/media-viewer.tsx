"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { ConfirmDialog } from "./ui/dialog";

type Picture = { url: string; width: number; height: number };
export function MediaViewer({
  open,
  onOpenChange,
  images,
  index,
  onIndexChange,
  title = "Gambar cerita",
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  images: Picture[];
  index: number;
  onIndexChange: (index: number) => void;
  title?: string;
}) {
  const image = images[index];
  return (
    <ConfirmDialog
      open={open && !!image}
      onOpenChange={onOpenChange}
      title={`${title} · ${index + 1} dari ${images.length}`}
      variant="media"
      description="Geser untuk berpindah foto. Cubit atau gunakan tombol untuk memperbesar. Escape untuk menutup."
      className="w-full max-w-4xl rounded-none px-4 pb-4 pt-16 sm:w-[calc(100%-2rem)] sm:rounded-3xl sm:px-6"
    >
      {image && (
        <Slide
          image={image}
          index={index}
          total={images.length}
          title={title}
          onIndexChange={onIndexChange}
        />
      )}
    </ConfirmDialog>
  );
}

function Slide({
  image,
  index,
  total,
  title,
  onIndexChange,
}: {
  image: Picture;
  index: number;
  total: number;
  title: string;
  onIndexChange: (index: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  function move(x: number, y: number, scale = zoom) {
    const w = stage.current?.clientWidth ?? 0,
      h = stage.current?.clientHeight ?? 0;
    setPan({
      x: Math.max((-w * (scale - 1)) / 2, Math.min((w * (scale - 1)) / 2, x)),
      y: Math.max((-h * (scale - 1)) / 2, Math.min((h * (scale - 1)) / 2, y)),
    });
  }
  function scale(value: number) {
    const next = Math.max(1, Math.min(4, value));
    setZoom(next);
    move(pan.x, pan.y, next);
  }
  function navigate(delta: number) {
    const next = Math.max(0, Math.min(total - 1, index + delta));
    if (next === index) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFailed(false);
    onIndexChange(next);
  }
  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const delta = event.key === "ArrowRight" ? 1 : -1;
          if (zoom > 1) move(pan.x - delta * 40, pan.y);
          else navigate(delta);
        }
      }}
    >
      <p role="status" className="absolute left-5 top-6 text-sm tabular-nums">
        {index + 1} / {total}
      </p>
      <div
        ref={stage}
        tabIndex={0}
        aria-label="Gambar diperbesar; geser atau gunakan panah kiri dan kanan"
        className="media-stage relative overflow-hidden rounded-xl bg-[var(--soft)] outline-offset-2"
        style={{ touchAction: "none" }}
        onDoubleClick={() => scale(zoom === 1 ? 2 : 1)}
        onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
          if (event.pointerType === "mouse" && event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          points.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (points.current.size === 1)
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              px: pan.x,
              py: pan.y,
            };
          if (points.current.size === 2) {
            const [a, b] = [...points.current.values()];
            pinch.current = {
              distance: Math.hypot(a.x - b.x, a.y - b.y),
              zoom,
            };
            drag.current = null;
          }
        }}
        onPointerMove={(event) => {
          if (!points.current.has(event.pointerId)) return;
          points.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (points.current.size === 2 && pinch.current) {
            const [a, b] = [...points.current.values()];
            if (pinch.current.distance > 0)
              scale(
                (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
                  pinch.current.distance,
              );
          } else if (drag.current && zoom > 1)
            move(
              drag.current.px + event.clientX - drag.current.x,
              drag.current.py + event.clientY - drag.current.y,
            );
        }}
        onPointerUp={(event) => {
          if (points.current.size === 1 && drag.current && zoom === 1) {
            const dx = event.clientX - drag.current.x,
              dy = event.clientY - drag.current.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4)
              navigate(dx < 0 ? 1 : -1);
          }
          points.current.delete(event.pointerId);
          drag.current = null;
          pinch.current = null;
        }}
        onPointerCancel={(event) => {
          points.current.delete(event.pointerId);
          drag.current = null;
          pinch.current = null;
        }}
        onLostPointerCapture={(event) => {
          points.current.delete(event.pointerId);
          drag.current = null;
          pinch.current = null;
        }}
      >
        {failed ? (
          <button
            type="button"
            className="absolute inset-0 min-h-11 text-sm underline"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Coba muat foto lagi
          </button>
        ) : (
          <Image
            key={attempt}
            unoptimized
            src={image.url}
            alt={`${title} diperbesar ${index + 1} dari ${total}`}
            width={image.width}
            height={image.height}
            draggable={false}
            onError={() => setFailed(true)}
            className="h-full w-full select-none object-contain"
            style={{
              transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            }}
          />
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-1">
        <button
          type="button"
          className="icon-button shrink-0"
          aria-label="Gambar sebelumnya"
          disabled={index === 0}
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            className="icon-button"
            aria-label="Perkecil foto"
            disabled={zoom === 1}
            onClick={() => scale(zoom - 0.5)}
          >
            <Minus size={18} />
          </button>
          <span
            className="w-10 text-center text-xs tabular-nums"
            aria-label="Perbesaran foto"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Perbesar foto"
            disabled={zoom === 4}
            onClick={() => scale(zoom + 0.5)}
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Atur ulang zoom"
            disabled={zoom === 1}
            onClick={() => scale(1)}
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <button
          type="button"
          className="icon-button shrink-0"
          aria-label="Gambar berikutnya"
          disabled={index === total - 1}
          onClick={() => navigate(1)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
