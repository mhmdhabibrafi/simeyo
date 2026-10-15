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
    <div className="min-h-dvh w-full md:pl-24">
      {user.verified && <Realtime userId={user.id} />}
      <aside
        aria-label="Navigasi akun"
        className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center gap-3 px-3 py-5 md:flex"
      >
        <Link
          href="/home"
          aria-label="Simeyo, halaman utama"
          className="mb-2 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[42px] font-bold tracking-[-4px] transition-transform hover:scale-105"
        >
          s.
        </Link>
        <nav
          className="min-h-0 w-full flex-1 space-y-1 overflow-y-auto"
          aria-label="Navigasi utama"
        >
          {nav
            .filter((n) =>
              [
                "/home",
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
                title={n.label}
                aria-label={n.label}
                className={`rail-link ${pathname === n.href ? "active" : ""}`}
                aria-current={pathname === n.href ? "page" : undefined}
              >
                <n.icon
                  size={25}
                  strokeWidth={pathname === n.href ? 2.2 : 1.7}
                />
                <span className="sr-only">{n.label}</span>
              </Link>
            ))}
        </nav>
        {user.verified && (
          <Link
            href="/compose"
            aria-label="Cerita baru"
            title="Cerita baru"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--soft)] transition-colors hover:bg-[var(--border)]"
          >
            <SquarePen size={25} />
            <span className="sr-only">Cerita baru</span>
          </Link>
        )}
        <div className="flex shrink-0 flex-col items-center gap-2 pt-2">
          <ThemeToggle />
          <AccountMenu onLogout={() => setConfirm(true)} />
        </div>
      </aside>
      <div className="mx-auto w-full min-w-0 max-w-[680px] pb-24 md:py-6 md:pr-6">
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
          className="min-h-[calc(100dvh-8rem)] bg-[var(--surface)] md:overflow-hidden md:rounded-[28px] md:border md:border-[var(--border)] md:shadow-[0_4px_28px_#00000003]"
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
