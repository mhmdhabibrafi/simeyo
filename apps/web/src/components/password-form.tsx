"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { api, ApiError } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { authenticationOptionsSchema } from "../../../../packages/api-contracts/src";
function Form({ reset }: { reset: boolean }) {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const policy = useQuery({ queryKey: ["auth-options"], enabled: !reset, queryFn: async () => authenticationOptionsSchema.parse((await api<{data: unknown}>("auth/options")).data) });
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
    <main id="main" className="mx-auto w-full max-w-md px-6 py-12">
      <Brand />
      <h1 className="mb-3 mt-12 text-3xl font-semibold tracking-tight">
        {reset ? "Kata sandi baru." : "Kembali ke ruangmu."}
      </h1>
      <p className="mb-7 text-sm leading-7 text-[var(--muted)]">
        {reset
          ? "Gunakan minimal 12 karakter, huruf besar, huruf kecil, dan angka."
          : "Masukkan email akunmu. Kami akan mengirim tautan pemulihan jika email terdaftar."}
      </p>
      {message ? (
        <div
          role="status"
          className="rounded-xl bg-[var(--soft)] p-5 text-sm leading-7"
        >
          {message}
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
          </Button>
        </form>
      )}
      <Link
        href="/login"
        className="mt-7 inline-flex min-h-11 items-center text-sm text-[var(--accent)]"
      >
        ← Kembali ke halaman masuk
      </Link>
    </main>
  );
}
export function PasswordForm({ reset = false }: { reset?: boolean }) {
  return (
    <Suspense fallback={<div className="skeleton mx-auto mt-20 h-72 w-80" />}>
      <Form reset={reset} />
    </Suspense>
  );
}
