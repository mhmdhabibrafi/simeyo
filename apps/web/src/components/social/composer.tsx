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
import { clearDraft, draftKey, readDraft, saveDraft } from "@/lib/drafts";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/app-shell";
import { useToast } from "@/components/providers";
import {
  mediaSchema,
  type Media,
} from "../../../../../packages/api-contracts/src/social";
type ComposerProps = {
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
  onStateChange?: (state: {
    dirty: boolean;
    busy: boolean;
    saved: boolean;
  }) => void;
};

export function Composer(props: ComposerProps) {
  const { data: user } = useMe();
  if (!user?.verified || !user.email_verified) return null;
  const context = props.editId
    ? `edit:${props.editId}`
    : props.parentId
      ? `reply:${props.parentId}`
      : props.quoteId
        ? `quote:${props.quoteId}`
        : props.communityId
          ? `community:${props.communityId}`
          : "new";
  const storageKey = draftKey(user.id, context);
  return (
    <ComposerEditor
      key={storageKey}
      {...props}
      user={user}
      storageKey={storageKey}
    />
  );
}

function ComposerEditor({
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
  user,
  storageKey,
}: ComposerProps & {
  user: NonNullable<ReturnType<typeof useMe>["data"]>;
  storageKey: string;
}) {
  const inputId = useId();
  const client = useQueryClient();
  const toast = useToast();
  const [restored] = useState(() => readDraft(storageKey));
  const [body, setBody] = useState(restored?.body ?? initialBody);
  const [visibility, setVisibility] = useState(
    restored?.visibility ?? initialVisibility,
  );
  const [saved, setSaved] = useState<boolean | null>(null);
  function persist(text: string, audience: "campus" | "followers") {
    setSaved(saveDraft(storageKey, text, audience));
  }
  const [images, setImages] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(!compact || !!restored);
  const file = useRef<HTMLInputElement>(null);
  const request = useRef<{ payload: string; id: string } | null>(
    restored?.request ?? null,
  );
  const dirty =
    (editId
      ? body !== initialBody || visibility !== initialVisibility
      : !!body.trim()) ||
    images.length > 0 ||
    pendingFiles.length > 0;
  useEffect(() => {
    onStateChange?.({ dirty, busy, saved: saved !== false });
  }, [dirty, busy, saved, onStateChange]);
  useEffect(() => {
    if (!dirty && !busy) return;
    if (
      !busy &&
      !images.length &&
      !pendingFiles.length &&
      (saved === true || (saved === null && restored))
    )
      return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy, images.length, pendingFiles.length, saved, restored]);
  async function upload(files: FileList | File[] | null) {
    if (!files || busy) return;
    const selected = Array.from(files);
    if (!selected.length) return;
    setExpanded(true);
    if (
      selected.some(
        (image) =>
          !["image/jpeg", "image/png", "image/webp"].includes(image.type),
      )
    ) {
      setError("Gunakan gambar JPG, PNG, atau WebP.");
      if (file.current) file.current.value = "";
      return;
    }
    setBusy(true);
    setPendingFiles(selected);
    setError("");
    try {
      for (const [index, image] of selected.entries()) {
        setUploadProgress(
          `Mengunggah gambar ${index + 1} dari ${selected.length}…`,
        );
        const data = new FormData();
        data.set("image", image);
        const r = await api<{ data: unknown }>("media/posts", {
          method: "POST",
          body: data,
        });
        setImages((old) => [...old, mediaSchema.parse(r.data)]);
        setPendingFiles(selected.slice(index + 1));
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Upload belum berhasil.",
      );
    } finally {
      setBusy(false);
      setUploadProgress("");
      if (file.current) file.current.value = "";
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      busy ||
      pendingFiles.length ||
      (!body.trim() && !images.length && !existingImageCount)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const draft = {
        body,
        visibility,
        parent_id: parentId,
        community_id: communityId,
        quote_id: quoteId,
        media_ids: images.map((i) => i.id),
      };
      const payload = JSON.stringify(draft);
      if (!request.current || request.current.payload !== payload) {
        request.current = { payload, id: crypto.randomUUID() };
      }
      setSaved(saveDraft(storageKey, body, visibility, request.current));
      await api(editId ? `posts/${editId}` : "posts", {
        method: editId ? "PATCH" : "POST",
        body: editId
          ? payload
          : JSON.stringify({
              ...draft,
              client_id: request.current.id,
            }),
      });
      request.current = null;
      clearDraft(storageKey);
      setSaved(null);
      setBody("");
      setImages([]);
      if (compact) setExpanded(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["daily-streak"] }),
        client.invalidateQueries({ queryKey: ["feed"] }),
        client.invalidateQueries({ queryKey: ["post"] }),
        client.invalidateQueries({ queryKey: ["post-search"] }),
        client.invalidateQueries({ queryKey: ["pulse"] }),
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
  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className={compact ? "px-5 py-5 sm:px-6" : "py-2"}
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3">
        <div className="row-span-2 self-start">
          <Avatar name={user.name} url={user.avatar_url} size={40} />
        </div>
        <div className="contents">
          {!compact && (
            <p className="col-start-2 mb-1 text-sm font-semibold">
              {user.username ?? user.name}
            </p>
          )}
          <label className="sr-only" htmlFor={`composer-${inputId}`}>
            {parentId ? "Tulis balasan" : "Tulis cerita"}
          </label>
          <textarea
            id={`composer-${inputId}`}
            value={body}
            autoFocus={autoFocus}
            onChange={(e) => {
              setBody(e.target.value);
              persist(e.target.value, visibility);
            }}
            onFocus={() => setExpanded(true)}
            disabled={busy}
            maxLength={1000}
            rows={compact && !expanded ? 1 : compact ? 3 : 4}
            placeholder={
              parentId
                ? "Tambahkan sudut pandangmu…"
                : "Apa cerita kampusmu hari ini?"
            }
            className="col-start-2 w-full resize-none bg-transparent py-2 text-[15px] leading-7 outline-none placeholder:text-[var(--muted)] focus-visible:outline-none"
            required={
              !!editId && images.length === 0 && existingImageCount === 0
            }
          />
          {images.length > 0 && (
            <div className="col-start-2 mb-4 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-xl">
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
            <div className="col-span-2 mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <div className="flex items-center gap-1">
                {!editId && (
                  <>
                    <input
                      className="sr-only"
                      type="file"
                      ref={file}
                      multiple
                      disabled={busy || pendingFiles.length > 0}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => upload(e.target.files)}
                      aria-label="Lampirkan gambar"
                    />
                    <button
                      type="button"
                      className="icon-button text-[var(--muted)]"
                      aria-label="Tambah gambar"
                      disabled={busy || pendingFiles.length > 0}
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
                        onValueChange={(value) => {
                          const audience = value as "campus" | "followers";
                          setVisibility(audience);
                          persist(body, audience);
                        }}
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
                <span className="hidden text-[11px] tabular-nums text-[var(--muted)] sm:inline">
                  {body.length}/1000
                </span>
                <Button
                  className="min-h-10 px-4"
                  disabled={
                    busy ||
                    pendingFiles.length > 0 ||
                    (!!editId && !dirty) ||
                    (!body.trim() && !images.length && !existingImageCount)
                  }
                >
                  {busy
                    ? uploadProgress
                      ? "Mengunggah…"
                      : "Menyimpan…"
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
          {uploadProgress && (
            <p
              role="status"
              className="col-span-2 mt-3 text-xs text-[var(--muted)]"
            >
              {uploadProgress}
            </p>
          )}
          {!busy && pendingFiles.length > 0 && (
            <div className="col-span-2 mt-3 rounded-xl bg-[var(--soft)] p-3 text-sm">
              <p className="break-words">
                Belum terunggah:{" "}
                {pendingFiles.map((image) => image.name).join(", ")}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="min-h-10 underline"
                  onClick={() => upload(pendingFiles)}
                >
                  Coba unggah lagi
                </button>
                <button
                  type="button"
                  className="min-h-10 text-[var(--muted)]"
                  onClick={() => {
                    setPendingFiles([]);
                    setError("");
                  }}
                >
                  Batalkan lampiran gagal
                </button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="col-span-2 mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {!busy && (restored || saved !== null) && body.trim() && (
            <p
              role="status"
              className="col-span-2 mt-3 text-xs leading-5 text-[var(--muted)]"
            >
              {saved === false
                ? "Draf belum tersimpan di perangkat. Jangan tutup halaman ini."
                : restored && saved === null
                  ? "Draf teks dipulihkan."
                  : "Draf teks tersimpan di perangkat ini."}{" "}
              Gambar perlu dipilih ulang setelah memuat ulang halaman.
            </p>
          )}
          {expanded && (
            <p className="col-span-2 mt-3 text-xs leading-5 text-[var(--muted)]">
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
