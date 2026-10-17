"use client";
import Image from "next/image";
import { useState } from "react";
import { RotateCw } from "lucide-react";
export function ProfileCover({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  if (failed === url)
    return (
      <button
        type="button"
        aria-label="Coba muat sampul lagi"
        title="Sampul belum termuat. Coba lagi."
        className="flex h-full min-h-11 w-full items-center justify-center bg-[var(--soft)] text-[var(--muted)]"
        onClick={() => {
          setFailed(null);
          setAttempt((n) => n + 1);
        }}
      >
        <RotateCw size={20} aria-hidden="true" />
        <span className="sr-only">Sampul belum termuat</span>
      </button>
    );
  return (
    <Image
      key={url + attempt}
      unoptimized
      src={url}
      alt={alt}
      width={1600}
      height={533}
      className="h-full w-full object-cover"
      onError={() => setFailed(url)}
    />
  );
}
