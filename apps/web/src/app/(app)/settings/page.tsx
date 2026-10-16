"use client";
import { MotionPreference } from "@/components/accessibility";
import { FeedPreferences } from "@/components/social/feed-preferences";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ThemeToggle, useToast } from "@/components/providers";
import {
  ChevronRight,
  KeyRound,
  UserRound,
  Shield,
  MessageCircle,
  UserRoundPlus,
  Monitor,
  Download,
} from "lucide-react";
import { PwaControls } from "@/components/pwa";
import { InfoPopover } from "@/components/ui/popover";
import { AccountCampus } from "@/components/account-campus";

type Session = {
  id: string;
  user_agent: string;
  last_activity: number;
  current: boolean;
};
export default function Page() {
  const toast = useToast();
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api<{ data: Session[] }>("auth/sessions"),
  });
  const [selected, setSelected] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  async function revoke() {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`auth/sessions/${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
      });
      await sessions.refetch();
      setSelected(null);
      toast("Sesi diakhiri.");
    } catch {
      toast("Sesi belum dapat diakhiri.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Pengaturan</h1>
      </header>
      <div className="divide-y divide-[var(--border)]">
        <section
          className="px-5 py-5 sm:px-6"
          aria-labelledby="account-heading"
        >
          <h2
            id="account-heading"
            className="text-xs font-semibold text-[var(--muted)]"
          >
            Akun & kampus
          </h2>
          <AccountCampus />
          <Link
            href="/settings/password"
            className="mt-3 flex min-h-12 items-center gap-3 rounded-xl px-2 text-sm transition-colors hover:bg-[var(--soft)]"
          >
            <KeyRound size={18} className="text-[var(--muted)]" />
            <span className="flex-1">Ubah kata sandi</span>
            <ChevronRight size={16} className="text-[var(--muted)]" />
          </Link>
        </section>
        <section className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-sm font-medium">Tampilan</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Tema terang atau gelap
            </p>
          </div>
          <ThemeToggle />
        </section>
        <section className="px-5 py-5 sm:px-6">
          <MotionPreference control />
        </section>
        <FeedPreferences />
        <section
          className="px-3 py-4 sm:px-4"
          aria-labelledby="privacy-heading"
        >
          <div className="mb-2 flex items-center justify-between px-2">
            <h2
              id="privacy-heading"
              className="text-xs font-semibold text-[var(--muted)]"
            >
              Privasi & interaksi
            </h2>
            <InfoPopover title="Tentang privasi akademik">
              Informasi fakultas, program studi, dan angkatan hanya dibagikan
              jika kamu mengaktifkan visibilitas akademik pada profil.
            </InfoPopover>
          </div>
          {[
            {
              href: "/profile/edit",
              label: "Profil dan informasi akademik",
              icon: UserRound,
            },
            {
              href: "/settings/privacy",
              label: "Akun diblokir & disenyapkan",
              icon: Shield,
            },
            {
              href: "/settings/communications",
              label: "Pesan dan notifikasi",
              icon: MessageCircle,
            },
            {
              href: "/requests",
              label: "Permintaan mengikuti",
              icon: UserRoundPlus,
            },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-12 items-center gap-3 rounded-xl px-2 text-sm transition-colors hover:bg-[var(--soft)]"
            >
              <Icon size={18} className="shrink-0 text-[var(--muted)]" />
              <span className="flex-1">{label}</span>
              <ChevronRight
                size={16}
                className="shrink-0 text-[var(--muted)]"
              />
            </Link>
          ))}
        </section>
        <details className="group px-5 py-4 sm:px-6">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <Monitor size={18} className="text-[var(--muted)]" />
            <span className="flex-1">Sesi aktif</span>
            <ChevronRight
              size={16}
              className="text-[var(--muted)] transition-transform group-open:rotate-90"
            />
          </summary>
          <div className="pb-2 pt-3">
            <p className="mb-4 text-xs leading-6 text-[var(--muted)]">
              Kelola perangkat yang masuk ke akunmu. Sesi web berakhir setelah
              tidak aktif sesuai kebijakan layanan.
            </p>
            {sessions.isPending ? (
              <p role="status" className="text-sm">
                Memuat sesi?
              </p>
            ) : sessions.isError ? (
              <div>
                <p role="alert" className="text-sm">
                  Sesi belum dapat dimuat.
                </p>
                <Button variant="ghost" onClick={() => sessions.refetch()}>
                  Coba lagi
                </Button>
              </div>
            ) : (
              sessions.data?.data.map((session) => (
                <div
                  key={session.id}
                  className="border-t border-[var(--border)] py-4"
                >
                  <p className="break-words text-sm">
                    {session.user_agent || "Browser tidak diketahui"}
                  </p>
                  <p className="my-2 text-xs text-[var(--muted)]">
                    {new Date(session.last_activity * 1000).toLocaleString(
                      "id-ID",
                    )}
                    {session.current && " ? Perangkat ini"}
                  </p>
                  {!session.current && (
                    <Button
                      variant="outline"
                      onClick={() => setSelected(session)}
                    >
                      Akhiri sesi
                    </Button>
                  )}
                </div>
              ))
            )}
            {sessions.data?.data.length === 0 && (
              <p className="text-sm text-[var(--muted)]">
                Tidak ada sesi web tersimpan.
              </p>
            )}
          </div>
        </details>
        <details className="group px-5 py-4 sm:px-6">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <Download size={18} className="text-[var(--muted)]" />
            <span className="flex-1">Pasang aplikasi</span>
            <ChevronRight
              size={16}
              className="text-[var(--muted)] transition-transform group-open:rotate-90"
            />
          </summary>
          <div className="pb-2 pt-3">
            <PwaControls />
          </div>
        </details>
      </div>
      <ConfirmDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Akhiri sesi perangkat?"
        description="Perangkat tersebut perlu masuk kembali untuk menggunakan Simeyo."
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setSelected(null)}>
            Batal
          </Button>
          <Button disabled={busy} onClick={revoke}>
            Akhiri sesi
          </Button>
        </div>
      </ConfirmDialog>
    </>
  );
}
