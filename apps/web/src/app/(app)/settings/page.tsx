"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ThemeToggle, useToast } from "@/components/providers";
import { useMe } from "@/lib/auth";
import { InfoPopover } from "@/components/ui/popover";
import { PwaControls } from "@/components/pwa";
type Session = {
  id: string;
  user_agent: string;
  last_activity: number;
  current: boolean;
};
export default function Page() {
  const { data: u } = useMe();
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
      <header className="border-b border-[var(--border)] px-6 py-6">
        <h1 className="text-xl font-semibold">Pengaturan</h1>
      </header>
      <div className="space-y-7 p-6">
        <PwaControls />
        <section>
          <h2 className="text-sm font-semibold">Akun</h2>
          <p className="my-3 text-sm text-[var(--muted)]">{u?.email}</p>
          <Link
            href="/settings/password"
            className="text-sm text-[var(--accent)]"
          >
            Ubah kata sandi →
          </Link>
        </section>
        <section className="flex items-center justify-between border-y border-[var(--border)] py-5">
          <div>
            <h2 className="text-sm font-semibold">Tampilan</h2>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Pilih tema terang atau gelap.
            </p>
          </div>
          <ThemeToggle />
        </section>
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Privasi profil</h2>
            <InfoPopover title="Tentang privasi akademik">
              Informasi fakultas, program studi, dan angkatan hanya dibagikan
              jika kamu mengaktifkan visibilitas akademik pada profil.
            </InfoPopover>
          </div>
          <p className="my-3 text-sm leading-7 text-[var(--muted)]">
            Pilih informasi akademik dan detail opsional yang ingin kamu
            tampilkan.
          </p>
          <Link href="/profile/edit" className="text-sm text-[var(--accent)]">
            Atur privasi profil →
          </Link>
          <Link
            href="/settings/privacy"
            className="mt-3 block min-h-10 text-sm text-[var(--accent)]"
          >
            Kelola akun diblokir & disenyapkan →
          </Link>
          <Link
            href="/requests"
            className="block min-h-10 text-sm text-[var(--accent)]"
          >
            Permintaan mengikuti →
          </Link>
          <Link
            href="/settings/communications"
            className="block min-h-10 text-sm text-[var(--accent)]"
          >
            Privasi pesan dan notifikasi →
          </Link>
        </section>
        <section className="border-t border-[var(--border)] pt-6">
          <h2 className="text-sm font-semibold">Sesi aktif</h2>
          <p className="mb-5 mt-2 text-xs leading-6 text-[var(--muted)]">
            Sesi web kedaluwarsa setelah 120 menit tidak aktif secara default.
          </p>
          {sessions.isPending ? (
            <div className="skeleton h-24" />
          ) : sessions.isError ? (
            <>
              <p role="alert" className="text-sm text-red-600">
                Sesi belum dapat dimuat.
              </p>
              <Button variant="ghost" onClick={() => sessions.refetch()}>
                Coba lagi
              </Button>
            </>
          ) : (
            sessions.data?.data.map((s) => (
              <div
                key={s.id}
                className="mb-3 rounded-xl border border-[var(--border)] p-4"
              >
                <p className="truncate text-sm">
                  {s.user_agent || "Browser tidak diketahui"}
                </p>
                <p className="my-2 text-xs text-[var(--muted)]">
                  {new Date(s.last_activity * 1000).toLocaleString("id-ID")}
                  {s.current && " · Perangkat ini"}
                </p>
                {!s.current && (
                  <Button variant="outline" onClick={() => setSelected(s)}>
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
        </section>
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
