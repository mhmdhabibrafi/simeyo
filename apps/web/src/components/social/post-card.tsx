"use client";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type Post,
  type Media,
} from "../../../../../packages/api-contracts/src/social";
import { useInteraction } from "@/lib/social";
import { api } from "@/lib/api";
import { Avatar } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers";
import { Composer } from "./composer";
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
}: {
  post: Post;
  detail?: boolean;
}) {
  const interaction = useInteraction(post);
  const client = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState<
    "edit" | "quote" | "report" | "delete" | "media" | null
  >(null);
  const [image, setImage] = useState<Media | null>(null);
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
    setDialog(type);
  }
  async function remove() {
    setBusy(true);
    try {
      await api(`posts/${post.id}`, { method: "DELETE" });
      client.removeQueries({ queryKey: ["post", post.id] });
      await client.invalidateQueries({ queryKey: ["feed"] });
      setDialog(null);
      toast("Cerita dihapus.");
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
                {post.author.department && ` · ${post.author.department}`}
                {post.edited_at && " · Diedit"}
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
                  {post.can_edit && (
                    <>
                      <Menu.Item
                        className="menu-choice"
                        onSelect={() => open("edit")}
                      >
                        Edit cerita
                      </Menu.Item>
                      <Menu.Item
                        className="menu-choice text-red-600"
                        onSelect={() => open("delete")}
                      >
                        Hapus cerita
                      </Menu.Item>
                    </>
                  )}
                  <Menu.Item
                    className="menu-choice"
                    onSelect={() => open("report")}
                  >
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
              Membalas percakapan ↗
            </Link>
          )}
          <PostBody body={post.body} />
          {post.media.length > 0 && (
            <div
              className={`mt-3 grid gap-2 ${post.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {post.media.map((m) => (
                <button
                  key={m.id}
                  className="overflow-hidden rounded-2xl border border-[var(--border)]"
                  aria-label="Lihat gambar cerita"
                  onClick={() => {
                    setImage(m);
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
                    className={`w-full object-cover ${post.media.length > 1 ? "max-h-60" : "max-h-[460px]"}`}
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
                  {post.quote.media.length} gambar · Lihat cerita
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
                  : "Gambar cerita"
        }
        description={
          dialog === "delete"
            ? "Cerita ini dan akses balasan/kutipan yang bergantung padanya akan dihapus dari tampilan."
            : dialog === "report"
              ? "Bantu menjaga percakapan kampus tetap nyaman."
              : "Bagikan cerita dengan komunitas kampus yang terverifikasi."
        }
      >
        {dialog === "edit" && (
          <Composer
            editId={post.id}
            initialBody={post.body}
            initialVisibility={post.visibility}
            existingImageCount={post.media.length}
            onDone={() => setDialog(null)}
          />
        )}{" "}
        {dialog === "quote" && (
          <Composer quoteId={post.id} onDone={() => setDialog(null)} />
        )}{" "}
        {dialog === "media" && image && (
          <Image
            unoptimized
            src={image.url}
            alt="Gambar cerita diperbesar"
            width={image.width}
            height={image.height}
            className="max-h-[60dvh] w-full rounded-xl object-contain"
          />
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
            <Button variant="outline" onClick={() => setDialog(null)}>
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
    </article>
  );
}
