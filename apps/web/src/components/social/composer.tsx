"use client";
import { useState, useRef, useId, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ImagePlus,
  X,
  ArrowUpRight,
  ChevronDown,
  Check,
  Globe2,
  Users,
} from "lucide-react";
import * as Menu from "@radix-ui/react-dropdown-menu";
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
  autoFocus = false,
  onStateChange,
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
  autoFocus?: boolean;
  onStateChange?: (state: { dirty: boolean; busy: boolean }) => void;
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
  const [expanded, setExpanded] = useState(!compact);
  const file = useRef<HTMLInputElement>(null);
  const dirty = !!body.trim() || images.length > 0;
  useEffect(() => {
    onStateChange?.({ dirty, busy });
  }, [dirty, busy, onStateChange]);
  async function upload(files: FileList | null) {
    if (!files || busy) return;
    setExpanded(true);
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
    if (busy) return;
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
      if (compact) setExpanded(false);
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
    <form onSubmit={submit} className={compact ? "px-5 py-5 sm:px-6" : "py-2"}>
      <div className="flex gap-3">
        <Avatar name={user.name} url={user.avatar_url} size={40} />
        <div className="min-w-0 flex-1">
          {!compact && (
            <p className="mb-1 text-sm font-semibold">
              {user.username ?? user.name}
              <span className="ml-2 font-normal text-[var(--muted)]">
                · {visibility === "campus" ? "Kampus" : "Pengikut"}
              </span>
            </p>
          )}
          <label className="sr-only" htmlFor={`composer-${inputId}`}>
            {parentId ? "Tulis balasan" : "Tulis cerita"}
          </label>
          <textarea
            id={`composer-${inputId}`}
            value={body}
            autoFocus={autoFocus}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setExpanded(true)}
            disabled={busy}
            maxLength={1000}
            rows={compact && !expanded ? 1 : compact ? 3 : 4}
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
          {expanded && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <button
                      type="button"
                      id={`audience-${inputId}`}
                      aria-label="Visibilitas cerita"
                      disabled={busy}
                      className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--soft)]"
                    >
                      {visibility === "campus" ? (
                        <Globe2 size={15} />
                      ) : (
                        <Users size={15} />
                      )}
                      {visibility === "campus" ? "Kampus" : "Pengikut"}
                      <ChevronDown size={13} />
                    </button>
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Content
                      align="start"
                      sideOffset={8}
                      collisionPadding={16}
                      className="z-[70] min-w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl"
                    >
                      <Menu.Label className="px-3 pb-2 pt-2 text-xs font-semibold text-[var(--muted)]">
                        Siapa yang bisa melihat?
                      </Menu.Label>
                      <Menu.RadioGroup
                        value={visibility}
                        onValueChange={(value) =>
                          setVisibility(value as "campus" | "followers")
                        }
                      >
                        {[
                          {
                            value: "campus",
                            label: "Kampus",
                            description: "Anggota kampus yang terverifikasi",
                            icon: Globe2,
                          },
                          {
                            value: "followers",
                            label: "Hanya pengikut",
                            description: "Pengikutmu di kampus ini",
                            icon: Users,
                          },
                        ].map((option) => (
                          <Menu.RadioItem
                            key={option.value}
                            value={option.value}
                            aria-label={option.label}
                            className="relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 pr-9 outline-none data-[highlighted]:bg-[var(--soft)]"
                          >
                            <option.icon size={18} />
                            <div>
                              <p className="text-sm font-medium">
                                {option.label}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--muted)]">
                                {option.description}
                              </p>
                            </div>
                            <Menu.ItemIndicator className="absolute right-3">
                              <Check size={16} />
                            </Menu.ItemIndicator>
                          </Menu.RadioItem>
                        ))}
                      </Menu.RadioGroup>
                    </Menu.Content>
                  </Menu.Portal>
                </Menu.Root>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] tabular-nums text-[var(--muted)]">
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
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {expanded && (
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              {user.private_account
                ? "Akun privat: cerita hanya dapat dibaca pengikut yang disetujui."
                : visibility === "followers"
                  ? "Hanya pengikutmu yang dapat melihat cerita ini."
                  : "Cerita tersedia untuk anggota kampus yang terverifikasi."}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
