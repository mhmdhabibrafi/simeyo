"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/auth";
import { clearDraft, draftKey } from "@/lib/drafts";
import { useState } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  Heart,
  Repeat2,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  BadgeCheck,
  LockKeyhole,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Flag,
  EyeOff,
  ThumbsDown,
  ExternalLink,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { type Post } from "../../../../../packages/api-contracts/src/social";
import { useInteraction } from "@/lib/social";
import { api } from "@/lib/api";
import { Avatar } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers";
import { Composer } from "./composer";
function LinkPreview({ body }: { body: string }) {
  const match = body
    .match(/https?:\/\/[^\s<>]+/i)?.[0]
    ?.replace(/[.,;!?)]+$/, "");
  if (!match) return null;
  let url: URL;
  try {
    url = new URL(match);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  return (
    <a
      href={url.href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex min-h-20 items-center gap-3 rounded-2xl border border-[var(--border)] p-4 hover:bg-[var(--soft)]"
      aria-label={`Buka tautan ${url.hostname}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--soft)]">
        <ExternalLink size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {url.hostname}
        </span>
        <span className="mt-1 block truncate text-xs text-[var(--muted)]">
          {url.pathname === "/" ? "Buka situs" : url.pathname}
        </span>
      </span>
    </a>
  );
}
export function PostBody({ body }: { body: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.65]">
      {body
        .split(/(https?:\/\/[^\s]+|@[a-zA-Z0-9_]{3,24}|#[\p{L}\p{N}_]{2,40})/gu)
        .map((part, i) =>
          /^https?:\/\//.test(part) ? (
            <a
              key={i}
              href={part}
              rel="noopener noreferrer"
              target="_blank"
              className="text-[var(--accent)] hover:underline"
            >
              {part}
            </a>
          ) : part.startsWith("@") ? (
            <Link
              key={i}
              href={`/u/${part.slice(1)}`}
              className="text-[var(--accent)] hover:underline"
            >
              {part}
            </Link>
          ) : part.startsWith("#") ? (
            <Link
              key={i}
              href={`/topics/${encodeURIComponent(part.slice(1).toLowerCase())}`}
              className="text-[var(--accent)] hover:underline"
            >
              {part}
            </Link>
          ) : (
            part
          ),
        )}
    </p>
  );
}
export function PostCard({
  post,
  detail = false,
  feedControls = false,
}: {
  post: Post;
  detail?: boolean;
  feedControls?: boolean;
}) {
  const interaction = useInteraction(post);
  const router = useRouter();
  const { data: me } = useMe();
  const [discard, setDiscard] = useState(false);
  const [editor, setEditor] = useState({
    dirty: false,
    busy: false,
    saved: true,
  });
  const client = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState<
    "edit" | "quote" | "report" | "delete" | "media" | null
  >(null);
  const [imageIndex, setImageIndex] = useState(0);
  const image = post.media[imageIndex];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const time = new Date(post.created_at);
  const [now] = useState(() => Date.now());
  const age = Math.max(0, Math.floor((now - time.getTime()) / 60000));
  const label =
    age < 1
      ? "Baru saja"
      : age < 60
        ? `${age}m`
        : age < 1440
          ? `${Math.floor(age / 60)}j`
          : time.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            });
  function open(type: typeof dialog) {
    setError("");
    setEditor({ dirty: false, busy: false, saved: true });
    setDialog(type);
  }
  async function remove() {
    setBusy(true);
    try {
      await api(`posts/${post.id}`, { method: "DELETE" });
      client.removeQueries({ queryKey: ["post", post.id] });
      if (me) clearDraft(draftKey(me.id, `edit:${post.id}`));
      await Promise.all(
        ["feed", "post-search", "pulse", "topic-search"].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      setDialog(null);
      toast("Cerita dihapus.");
      if (detail) router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cerita belum dapat dihapus.");
    } finally {
      setBusy(false);
    }
  }
  async function report(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`posts/${post.id}/report`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      setDialog(null);
      toast("Laporan diterima untuk ditinjau.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laporan belum tersimpan.");
    } finally {
      setBusy(false);
    }
  }
  async function feedback(reduce: boolean | null) {
    setBusy(true);
    try {
      await api(`posts/${post.id}/feedback`, {
        method: reduce === null ? "DELETE" : "PUT",
        ...(reduce === null
          ? {}
          : { body: JSON.stringify({ reduce_author: reduce }) }),
      });
      toast(
        reduce
          ? "Cerita dari akun ini akan lebih jarang muncul di Untukmu."
          : "Cerita disembunyikan dari beranda.",
      );
      await client.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "feed" &&
          ["for-you", "following", "campus"].includes(String(q.queryKey[1])),
      });
      client.removeQueries({ queryKey: ["feed-latest"] });
      client.invalidateQueries({ queryKey: ["feed-preferences"] });
    } catch {
      toast("Preferensi belum tersimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      data-post-id={post.id}
      className={`border-b border-[var(--border)] px-4 py-4 sm:px-6 ${detail ? "sm:py-6" : "transition-colors hover:bg-[var(--soft)]/40"}`}
    >
      {post.reposted_by && (
        <p className="mb-3 pl-12 text-[11px] text-[var(--muted)]">
          Dibagikan ulang oleh{" "}
          <Link href={`/u/${post.reposted_by}`} className="hover:underline">
            @{post.reposted_by}
          </Link>
        </p>
      )}
      <div className="flex gap-3">
        <Link
          href={`/u/${post.author.username}`}
          aria-label={`Profil ${post.author.name}`}
          className="self-start rounded-full"
        >
          <Avatar
            name={post.author.name}
            url={post.author.avatar_url}
            size={40}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <header className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <Link
                  href={`/u/${post.author.username}`}
                  className="truncate text-[14px] font-semibold tracking-[-.015em] hover:underline sm:text-[15px]"
                >
                  {post.author.name}
                </Link>
                {post.author.verified && (
                  <BadgeCheck
                    size={15}
                    className="shrink-0 text-[var(--accent)]"
                    aria-label="Afiliasi terverifikasi"
                  />
                )}
                <Link
                  href={`/thread/${post.id}`}
                  className="ml-1 shrink-0 text-xs text-[var(--muted)]"
                >
                  <time
                    dateTime={post.created_at}
                    title={time.toLocaleString("id-ID")}
                  >
                    {label}
                  </time>
                </Link>
              </div>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                @{post.author.username}
                {post.author.department && ` Â· ${post.author.department}`}
                {post.edited_at && " Â· Diedit"}
                {post.visibility === "followers" && (
                  <LockKeyhole
                    size={11}
                    className="ml-2 inline"
                    aria-label="Hanya pengikut"
                  />
                )}
              </p>
            </div>
            <Menu.Root>
              <Menu.Trigger asChild>
                <button
                  className="icon-button -mr-2 -mt-2 shrink-0 text-[var(--muted)]"
                  aria-label="Opsi cerita"
                >
                  <MoreHorizontal size={20} />
                </button>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Content
                  sideOffset={5}
                  align="end"
                  className="z-40 min-w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg"
                >
                  {feedControls && !post.can_edit && (
                    <>
                      <Menu.Item
                        className="menu-choice"
                        disabled={busy}
                        onSelect={() => feedback(false)}
                      >
                        <EyeOff
                          size={16}
                          className="mr-2 inline"
                          aria-hidden="true"
                        />{" "}
                        Sembunyikan cerita
                      </Menu.Item>
                      <Menu.Item
                        className="menu-choice"
                        disabled={busy}
                        onSelect={() => feedback(true)}
                      >
                        <ThumbsDown
                          size={16}
                          className="mr-2 inline"
                          aria-hidden="true"
                        />{" "}
                        Kurangi konten seperti ini
                      </Menu.Item>
                    </>
                  )}
                  {post.can_edit && (
                    <>
                      <Menu.Item
                        className="menu-choice"
                        onSelect={() => open("edit")}
                      >
                        <Pencil
                          size={16}
                          className="mr-2 inline"
                          aria-hidden="true"
                        />{" "}
                        Edit cerita
                      </Menu.Item>
                      <Menu.Item
                        className="menu-choice text-red-600"
                        onSelect={() => open("delete")}
                      >
                        <Trash2
                          size={16}
                          className="mr-2 inline"
                          aria-hidden="true"
                        />{" "}
                        Hapus cerita
                      </Menu.Item>
                    </>
                  )}
                  <Menu.Item
                    className="menu-choice"
                    onSelect={() => open("report")}
                  >
                    <Flag
                      size={16}
                      className="mr-2 inline"
                      aria-hidden="true"
                    />{" "}
                    Laporkan cerita
                  </Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu.Root>
          </header>
          {post.parent_id && !detail && (
            <Link
              href={`/thread/${post.parent_id}`}
              className="mb-2 inline-flex min-h-8 items-center text-xs text-[var(--muted)]"
            >
              Membalas percakapan â†—
            </Link>
          )}
          <PostBody body={post.body} />
          <LinkPreview body={post.body} />
          {post.media.length > 0 && (
            <div
              role="region"
              aria-label="Galeri gambar cerita"
              className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain rounded-2xl pb-1"
            >
              {post.media.map((m, index) => (
                <button
                  key={m.id}
                  className={`shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--border)] ${post.media.length > 1 ? "w-[85%]" : "w-full"}`}
                  aria-label="Lihat gambar cerita"
                  title={`Gambar ${index + 1} dari ${post.media.length}`}
                  onClick={() => {
                    setImageIndex(index);
                    open("media");
                  }}
                >
                  <Image
                    unoptimized
                    src={m.url}
                    alt="Gambar yang dilampirkan pada cerita"
                    width={m.width}
                    height={m.height}
                    sizes="(max-width: 768px) 80vw, 540px"
                    className={`w-full object-cover ${post.media.length > 1 ? "h-72 sm:h-80" : "max-h-[460px]"}`}
                  />
                </button>
              ))}
            </div>
          )}
          {post.quote && (
            <Link
              href={`/thread/${post.quote.id}`}
              className="mt-3 block rounded-2xl border border-[var(--border)] p-4 hover:bg-[var(--soft)]"
            >
              <p className="mb-2 text-xs font-semibold">
                {post.quote.author.name}{" "}
                <span className="font-normal text-[var(--muted)]">
                  @{post.quote.author.username}
                </span>
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {post.quote.body}
              </p>
              {post.quote.media.length > 0 && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {post.quote.media.length} gambar Â· Lihat cerita
                </p>
              )}
            </Link>
          )}
          <div className="-ml-1 mt-2 flex items-center justify-between gap-0 sm:justify-start sm:gap-3">
            <button
              className={`post-action ${post.liked ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}
              disabled={interaction.pending}
              aria-label="Sukai cerita"
              aria-pressed={post.liked}
              onClick={() => interaction.mutate("like")}
            >
              <Heart size={18} fill={post.liked ? "currentColor" : "none"} />
              <span>{post.likes_count || ""}</span>
            </button>
            <Link
              className="post-action text-[var(--muted)]"
              href={`/thread/${post.id}`}
              aria-label="Balas cerita"
            >
              <MessageCircle size={18} />
              <span>{post.replies_count || ""}</span>
            </Link>
            <Menu.Root>
              <Menu.Trigger asChild>
                <button
                  className={`post-action ${post.reposted ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                  disabled={interaction.pending}
                  aria-label="Bagikan ulang cerita"
                  aria-pressed={post.reposted}
                >
                  <Repeat2 size={19} />
                  <span>{post.reposts_count || ""}</span>
                </button>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Content
                  sideOffset={5}
                  className="z-40 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg"
                >
                  <Menu.Item
                    className="menu-choice"
                    onSelect={() => interaction.mutate("repost")}
                  >
                    {post.reposted ? "Batalkan repost" : "Repost"}
                  </Menu.Item>
                  <Menu.Item
                    className="menu-choice"
                    onSelect={() => open("quote")}
                  >
                    Kutip cerita
                  </Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu.Root>
            <button
              className={`post-action ${post.bookmarked ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
              aria-label="Simpan cerita"
              aria-pressed={post.bookmarked}
              disabled={interaction.pending}
              onClick={() => interaction.mutate("bookmark")}
            >
              <Bookmark
                size={18}
                fill={post.bookmarked ? "currentColor" : "none"}
              />
            </button>
            <button
              className="post-action text-[var(--muted)]"
              aria-label="Salin tautan cerita"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${location.origin}/thread/${post.id}`,
                  );
                  toast("Tautan disalin.");
                } catch {
                  toast("Tautan dapat disalin dari halaman cerita.");
                }
              }}
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={dialog !== null}
        onOpenChange={(v) => {
          if (!v && (busy || editor.busy)) return;
          if (!v && editor.dirty && (dialog === "edit" || dialog === "quote")) {
            setDiscard(true);
            return;
          }
          if (!v) setDialog(null);
        }}
        title={
          dialog === "edit"
            ? "Edit cerita"
            : dialog === "quote"
              ? "Tambahkan perspektifmu"
              : dialog === "report"
                ? "Laporkan cerita"
                : dialog === "delete"
                  ? "Hapus cerita?"
                  : `Gambar cerita Â· ${imageIndex + 1} dari ${post.media.length}`
        }
        description={
          dialog === "delete"
            ? "Cerita ini dan akses balasan/kutipan yang bergantung padanya akan dihapus dari tampilan."
            : dialog === "report"
              ? "Bantu menjaga percakapan kampus tetap nyaman."
              : dialog === "media"
                ? `Lampiran cerita ${post.author.name}. Gunakan tombol panah untuk berpindah gambar.`
                : "Bagikan cerita dengan komunitas kampus yang terverifikasi."
        }
        className={dialog === "media" ? "max-w-4xl" : undefined}
      >
        {dialog === "edit" && (
          <Composer
            editId={post.id}
            initialBody={post.body}
            initialVisibility={post.visibility}
            existingImageCount={post.media.length}
            onStateChange={setEditor}
            autoFocus
            onDone={() => setDialog(null)}
          />
        )}{" "}
        {dialog === "quote" && (
          <Composer
            quoteId={post.id}
            onStateChange={setEditor}
            onDone={() => setDialog(null)}
          />
        )}{" "}
        {dialog === "media" && image && (
          <div
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                setImageIndex((index) =>
                  Math.max(
                    0,
                    Math.min(
                      post.media.length - 1,
                      index + (event.key === "ArrowRight" ? 1 : -1),
                    ),
                  ),
                );
              }
            }}
          >
            <div
              tabIndex={0}
              aria-label="Gambar diperbesar; gunakan panah kiri dan kanan"
              className="rounded-xl bg-[var(--soft)]"
            >
              <Image
                unoptimized
                src={image.url}
                alt={`Gambar cerita diperbesar ${imageIndex + 1} dari ${post.media.length}`}
                width={image.width}
                height={image.height}
                className="max-h-[60dvh] w-full rounded-xl object-contain"
              />
            </div>
            {post.media.length > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  aria-label="Gambar sebelumnya"
                  disabled={imageIndex === 0}
                  onClick={() => setImageIndex((index) => index - 1)}
                >
                  <ChevronLeft size={18} />{" "}
                  <span className="hidden sm:inline">Sebelumnya</span>
                </Button>
                <span
                  role="status"
                  className="text-sm tabular-nums text-[var(--muted)]"
                >
                  {imageIndex + 1} / {post.media.length}
                </span>
                <Button
                  variant="outline"
                  aria-label="Gambar berikutnya"
                  disabled={imageIndex === post.media.length - 1}
                  onClick={() => setImageIndex((index) => index + 1)}
                >
                  <span className="hidden sm:inline">Berikutnya</span>{" "}
                  <ChevronRight size={18} />
                </Button>
              </div>
            )}
          </div>
        )}
        {dialog === "report" && (
          <form onSubmit={report} className="space-y-4">
            <label className="form-label" htmlFor={`reason-${post.id}`}>
              Alasan laporan
            </label>
            <select id={`reason-${post.id}`} name="reason" className="field">
              <option value="spam">Spam</option>
              <option value="harassment">Pelecehan</option>
              <option value="hate">Ujaran kebencian</option>
              <option value="misinformation">Informasi menyesatkan</option>
              <option value="other">Lainnya</option>
            </select>
            <label htmlFor={`details-${post.id}`} className="form-label">
              Keterangan (opsional)
            </label>
            <textarea
              id={`details-${post.id}`}
              name="details"
              className="field min-h-24"
              maxLength={1000}
            />
            <Button disabled={busy}>Kirim laporan</Button>
          </form>
        )}
        {dialog === "delete" && (
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDialog(null)}
            >
              Batal
            </Button>
            <Button variant="danger" onClick={remove} disabled={busy}>
              Hapus cerita
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        title="Tutup editor?"
        description="Perubahan belum dipublikasikan. Kamu bisa menyimpan teks untuk dilanjutkan nanti atau membuangnya."
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setDiscard(false)}>
            Lanjut menulis
          </Button>
          <Button
            variant="outline"
            disabled={!editor.saved}
            onClick={() => {
              setDiscard(false);
              setDialog(null);
            }}
          >
            Simpan teks dan tutup
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (me)
                clearDraft(
                  draftKey(
                    me.id,
                    dialog === "edit" ? `edit:${post.id}` : `quote:${post.id}`,
                  ),
                );
              setDiscard(false);
              setDialog(null);
            }}
          >
            Buang perubahan
          </Button>
        </div>
      </ConfirmDialog>
    </article>
  );
}
