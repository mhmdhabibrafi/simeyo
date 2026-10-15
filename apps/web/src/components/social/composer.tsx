"use client";
import { useState, useRef, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/app-shell";
import { useToast } from "@/components/providers";
import {
  mediaSchema,
  type Media,
} from "../../../../../packages/api-contracts/src/social";
export function Composer({
  parentId,
  communityId,
  quoteId,
  initialBody = "",
  initialVisibility = "campus",
  editId,
  onDone,
  compact = false,
  existingImageCount = 0,
}: {
  parentId?: number;
  communityId?: number;
  quoteId?: number;
  initialBody?: string;
  initialVisibility?: "campus" | "followers";
  editId?: number;
  onDone?: () => void;
  compact?: boolean;
  existingImageCount?: number;
}) {
  const { data: user } = useMe();
  const inputId = useId();
  const client = useQueryClient();
  const toast = useToast();
  const [body, setBody] = useState(initialBody);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [images, setImages] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files) return;
    if (files.length + images.length > 4) {
      setError("Maksimal 4 gambar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const image of Array.from(files)) {
        const data = new FormData();
        data.set("image", image);
        const r = await api<{ data: unknown }>("media/posts", {
          method: "POST",
          body: data,
        });
        setImages((old) => [...old, mediaSchema.parse(r.data)]);
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Upload belum berhasil.",
      );
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(editId ? `posts/${editId}` : "posts", {
        method: editId ? "PATCH" : "POST",
        body: JSON.stringify({
          body,
          visibility,
          parent_id: parentId,
          community_id: communityId,
          quote_id: quoteId,
          media_ids: images.map((i) => i.id),
        }),
      });
      setBody("");
      setImages([]);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["feed"] }),
        client.invalidateQueries({ queryKey: ["post"] }),
      ]);
      toast(editId ? "Cerita diperbarui." : "Cerita dibagikan.");
      onDone?.();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Cerita belum tersimpan. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!user?.verified || !user.email_verified) return null;
  return (
    <form onSubmit={submit} className={compact ? "p-5" : "py-2"}>
      <div className="flex gap-3">
        <Avatar name={user.name} url={user.avatar_url} size={40} />
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={`composer-${inputId}`}>
            {parentId ? "Tulis balasan" : "Tulis cerita"}
          </label>
          <textarea
            id={`composer-${inputId}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={compact ? 2 : 4}
            placeholder={
              parentId
                ? "Tambahkan sudut pandangmu…"
                : "Apa cerita kampusmu hari ini?"
            }
            className="w-full resize-none bg-transparent py-2 text-[15px] leading-7 outline-none placeholder:text-[var(--muted)] focus-visible:outline-none"
            required={
              !!editId && images.length === 0 && existingImageCount === 0
            }
          />
          {images.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {images.map((m) => (
                <div key={m.id} className="relative">
                  <Image
                    unoptimized
                    src={m.url}
                    alt="Pratinjau lampiran"
                    width={m.width}
                    height={m.height}
                    className="h-32 w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-2 text-white"
                    aria-label="Hapus lampiran"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api(`media/posts/${m.id}`, { method: "DELETE" });
                        setImages(images.filter((i) => i.id !== m.id));
                      } catch {
                        setError("Lampiran belum dapat dihapus.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {!editId && (
                <>
                  <input
                    className="sr-only"
                    type="file"
                    ref={file}
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => upload(e.target.files)}
                    aria-label="Lampirkan gambar"
                  />
                  <button
                    type="button"
                    className="icon-button text-[var(--muted)]"
                    aria-label="Tambah gambar"
                    disabled={busy}
                    onClick={() => file.current?.click()}
                  >
                    <ImagePlus size={20} />
                  </button>
                </>
              )}
              <label className="sr-only" htmlFor={`audience-${inputId}`}>
                Visibilitas cerita
              </label>
              <select
                id={`audience-${inputId}`}
                className="max-w-40 rounded-lg bg-transparent px-2 py-2 text-xs text-[var(--muted)]"
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as "campus" | "followers")
                }
              >
                <option value="campus">Komunitas kampus</option>
                <option value="followers">Hanya pengikut</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[var(--muted)]">
                {body.length}/1000
              </span>
              <Button
                className="min-h-10 px-4"
                disabled={
                  busy ||
                  (!body.trim() && !images.length && !existingImageCount)
                }
              >
                {busy
                  ? "Menyimpan…"
                  : editId
                    ? "Simpan"
                    : parentId
                      ? "Balas"
                      : "Bagikan"}
                <ArrowUpRight size={15} />
              </Button>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">
            {user.private_account
              ? "Akun privat: cerita hanya dapat dibaca pengikut yang disetujui."
              : "Cerita tersedia untuk anggota kampus yang terverifikasi."}
          </p>
        </div>
      </div>
    </form>
  );
}
