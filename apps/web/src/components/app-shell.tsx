"use client";
import Link from "next/link";
import Image from "next/image";
import { AccountMenu } from "./ui/account-menu";
import { Realtime } from "./social/realtime";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  UserRound,
  Settings,
  ShieldCheck,
  ArrowUpRight,
  LogOut,
  Check,
  Compass,
  Bookmark,
  SquarePen,
  Bell,
  MessageCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Brand } from "./brand";
import { ThemeToggle, useToast } from "./providers";
import { useMe } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/dialog";
export function Avatar({
  name,
  url,
  size = 42,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  return url ? (
    <Image
      unoptimized
      src={url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 font-semibold text-[var(--avatar-foreground)]"
      style={{ width: size, height: size }}
    >
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </div>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: user, isPending, error, refetch } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const client = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401)
      router.replace("/login");
  }, [error, router]);
  if (isPending)
    return (
      <main
        id="main"
        className="mx-auto max-w-xl space-y-5 p-8"
        aria-busy="true"
        aria-label="Memuat akun"
      >
        <div className="skeleton h-10 w-32" />
        <div className="skeleton h-32" />
        <div className="skeleton h-64" />
      </main>
    );
  if (!user)
    return (
      <main id="main" className="mx-auto max-w-md p-10">
        <h1 className="text-xl font-semibold">Akun belum dapat dimuat.</h1>
        <p className="my-4 text-sm text-[var(--muted)]">
          {error instanceof ApiError && error.status === 401
            ? "Mengalihkan ke halaman masuk."
            : "API belum dapat dihubungi. Periksa koneksi dan coba lagi."}
        </p>
        <Button onClick={() => refetch()}>Coba lagi</Button>
      </main>
    );
  const nav = [
    { href: "/home", label: "Beranda", icon: Home },
    ...(user.verified
      ? [
          { href: "/explore", label: "Jelajahi", icon: Compass },
          { href: "/bookmarks", label: "Tersimpan", icon: Bookmark },
          { href: "/notifications", label: "Aktivitas", icon: Bell },
          { href: "/messages", label: "Pesan", icon: MessageCircle },
        ]
      : []),
    { href: "/profile", label: "Profil", icon: UserRound },
    { href: "/verification", label: "Verifikasi", icon: ShieldCheck },
    { href: "/settings", label: "Pengaturan", icon: Settings },
    ...(user.can_moderate
      ? [{ href: "/admin/moderation", label: "Moderasi", icon: ShieldCheck }]
      : []),
    ...(user.can_review_verifications
      ? [
          {
            href: "/admin/verifications",
            label: "Review afiliasi",
            icon: Check,
          },
        ]
      : []),
  ];
  const mobileNav = user.verified
    ? [
        { href: "/home", label: "Beranda", icon: Home },
        { href: "/explore", label: "Jelajahi", icon: Compass },
        { href: "/compose", label: "Cerita", icon: SquarePen },
        { href: "/bookmarks", label: "Tersimpan", icon: Bookmark },
        { href: "/profile", label: "Profil", icon: UserRound },
      ]
    : nav.filter((n) => n.href !== "/admin/verifications");
  async function logout() {
    setLoggingOut(true);
    try {
      await api("auth/logout", { method: "POST" });
      client.clear();
      router.replace("/login");
    } catch {
      toast("Keluar belum berhasil. Coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-[1280px] md:grid-cols-[220px_1fr] xl:grid-cols-[240px_minmax(0,650px)_1fr]">
      {user.verified && <Realtime userId={user.id} />}
      <aside
        aria-label="Navigasi akun"
        className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--border)] px-5 py-9 md:flex"
      >
        <div className="px-3">
          <Brand />
        </div>
        <p className="mb-8 mt-4 px-3 text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">
          Satu kampus. Banyak cerita.
        </p>
        <nav className="space-y-2" aria-label="Navigasi utama">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-item ${pathname === n.href ? "active" : ""}`}
              aria-current={pathname === n.href ? "page" : undefined}
            >
              <n.icon size={21} strokeWidth={1.6} />
              {n.label}
            </Link>
          ))}
        </nav>
        {user.verified && (
          <Link
            href="/compose"
            className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)]"
          >
            <SquarePen size={17} />
            Cerita baru
          </Link>
        )}
        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <AccountMenu />
            <button
              className="icon-button"
              aria-label="Keluar"
              onClick={() => setConfirm(true)}
            >
              <LogOut size={19} />
            </button>
          </div>
          <Link
            href="/profile"
            className="flex min-w-0 items-center gap-3 border-t border-[var(--border)] pt-5"
          >
            <Avatar name={user.name} url={user.avatar_url} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                @{user.username}
              </p>
            </div>
          </Link>
        </div>
      </aside>
      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-5 py-4 backdrop-blur-sm md:hidden">
          <Brand />
          <div className="flex items-center">
            {user.verified && (
              <>
                <Link
                  href="/notifications"
                  className="icon-button"
                  aria-label="Aktivitas"
                >
                  <Bell size={19} />
                </Link>
                <Link
                  href="/messages"
                  className="icon-button"
                  aria-label="Pesan"
                >
                  <MessageCircle size={19} />
                </Link>
              </>
            )}
            <ThemeToggle />
            <AccountMenu />
            <button
              className="icon-button"
              aria-label="Keluar"
              onClick={() => setConfirm(true)}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <main id="main">{children}</main>
      </div>
      <aside
        aria-label="Lingkaran kampus"
        className="hidden border-l border-[var(--border)] px-7 py-9 xl:block"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[.17em] text-[var(--muted)]">
          Lingkaran kampusmu
        </p>
        <div className="mt-5 rounded-2xl bg-[var(--soft)] p-5">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <ArrowUpRight size={22} />
          </div>
          <h2 className="text-sm font-semibold">
            {user.institution?.name ?? "Pilih kampusmu"}
          </h2>
          <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
            Identitas terverifikasi membantu membangun ruang percakapan yang
            lebih terjaga.
          </p>
          <Link
            href="/verification"
            className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[var(--accent)]"
          >
            Lihat status afiliasi <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="mt-7 text-xs leading-6 text-[var(--muted)]">
          Platform komunitas independen.
          <br />
          Tidak mewakili universitas.
        </div>
      </aside>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden"
        aria-label="Navigasi seluler"
      >
        {mobileNav.map((n) => (
          <Link
            href={n.href}
            key={n.href}
            className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 text-[10px] ${pathname === n.href ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
            aria-current={pathname === n.href ? "page" : undefined}
          >
            <n.icon size={21} />
            {n.label}
          </Link>
        ))}
      </nav>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Keluar dari Simeyo?"
        description="Sesi pada perangkat ini akan diakhiri. Kamu dapat masuk kembali kapan saja."
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirm(false)}>
            Batal
          </Button>
          <Button onClick={logout} disabled={loggingOut}>
            {loggingOut ? "Memproses…" : "Keluar"}
          </Button>
        </div>
      </ConfirmDialog>
    </div>
  );
}
