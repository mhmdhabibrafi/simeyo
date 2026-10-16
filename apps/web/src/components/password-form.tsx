"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "./auth-layout";
import { ArrowLeft, ArrowRight, CircleCheck, MailCheck } from "lucide-react";
import { Button } from "./ui/button";
import { api, ApiError } from "@/lib/api";
import { useAuthOptions } from "@/lib/auth";
function Form({ reset }: { reset: boolean }) {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const policy = useAuthOptions(!reset);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const result = await api<{ message: string }>(
        reset ? "auth/reset-password" : "auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({
            ...Object.fromEntries(form),
            ...(reset ? { token: params.get("token") } : {}),
          }),
        },
      );
      setMessage(result.message);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Permintaan belum berhasil.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      title={reset ? "Kata sandi baru." : "Lupa kata sandi?"}
      description={reset ? "Gunakan minimal 12 karakter, huruf besar, huruf kecil, dan angka." : "Masukkan email akunmu untuk menerima tautan pemulihan kata sandi."}
      linkHref="/login"
      linkLabel="Kembali masuk"
    >
      {message ? (
        <div
          role="status"
          className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-6 text-center"
        >
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)]">
            {reset ? <CircleCheck size={24} aria-hidden="true" /> : <MailCheck size={24} aria-hidden="true" />}
          </span>
          <p className="text-sm leading-6">{message}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {!reset && policy.data?.email_delivery_enabled === false && <p role="status" className="rounded-xl border border-[var(--border)] p-4 text-sm leading-6">Pemulihan melalui email belum tersedia. Jika masih masuk di perangkat lain, ubah kata sandi dari Pengaturan.</p>}
          {!reset && policy.isError && <div role="alert" className="text-sm">Layanan pemulihan belum dapat diperiksa. <button type="button" onClick={() => policy.refetch()} className="font-semibold underline">Coba lagi</button></div>}
          <div>
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={params.get("email") ?? ""}
              autoComplete="email"
              className="field"
            />
          </div>
          {reset &&
            ["password", "password_confirmation"].map((name) => (
              <div key={name}>
                <label className="form-label" htmlFor={name}>
                  {name === "password"
                    ? "Kata sandi baru"
                    : "Ulangi kata sandi"}
                </label>
                <input
                  id={name}
                  name={name}
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  className="field"
                />
              </div>
            ))}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy || (!reset && !policy.data?.email_delivery_enabled)}>
            {busy
              ? "Memproses…"
              : reset
                ? "Simpan kata sandi"
                : "Kirim tautan pemulihan"}
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
        </form>
      )}
      <Link
        href="/login"
        className={message ? "mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]" : "mt-6 flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"}
      >
        <ArrowLeft size={17} aria-hidden="true" /> Kembali ke halaman masuk
      </Link>
    </AuthLayout>
  );
}
export function PasswordForm({ reset = false }: { reset?: boolean }) {
  return (
    <Suspense fallback={<div className="skeleton mx-auto mt-20 h-72 w-80" />}>
      <Form reset={reset} />
    </Suspense>
  );
}
