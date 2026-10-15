"use client";
import Link from "next/link";
import Image from "next/image";
import { AccountMenu } from "./ui/account-menu";
import { Realtime } from "./social/realtime";
import {
  ThreadComposerProvider,
  useThreadComposer,
} from "./social/thread-composer";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  UserRound,
  Settings,
  ShieldCheck,
  Check,
  Compass,
  Bookmark,
  SquarePen,
  Bell,
  MessageCircle,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
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
  return (
    <ThreadComposerProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </ThreadComposerProvider>
  );
}
function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const openComposer = useThreadComposer();
  const [collapsed, setCollapsed] = useState(false);
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
      ? [{ href: "/compose", label: "Cerita baru", icon: Plus }]
      : []),
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
        { href: "/notifications", label: "Aktivitas", icon: Bell },
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
    <div className="app-frame min-h-dvh w-full" data-collapsed={collapsed}>
      {user.verified && <Realtime userId={user.id} />}
      <aside
        aria-label="Navigasi akun"
        className="desktop-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col gap-3 px-4 py-4 md:flex"
      >
        <div className="flex h-14 shrink-0 items-center px-2">
          <div className="sidebar-wordmark">
            <Brand />
          </div>
          <Link
            href="/home"
            aria-label="Simeyo, halaman utama"
            className="sidebar-mark text-[42px] font-bold tracking-[-4px]"
          >
            s.
          </Link>
        </div>
        <nav
          className="min-h-0 w-full flex-1 space-y-1 overflow-y-auto pt-3"
          aria-label="Navigasi utama"
        >
          {nav
            .filter((n) =>
              [
                "/home",
                "/compose",
                "/explore",
                "/notifications",
                "/messages",
                "/profile",
              ].includes(n.href),
            )
            .map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={
                  n.href === "/compose"
                    ? (event) => {
                        event.preventDefault();
                        openComposer();
                      }
                    : undefined
                }
                title={n.label}
                aria-label={n.label}
                className={`rail-link ${pathname === n.href ? "active" : ""}`}
                aria-current={pathname === n.href ? "page" : undefined}
              >
                <n.icon
                  size={25}
                  strokeWidth={pathname === n.href ? 2.2 : 1.7}
                />
                <span className="rail-label">{n.label}</span>
              </Link>
            ))}
        </nav>
        <div className="flex shrink-0 items-center justify-center gap-1 pt-2">
          <ThemeToggle />
          <AccountMenu onLogout={() => setConfirm(true)} />
        </div>
        <button
          className="sidebar-toggle icon-button mx-auto shrink-0 text-[var(--muted)]"
          aria-label={collapsed ? "Perluas navigasi" : "Ringkas navigasi"}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <PanelLeftOpen size={19} />
          ) : (
            <PanelLeftClose size={19} />
          )}
        </button>
      </aside>
      <div className="mx-auto w-full min-w-0 max-w-[640px] pb-24">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-5 py-4 backdrop-blur-sm md:hidden">
          <Brand />
          <div className="flex items-center">
            {user.verified && (
              <>
                <Link
                  href="/messages"
                  className="icon-button"
                  aria-label="Pesan"
                >
                  <MessageCircle size={19} />
                </Link>
              </>
            )}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <AccountMenu onLogout={() => setConfirm(true)} />
          </div>
        </header>
        <main
          id="main"
          className={`min-h-[calc(100dvh-8rem)] ${pathname === "/home" || pathname === "/profile" || /^\/u\/[^/]+$/.test(pathname) ? "" : "feed-surface md:mt-4"}`}
        >
          {children}
        </main>
      </div>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden"
        aria-label="Navigasi seluler"
      >
        {mobileNav.map((n) => (
          <Link
            href={n.href}
            onClick={
              n.href === "/compose"
                ? (event) => {
                    event.preventDefault();
                    openComposer();
                  }
                : undefined
            }
            key={n.href}
            className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 text-[10px] ${pathname === n.href ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
            aria-current={pathname === n.href ? "page" : undefined}
          >
            <n.icon size={21} />
            {n.label}
          </Link>
        ))}
      </nav>
      {user.verified && (
        <button
          type="button"
          onClick={openComposer}
          aria-label="Cerita baru"
          className="fixed bottom-6 right-6 z-20 hidden h-16 w-20 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition-colors hover:bg-[var(--soft)] md:flex"
        >
          <Plus size={28} />
        </button>
      )}
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
