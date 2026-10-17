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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import { api, ApiError, uploadWithProgress } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { clearDraft, draftKey, readDraft, saveDraft } from "@/lib/drafts";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/app-shell";
import { useToast } from "@/components/providers";
import {
  mediaSchema,
  type Media,
} from "../../../../../packages/api-contracts/src/social";
type Attachment = {
  key: string;
  file: File;
  media?: Media;
  progress: number;
  status: "queued" | "uploading" | "done" | "failed";
};
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const images = attachments.flatMap((item) =>
    item.media ? [item.media] : [],
  );
  const pendingFiles = attachments
    .filter((item) => !item.media)
    .map((item) => item.file);
  const actionLock = useRef(false);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => () => uploadController.current?.abort(), []);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
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
  function moveImage(id: number, delta: number) {
    if (actionLock.current || pendingFiles.length) return;
    setAttachments((old) => {
      const next = [...old],
        index = next.findIndex((item) => item.media?.id === id),
        target = index + delta;
      if (index < 0 || target < 0 || target >= next.length) return old;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  async function processUploads(selected: Attachment[]) {
    if (!selected.length || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    uploadController.current = controller;
    const update = (key: string, patch: Partial<Attachment>) =>
      setAttachments((old) =>
        old.map((item) => (item.key === key ? { ...item, ...patch } : item)),
      );
    try {
      for (const [index, item] of selected.entries()) {
        if (controller.signal.aborted) break;
        setUploadProgress(
          `Mengunggah gambar ${index + 1} dari ${selected.length}...`,
        );
        update(item.key, { status: "uploading", progress: 0 });
        const data = new FormData();
        data.set("image", item.file);
        try {
          const r = await uploadWithProgress<{ data: unknown }>(
            "media/posts",
            data,
            (percent) => update(item.key, { progress: percent }),
            controller.signal,
          );
          update(item.key, {
            media: mediaSchema.parse(r.data),
            progress: 100,
            status: "done",
          });
        } catch (e) {
          if (controller.signal.aborted) break;
          update(item.key, { status: "failed" });
          setError(
            e instanceof ApiError
              ? Object.values(e.errors).flat().join(" ") || e.message
              : "Upload belum berhasil.",
          );
        }
      }
    } finally {
      actionLock.current = false;
      setBusy(false);
      setUploadProgress("");
      uploadController.current = null;
      if (file.current) file.current.value = "";
    }
  }
  async function upload(files: FileList | File[] | null) {
    if (!files || actionLock.current) return;
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
    const items: Attachment[] = selected.map((image) => ({
      key: crypto.randomUUID(),
      file: image,
      progress: 0,
      status: "queued",
    }));
    setAttachments((old) => [...old, ...items]);
    await processUploads(items);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      actionLock.current ||
      pendingFiles.length ||
      (!body.trim() && !images.length && !existingImageCount)
    )
      return;
    actionLock.current = true;
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
      setAttachments([]);
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
      actionLock.current = false;
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
              {images.map((m, index) => (
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
                    className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white"
                    aria-label="Hapus lampiran"
                    disabled={busy}
                    onClick={async () => {
                      if (actionLock.current) return;
                      actionLock.current = true;
                      setBusy(true);
                      try {
                        await api(`media/posts/${m.id}`, { method: "DELETE" });
                        setAttachments((old) =>
                          old.filter((item) => item.media?.id !== m.id),
                        );
                      } catch {
                        setError("Lampiran belum dapat dihapus.");
                      } finally {
                        actionLock.current = false;
                        setBusy(false);
                      }
                    }}
                  >
                    <X size={14} />
                  </button>
                  <div className="flex items-center justify-between gap-1 py-1">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Geser gambar ${index + 1} ke kiri`}
                      disabled={busy || !!pendingFiles.length || index === 0}
                      onClick={() => moveImage(m.id, -1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs tabular-nums text-[var(--muted)]">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Geser gambar ${index + 1} ke kanan`}
                      disabled={
                        busy ||
                        !!pendingFiles.length ||
                        index === images.length - 1
                      }
                      onClick={() => moveImage(m.id, 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
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
          {(uploadProgress || pendingFiles.length > 0) && (
            <ul
              aria-label="Progres unggahan foto"
              className="col-span-2 mt-3 space-y-2"
            >
              {attachments.map((item) => (
                <li key={item.key} className="text-xs">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{item.file.name}</span>
                    <span className="shrink-0 text-[var(--muted)]">
                      {item.status === "done"
                        ? "Terunggah"
                        : item.status === "failed"
                          ? "Gagal"
                          : item.status === "queued"
                            ? "Menunggu"
                            : item.progress === 100
                              ? "Memproses..."
                              : `${item.progress}%`}
                    </span>
                  </div>
                  {item.status === "uploading" && (
                    <progress
                      className="mt-1 h-1 w-full accent-[var(--foreground)]"
                      max={100}
                      value={item.progress}
                      aria-label={`Progres ${item.file.name}`}
                    />
                  )}
                  {item.status === "failed" && !busy && (
                    <button
                      type="button"
                      className="min-h-11 underline"
                      aria-label={`Coba unggah ${item.file.name}`}
                      onClick={() => processUploads([item])}
                    >
                      Coba foto ini lagi
                    </button>
                  )}
                </li>
              ))}
            </ul>
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
                  onClick={() =>
                    processUploads(attachments.filter((item) => !item.media))
                  }
                >
                  Coba unggah lagi
                </button>
                <button
                  type="button"
                  className="min-h-10 text-[var(--muted)]"
                  onClick={() => {
                    setAttachments((old) => old.filter((item) => !!item.media));
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
