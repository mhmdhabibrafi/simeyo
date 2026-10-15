"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Mail, ShieldCheck, Clock3 } from "lucide-react";
import { useMe, useAuthOptions } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers";
import { FirebaseSignIn } from "@/components/firebase-sign-in";
type Verification = {
  id: number;
  state: string;
  method: string;
  requested_affiliation: string;
  statement: string;
  review_note: string | null;
};
export function AccountCampus() {
  const { data: user } = useMe();
  const policy = useAuthOptions(!!user && !user.email_verified);
  const client = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, refetch, isError, isPending } = useQuery({
    queryKey: ["verification"],
    queryFn: () => api<{ data: Verification | null }>("verification"),
    enabled: !!user && user.verification_state !== "approved",
  });
  if (!user) return null;
  const state = user.verification_state ?? "pending";
  const labels: Record<string, string> = {
    pending: "Menunggu tinjauan",
    approved: "Afiliasi disetujui",
    rejected: "Pengajuan ditolak",
    suspended: "Akun ditangguhkan",
  };
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("verification", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      await Promise.all([
        refetch(),
        client.invalidateQueries({ queryKey: ["me"] }),
      ]);
      toast("Pengajuan dikirim.");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Pengajuan belum berhasil.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (state === "approved" && user.email_verified && user.onboarded) {
    return (
      <section id="account-campus" className="scroll-mt-6">
        <div className="flex items-center gap-3 rounded-xl bg-[var(--soft)] p-3">
          <ShieldCheck size={20} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-sm">Kampus terverifikasi</p>
            <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
              {user.institution?.name}
            </p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section id="account-campus" className="scroll-mt-6">
      <div className="mt-4 space-y-7">
        <div className="flex items-start gap-4 rounded-2xl bg-[var(--soft)] p-5">
          <ShieldCheck className="mt-1 shrink-0 text-[var(--accent)]" />
          <div>
            <h2 className="font-semibold">{labels[state]}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {state === "approved"
                ? "Afiliasi kampusmu telah dikonfirmasi."
                : "Email yang terverifikasi dan afiliasi yang disetujui diperlukan untuk mengakses percakapan kampus."}
            </p>
            {data?.data?.review_note && (
              <p className="mt-3 text-sm">
                Catatan reviewer: {data.data.review_note}
              </p>
            )}
          </div>
        </div>
        <section className="border-b border-[var(--border)] pb-6">
          {!user.email_verified && <FirebaseSignIn />}
          <div className="flex items-center gap-3">
            <Mail size={20} />
            <h2 className="text-sm font-semibold">1. Verifikasi email</h2>
            {user.email_verified && (
              <Check size={18} className="text-[var(--accent)]" />
            )}
          </div>
          <p className="my-3 text-sm text-[var(--muted)]">{user.email}</p>
          {!user.email_verified &&
            policy.data?.email_delivery_enabled === false && (
              <p
                role="status"
                className="mb-4 text-sm leading-6 text-[var(--muted)]"
              >
                Layanan verifikasi email belum tersedia. Akunmu tetap belum
                terverifikasi; akses percakapan kampus belum dibuka.
              </p>
            )}
          {!user.email_verified && policy.isError && (
            <p role="alert" className="mb-4 text-sm">
              Status layanan email belum dapat diperiksa.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => policy.refetch()}
              >
                Coba lagi
              </button>
            </p>
          )}
          {!user.email_verified && (
            <Button
              variant="outline"
              disabled={busy || !policy.data?.email_delivery_enabled}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await api<{ message: string }>(
                    "auth/email/resend",
                    { method: "POST" },
                  );
                  toast(r.message);
                } catch (e) {
                  toast(
                    e instanceof Error ? e.message : "Gagal mengirim email.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Kirim ulang tautan
            </Button>
          )}
          <Button
            className="ml-2"
            variant="ghost"
            onClick={() => client.invalidateQueries({ queryKey: ["me"] })}
          >
            Periksa status
          </Button>
        </section>
        <section>
          <h2 className="text-sm font-semibold">2. Lengkapi afiliasi kampus</h2>
          <p className="my-3 text-sm text-[var(--muted)]">
            {user.onboarded
              ? user.institution?.name
              : "Pilih institusi dan informasi akademik opsional."}
          </p>
          {!user.onboarded && (
            <Link
              href="/onboarding"
              className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--accent)]"
            >
              Lanjutkan onboarding →
            </Link>
          )}
        </section>
        {user.email_verified &&
          user.onboarded &&
          !isPending &&
          !isError &&
          state !== "approved" &&
          state !== "suspended" &&
          data?.data?.state !== "pending" && (
            <form
              onSubmit={send}
              className="space-y-5 border-t border-[var(--border)] pt-6"
            >
              <h2 className="text-sm font-semibold">3. Ajukan verifikasi</h2>
              <div>
                <label htmlFor="affiliation" className="form-label">
                  Jenis afiliasi
                </label>
                <select
                  id="affiliation"
                  name="requested_affiliation"
                  className="field"
                >
                  <option value="student">Mahasiswa</option>
                  <option value="lecturer">Dosen</option>
                  <option value="alumni">Alumni</option>
                  <option value="organization_manager">
                    Pengelola organisasi
                  </option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="method">
                  Metode verifikasi
                </label>
                <select id="method" name="method" className="field">
                  <option value="manual">Tinjauan administrator</option>
                  <option value="institutional_email">
                    Email institusi (jika dikonfigurasi)
                  </option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="statement">
                  Jelaskan afiliasimu
                </label>
                <textarea
                  id="statement"
                  name="statement"
                  className="field min-h-32"
                  required
                  minLength={20}
                  maxLength={1000}
                  aria-describedby="statement-help"
                />
                <p
                  id="statement-help"
                  className="mt-2 text-xs leading-6 text-[var(--muted)]"
                >
                  Minimal 20 karakter. Jangan cantumkan NIM, nomor identitas,
                  kata sandi, atau dokumen pribadi. Administrator akan meninjau
                  melalui proses yang disepakati.
                </p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
              <Button disabled={busy}>
                {busy ? "Mengirim…" : "Kirim pengajuan"}
              </Button>
            </form>
          )}
        {data?.data?.state === "pending" && (
          <div className="flex items-center gap-3 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
            <Clock3 size={18} />
            Pengajuan sedang ditinjau. Periksa kembali nanti.
          </div>
        )}
        {isError && (
          <p role="alert" className="text-sm">
            Status pengajuan belum dapat dimuat.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => refetch()}
            >
              Coba lagi
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
