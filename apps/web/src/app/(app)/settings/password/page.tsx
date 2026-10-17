"use client";

import { useState, type FormEvent } from "react";
import { BackButton } from "@/components/ui/back-button";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function Page() {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api("me/password", {
        method: "PUT",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      setSaved(true);
      await client.invalidateQueries({ queryKey: ["sessions"] });
    } catch (error) {
      setError(
        error instanceof ApiError
          ? Object.values(error.errors).flat().join(" ") || error.message
          : "Kata sandi belum dapat diperbarui. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="page-header">
        <BackButton fallback="/settings" label="Kembali ke pengaturan" />
        <h1>Ubah kata sandi</h1>
      </header>
      <div className="p-6">
        <p className="mb-6 text-sm leading-7 text-[var(--muted)]">
          Gunakan minimal 12 karakter, huruf besar, huruf kecil, dan angka.
          Perangkat lain akan keluar dan perlu masuk kembali. Sesi web ini tetap
          aktif.
        </p>
        <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <legend className="sr-only">Ubah kata sandi</legend>
            {[
              ["current_password", "Kata sandi saat ini", "current-password"],
              ["password", "Kata sandi baru", "new-password"],
              [
                "password_confirmation",
                "Konfirmasi kata sandi baru",
                "new-password",
              ],
            ].map(([name, label, autocomplete]) => (
              <div key={name}>
                <label htmlFor={name} className="form-label">
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type="password"
                  autoComplete={autocomplete}
                  required
                  maxLength={1024}
                  minLength={name === "current_password" ? 1 : 12}
                  className="field"
                />
              </div>
            ))}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            {saved && (
              <p role="status" className="text-sm leading-6">
                Kata sandi diperbarui. Perangkat lain telah dikeluarkan.
              </p>
            )}
            <Button disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan kata sandi"}
            </Button>
          </fieldset>
        </form>
      </div>
    </>
  );
}
