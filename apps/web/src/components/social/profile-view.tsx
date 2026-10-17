"use client";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { useRouter } from "next/navigation";
import { MediaViewer } from "@/components/media-viewer";
import { ProfileCover } from "@/components/profile-cover";
import { DailyStreak } from "./daily-streak";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  BadgeCheck,
  GraduationCap,
  MapPin,
  LockKeyhole,
  MoreHorizontal,
  Link as LinkIcon,
} from "lucide-react";
import { useMe } from "@/lib/auth";
import { api } from "@/lib/api";
import { clearBlockedContent } from "@/lib/social";
import { userSchema } from "../../../../../packages/api-contracts/src";
import { Avatar } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/providers";
import { FollowButton, useRelationship } from "./people";
import { Feed } from "./feed";
import { ThreadComposerTrigger } from "./thread-composer";
import { MessageButton } from "./communications";
export function ProfileView({ username }: { username?: string }) {
  const router = useRouter();
  const me = useMe();
  const q = useQuery({
    queryKey: ["profile", username],
    enabled: !!username,
    queryFn: async () => {
      const r = await api<{ data: unknown }>(
        `profiles/${encodeURIComponent(username!)}`,
      );
      return userSchema.parse(r.data);
    },
  });
  const u = username ? q.data : me.data;
  const owner = u?.id === me.data?.id;
  const relation = useRelationship(
    u?.id ?? 0,
    (!!u?.verified && !!u.email_verified) || (!!username && !!u),
  );
  const tabKey = `simeyo-profile-tab:${me.data?.id}:${username ?? "me"}`;
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [tab, updateTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem(tabKey);
      if (saved && ["profile", "replies", "media"].includes(saved))
        return saved;
    } catch {
      /* Navigation works without storage. */
    }
    return "profile";
  });
  function setTab(value: string) {
    updateTab(value);
    try {
      sessionStorage.setItem(tabKey, value);
    } catch {
      /* Optional preference. */
    }
  }
  const [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const client = useQueryClient();
  async function edge(kind: string, method: string) {
    if (!u || busy) return;
    setBusy(true);
    try {
      await api(`relationships/${u.id}/${kind}`, { method });
      await client.invalidateQueries({ queryKey: ["relationship", u.id] });
      await client.invalidateQueries({ queryKey: ["feed"] });
      toast(kind === "block" ? "Akun diblokir." : "Preferensi diperbarui.");
      if (kind === "block") {
        await clearBlockedContent(client);
        router.replace("/explore");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Permintaan belum berhasil.");
    } finally {
      setBusy(false);
    }
  }
  if ((username && q.isError) || !u)
    return (
      <div className="p-8">
        {q.isError ? (
          <p role="alert">
            Profil tidak ditemukan atau tidak dapat kamu akses.
            <span className="mt-4 block">
              <Button
                variant="outline"
                onClick={() => q.refetch()}
                disabled={q.isFetching}
              >
                Coba lagi
              </Button>
            </span>
          </p>
        ) : (
          <div className="skeleton h-52" />
        )}
      </div>
    );
  return (
    <>
      {u.avatar_url && (
        <MediaViewer
          open={avatarOpen}
          onOpenChange={setAvatarOpen}
          images={[{ url: u.avatar_url, width: 800, height: 800 }]}
          index={0}
          onIndexChange={() => {}}
          title="Foto profil"
        />
      )}
      <header className="page-header">
        {username && <BackButton />}
        <h1 className="text-lg font-semibold">{owner ? "Profilmu" : u.name}</h1>
      </header>
      <div className="feed-surface">
        {u.cover_url && (
          <div className="aspect-[3/1] overflow-hidden">
            <ProfileCover url={u.cover_url} alt="Sampul profil" />
          </div>
        )}
        <div
          className={`relative px-4 sm:px-6 ${u.cover_url ? "pt-5" : "pt-6"}`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-start gap-1.5 text-[22px] font-semibold leading-tight tracking-tight sm:text-2xl">
                <span
                  title={u.name}
                  className="min-w-0 line-clamp-3 [overflow-wrap:anywhere]"
                >
                  {u.name}
                </span>
                {u.verified && (
                  <BadgeCheck
                    size={21}
                    className="mt-1 shrink-0 text-[var(--accent)]"
                    aria-label="Afiliasi terverifikasi"
                  />
                )}
              </h2>
              <p className="mt-1.5 break-all text-sm text-[var(--muted)]">
                @{u.username}
                {u.private_account && (
                  <LockKeyhole size={13} className="ml-2 inline" />
                )}
              </p>
            </div>
            <div
              data-profile-avatar
              className={`self-start shrink-0 rounded-full border-4 border-[var(--surface)] bg-[var(--surface)] ${u.cover_url ? "-mt-14" : ""}`}
            >
              {u.avatar_url ? (
                <button
                  type="button"
                  aria-label="Lihat foto profil"
                  className="block rounded-full focus-visible:outline focus-visible:outline-offset-4"
                  onClick={() => setAvatarOpen(true)}
                >
                  <Avatar name={u.name} url={u.avatar_url} size={80} />
                </button>
              ) : (
                <Avatar name={u.name} url={u.avatar_url} size={80} />
              )}
            </div>
          </div>
          {u.bio ? (
            <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-6">
              {u.bio}
            </p>
          ) : (
            owner && (
              <Link
                href="/profile/edit"
                className="mt-3 inline-flex min-h-10 items-center text-sm text-[var(--muted)] hover:underline"
              >
                Tambahkan bio singkat tentangmu
              </Link>
            )
          )}
          <div className="mt-3 space-y-2 text-xs leading-5 text-[var(--muted)]">
            {u.location && (
              <p className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" />
                <span className="break-words min-w-0">{u.location}</span>
              </p>
            )}
            {u.institution && (
              <p className="flex items-center gap-2">
                <GraduationCap size={15} className="shrink-0" />
                <span className="break-words min-w-0">
                  {u.institution.name}
                </span>
              </p>
            )}
            {(u.faculty || u.department || u.cohort) && (
              <p className="break-words pl-[23px]">
                {[u.faculty, u.department, u.cohort]
                  .filter(Boolean)
                  .join(" · ")}
                {owner && !u.academic_visible && " · Hanya terlihat olehmu"}
              </p>
            )}
            {u.links.map((link) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-8 items-center gap-2 text-[var(--foreground)] hover:underline"
              >
                <LinkIcon size={14} className="shrink-0 text-[var(--muted)]" />
                <span className="min-w-0 truncate">
                  {link.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
              </a>
            ))}
          </div>
          {u.interests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {u.interests.map((i) => (
                <span
                  key={i}
                  className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-xs text-[var(--muted)]"
                >
                  {i}
                </span>
              ))}
            </div>
          )}
          {relation.data && (
            <div className="mt-2 flex flex-wrap gap-x-5 text-sm">
              <Link
                className="inline-flex min-h-11 items-center gap-1 hover:underline"
                href={
                  u.private_account &&
                  !owner &&
                  relation.data?.follow_state !== "accepted"
                    ? "#private-profile"
                    : `/u/${u.username}/followers`
                }
              >
                <strong>{relation.data.followers_count}</strong>{" "}
                <span className="text-[var(--muted)]">pengikut</span>
              </Link>
              <Link
                className="inline-flex min-h-11 items-center gap-1 hover:underline"
                href={
                  u.private_account &&
                  !owner &&
                  relation.data?.follow_state !== "accepted"
                    ? "#private-profile"
                    : `/u/${u.username}/following`
                }
              >
                <strong>{relation.data.following_count}</strong>{" "}
                <span className="text-[var(--muted)]">mengikuti</span>
              </Link>
            </div>
          )}
          {owner && u.verified && u.email_verified && (
            <div className="mb-4">
              <DailyStreak userId={u.id} />
            </div>
          )}
          <div className="mb-5 mt-2 flex items-center gap-2 [&>a]:flex-1 [&>a]:justify-center">
            {owner ? (
              <>
                <Link
                  href="/profile/edit"
                  className="inline-flex min-h-10 items-center whitespace-nowrap rounded-xl border border-[var(--border)] px-3 text-xs font-semibold sm:text-sm"
                >
                  Edit profil
                </Link>
                <Button
                  variant="outline"
                  className="min-h-10 flex-1 whitespace-nowrap px-3 text-xs sm:text-sm"
                  disabled={busy}
                  onClick={async () => {
                    if (busy) return;
                    setBusy(true);
                    const url = `${location.origin}/u/${u.username}`;
                    try {
                      if (navigator.share)
                        await navigator.share({ title: u.name, url });
                      else {
                        await navigator.clipboard.writeText(url);
                        toast("Tautan profil disalin.");
                      }
                    } catch (error) {
                      if (
                        error instanceof DOMException &&
                        error.name === "AbortError"
                      )
                        return;
                      toast("Tautan profil belum dapat disalin.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Bagikan profil
                </Button>
              </>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <FollowButton user={u} />
                <MessageButton userId={u.id} />
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <button
                      className="icon-button"
                      aria-label="Opsi akun"
                      disabled={busy}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Content className="z-40 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
                      <Menu.Item
                        className="menu-choice"
                        onSelect={() =>
                          edge("mute", relation.data?.muted ? "DELETE" : "PUT")
                        }
                      >
                        {relation.data?.muted
                          ? "Batal senyapkan"
                          : "Senyapkan akun"}
                      </Menu.Item>
                      <Menu.Item
                        className="menu-choice text-red-600"
                        onSelect={() => setBlock(true)}
                      >
                        Blokir akun
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Portal>
                </Menu.Root>
              </div>
            )}
          </div>
        </div>
        {u.verified && (
          <>
            <div
              role="tablist"
              aria-label="Cerita profil"
              className="grid grid-cols-3 border-b border-[var(--border)]"
            >
              {[
                { id: "profile", label: "Cerita" },
                { id: "replies", label: "Balasan" },
                { id: "media", label: "Media" },
              ].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  id={`profile-tab-${t.id}`}
                  aria-controls={`profile-panel-${t.id}`}
                  aria-selected={tab === t.id}
                  tabIndex={tab === t.id ? 0 : -1}
                  className={`min-h-12 border-b-2 text-sm ${tab === t.id ? "border-[var(--foreground)] font-semibold" : "border-transparent text-[var(--muted)]"}`}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(event) => {
                    const tabs = Array.from(
                      event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                        '[role="tab"]',
                      ),
                    );
                    const current = tabs.indexOf(event.currentTarget);
                    const next =
                      event.key === "ArrowRight"
                        ? (current + 1) % tabs.length
                        : event.key === "ArrowLeft"
                          ? (current + tabs.length - 1) % tabs.length
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? tabs.length - 1
                              : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    tabs[next].click();
                    tabs[next].focus();
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {["profile", "replies", "media"]
              .filter((id) => id !== tab)
              .map((id) => (
                <div
                  key={id}
                  id={`profile-panel-${id}`}
                  role="tabpanel"
                  aria-labelledby={`profile-tab-${id}`}
                  hidden
                />
              ))}
            {owner && <ThreadComposerTrigger />}
            <section
              id={`profile-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`profile-tab-${tab}`}
              tabIndex={0}
            >
              {u.private_account &&
              !owner &&
              relation.data?.follow_state !== "accepted" ? (
                <div id="private-profile" className="p-10 text-center">
                  <LockKeyhole className="mx-auto mb-4 text-[var(--muted)]" />
                  <h3 className="text-sm font-semibold">Akun ini privat</h3>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {relation.data?.follow_state === "pending"
                      ? "Permintaanmu sudah dikirim. Cerita dan daftar pengikut tersedia setelah disetujui."
                      : "Ikuti akun ini untuk meminta akses ke cerita dan daftar pengikutnya."}
                  </p>
                </div>
              ) : (
                <Feed key={tab} feed={tab} userId={u.id} />
              )}
            </section>
          </>
        )}
      </div>
      <ConfirmDialog
        busy={busy}
        open={block}
        onOpenChange={setBlock}
        title={`Blokir ${u.name}?`}
        description="Hubungan mengikuti akan dihapus. Akun ini tidak dapat membaca atau berinteraksi dengan ceritamu, dan sebaliknya."
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setBlock(false)}>
            Batal
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => edge("block", "PUT")}
          >
            Blokir akun
          </Button>
        </div>
      </ConfirmDialog>
    </>
  );
}
