"use client";
import { useEffect, useSyncExternalStore } from "react";
export function MotionPreference({ control = false }: { control?: boolean }) {
  const value = useSyncExternalStore(
    (callback) => {
      window.addEventListener("simeyo-motion", callback);
      return () => window.removeEventListener("simeyo-motion", callback);
    },
    () => document.documentElement.dataset.motion ?? "system",
    () => "system",
  );
  useEffect(() => {
    try {
      const saved = localStorage.getItem("simeyo-motion");
      if (saved === "reduce") {
        document.documentElement.dataset.motion = saved;
        window.dispatchEvent(new Event("simeyo-motion"));
      }
    } catch {
      /* System preference remains available. */
    }
  }, []);
  if (!control) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <label htmlFor="motion-preference" className="text-sm font-medium">
          Animasi
        </label>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Preferensi kurangi gerakan perangkat selalu dihormati.
        </p>
      </div>
      <select
        id="motion-preference"
        className="field w-auto min-h-11"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          document.documentElement.dataset.motion = next;
          window.dispatchEvent(new Event("simeyo-motion"));
          try {
            localStorage.setItem("simeyo-motion", next);
          } catch {
            /* Applies to the current page without storage. */
          }
        }}
      >
        <option value="system">Ikuti perangkat</option>
        <option value="reduce">Kurangi gerakan</option>
      </select>
    </div>
  );
}
