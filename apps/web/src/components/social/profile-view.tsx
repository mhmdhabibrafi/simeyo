"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  BadgeCheck,
  GraduationCap,
  MapPin,
  LockKeyhole,
  MoreHorizontal,
} from "lucide-react";
import { useMe } from "@/lib/auth";
import { api } from "@/lib/api";
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
  const [tab, setTab] = useState("profile");
  const [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const client = useQueryClient();
  async function edge(kind: string, method: string) {
    if (!u) return;
    setBusy(true);
    try {
      await api(`relationships/${u.id}/${kind}`, { method });
      await client.invalidateQueries({ queryKey: ["relationship", u.id] });
      await client.invalidateQueries({ queryKey: ["feed"] });
      toast(kind === "block" ? "Akun diblokir." : "Preferensi diperbarui.");
      if (kind === "block") {
        for (const key of ["messages", "conversations", "notifications"]) {
          await client.cancelQueries({ queryKey: [key] });
          client.removeQueries({ queryKey: [key] });
        }
        client.removeQueries({ queryKey: ["profile"] });
        client.invalidateQueries({ queryKey: ["people"] });
        router.replace("/explore");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Permintaan belum berhasil.");
    } finally {
      setBusy(false);
    }
  }
  if (!u)
    return (
      <div className="p-8">
        {q.isError ? (
          <p role="alert">
            Profil tidak ditemukan atau tidak dapat kamu akses.
          </p>
        ) : (
          <div className="skeleton h-52" />
        )}
      </div>
    );
  return (
    <>
      <header className="flex h-12 items-center px-5 md:h-16 md:px-6">
        <h1 className="text-lg font-semibold">{owner ? "Profilmu" : u.name}</h1>
      </header>
      <div className="feed-surface">
        {u.cover_url && (
          <div className="h-36 overflow-hidden">
            {
              <Image
                unoptimized
                width={1200}
                height={400}
                src={u.cover_url}
                alt="Sampul profil"
                className="h-full w-full object-cover"
              />
            }
          </div>
        )}
        <div className="px-6 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                {u.name}
                {u.verified && (
                  <BadgeCheck
                    size={21}
                    className="text-[var(--accent)]"
                    aria-label="Afiliasi terverifikasi"
                  />
                )}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                @{u.username}
                {u.private_account && (
                  <LockKeyhole size={13} className="ml-2 inline" />
                )}
              </p>
            </div>
            <Avatar name={u.name} url={u.avatar_url} size={80} />
          </div>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-7">
            {u.bio || "Belum ada bio. Ceritakan sedikit tentang dirimu."}
          </p>
          <div className="mt-5 space-y-3 text-xs text-[var(--muted)]">
            {u.location && (
              <p className="flex items-center gap-2">
                <MapPin size={15} />
                {u.location}
              </p>
            )}
            {u.institution && (
              <p className="flex items-center gap-2">
                <GraduationCap size={16} />
                {u.institution.name}
              </p>
            )}
            {(u.faculty || u.department || u.cohort) && (
              <p>
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
                className="block break-all text-[var(--accent)]"
              >
                {link}
              </a>
            ))}
          </div>
          {u.interests.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
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
            <div className="my-6 flex gap-5 text-xs">
              <Link href={`/u/${u.username}/followers`}>
                <strong>{relation.data.followers_count}</strong>{" "}
                <span className="text-[var(--muted)]">pengikut</span>
              </Link>
              <Link href={`/u/${u.username}/following`}>
                <strong>{relation.data.following_count}</strong>{" "}
                <span className="text-[var(--muted)]">mengikuti</span>
              </Link>
            </div>
          )}
          <div className="my-5 flex items-center gap-2 [&>a]:flex-1 [&>a]:justify-center">
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
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${location.origin}/u/${u.username}`,
                      );
                      toast("Tautan profil disalin.");
                    } catch {
                      toast("Tautan profil belum dapat disalin.");
                    }
                  }}
                >
                  Bagikan profil
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <FollowButton user={u} />
                <MessageButton userId={u.id} />
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <button className="icon-button" aria-label="Opsi akun">
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
            <div className="grid grid-cols-3 border-b border-[var(--border)]">
              {[
                { id: "profile", label: "Cerita" },
                { id: "replies", label: "Balasan" },
                { id: "media", label: "Media" },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`min-h-12 border-b-2 text-sm ${tab === t.id ? "border-[var(--foreground)] font-semibold" : "border-transparent text-[var(--muted)]"}`}
                  onClick={() => setTab(t.id)}
                  aria-pressed={tab === t.id}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {owner && <ThreadComposerTrigger />}
            {u.private_account &&
            !owner &&
            relation.data?.follow_state !== "accepted" ? (
              <div className="p-10 text-center">
                <LockKeyhole className="mx-auto mb-4 text-[var(--muted)]" />
                <h3 className="text-sm font-semibold">
                  Cerita untuk lingkaran terdekat.
                </h3>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Kirim permintaan mengikuti untuk membaca cerita akun privat
                  ini.
                </p>
              </div>
            ) : (
              <Feed key={tab} feed={tab} userId={u.id} />
            )}
          </>
        )}
      </div>
      <ConfirmDialog
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
