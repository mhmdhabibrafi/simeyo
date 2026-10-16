"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authFormSchema, userSchema } from "../../../../packages/api-contracts/src";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthOptions } from "@/lib/auth";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Brand } from "./brand";
import { ThemeToggle } from "./providers";
import { FirebaseSignIn } from "./firebase-sign-in";
import { api, ApiError } from "@/lib/api";
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const client = useQueryClient();
  const [show, setShow] = useState(false);
  const registerMode = mode === "register";
  const policy = useAuthOptions(registerMode);
  const schema = authFormSchema(mode);
  type Fields = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({ resolver: zodResolver(schema) });
  const [error, setFailure] = useState("");
  const submit = handleSubmit(async (data) => {
    setFailure("");
    try {
      const result = await api<{ data: unknown }>(`auth/${mode}`, { method: "POST", body: JSON.stringify(data) });
      const user = userSchema.parse(result.data);
      await client.cancelQueries();
      client.clear();
      client.setQueryData(["me"], user);
      router.push(registerMode ? "/settings#account-campus" : "/home");
    } catch (e) {
      if (e instanceof ApiError) {
        Object.entries(e.errors).forEach(([key, value]) =>
          setError(key as keyof Fields, { message: value[0] }),
        );
        setFailure(e.message);
      } else setFailure("Koneksi terputus. Coba lagi.");
    }
  });
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7">
        <Brand />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href={registerMode ? "/login" : "/register"}
            className="text-sm font-medium"
          >
            {registerMode
              ? "Sudah punya akun? Masuk"
              : "Belum bergabung? Daftar"}
          </Link>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto max-w-lg px-6 py-10 sm:py-16"
      >
        <section className="mx-auto w-full max-w-[420px]">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            {registerMode ? "Bergabung dengan Simeyo." : "Selamat datang kembali."}
          </h2>
          <p className="mb-8 mt-3 text-center text-sm leading-6 text-[var(--muted)]">
            {registerMode
              ? "Buat akun, verifikasi afiliasi, lalu mulai terhubung."
              : "Masuk untuk melanjutkan cerita kampusmu."}
          </p>
          <FirebaseSignIn />
          <form onSubmit={submit} className="space-y-5" noValidate>
            {registerMode && (policy.isPending || policy.isError || !policy.data?.registration_enabled || !policy.data?.email_delivery_enabled) && <div className="rounded-xl border border-[var(--border)] p-4 text-sm leading-6">
              {policy.isPending ? <p role="status">Memeriksa ketersediaan pendaftaran…</p> : policy.isError ? <><p role="alert">Informasi pendaftaran belum dapat dimuat.</p><button type="button" onClick={() => policy.refetch()} className="mt-2 font-semibold underline">Coba lagi</button></> : <>
                {!policy.data.registration_enabled && <p role="status">Pendaftaran belum dibuka. Kamu tetap dapat masuk jika sudah memiliki akun.</p>}
                {policy.data.registration_enabled && !policy.data.email_delivery_enabled && <p role="status">Email verifikasi belum tersedia. Akun baru tetap belum terverifikasi dan belum dapat mengakses percakapan kampus.</p>}
              </>}
            </div>}
            {(registerMode
              ? [
                  "name",
                  "username",
                  "email",
                  "password",
                  "password_confirmation",
                ]
              : ["email", "password"]
            ).map((name) => {
              const field = name as keyof Fields;
              const labels: Record<string, string> = {
                name: "Nama lengkap",
                username: "Username",
                email: "Email",
                password: "Kata sandi",
                password_confirmation: "Ulangi kata sandi",
              };
              const password = name.includes("password");
              return (
                <div key={name}>
                  <label className="form-label" htmlFor={name}>
                    {labels[name]}
                  </label>
                  <div className="relative">
                    <input
                      id={name}
                      className={`field ${password ? "pr-12" : ""}`}
                      type={
                        password
                          ? show
                            ? "text"
                            : "password"
                          : name === "email"
                            ? "email"
                            : "text"
                      }
                      autoComplete={
                        password
                          ? registerMode
                            ? "new-password"
                            : "current-password"
                          : name === "name"
                            ? "name"
                            : name === "email"
                              ? "email"
                              : "username"
                      }
                      aria-invalid={!!errors[field]}
                      aria-describedby={
                        errors[field]
                          ? `${name}-error`
                          : name === "password" && registerMode
                            ? "password-help"
                            : undefined
                      }
                      {...register(field)}
                    />
                    {name === "password" && (
                      <button
                        className="icon-button absolute right-1 top-0.5"
                        type="button"
                        aria-label={
                          show
                            ? "Sembunyikan kata sandi"
                            : "Tampilkan kata sandi"
                        }
                        onClick={() => setShow(!show)}
                      >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                  {errors[field] && (
                    <p
                      id={`${name}-error`}
                      className="mt-2 text-xs text-red-600"
                    >
                      {errors[field]?.message}
                    </p>
                  )}
                  {name === "password" && registerMode && (
                    <p
                      id="password-help"
                      className="mt-2 text-xs leading-5 text-[var(--muted)]"
                    >
                      Minimal 12 karakter, huruf besar, huruf kecil, dan angka.
                    </p>
                  )}
                </div>
              );
            })}
            {!registerMode && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[var(--accent)]"
                >
                  Lupa kata sandi?
                </Link>
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}
            <Button className="w-full" disabled={isSubmitting || (registerMode && !policy.data?.registration_enabled)}>
              {isSubmitting
                ? "Memproses…"
                : registerMode
                  ? "Buat akun"
                  : "Masuk"}
              <ArrowRight size={17} />
            </Button>
          </form>
          <footer className="mt-10 border-t border-[var(--border)] pt-6 text-center">
            <p className="text-xs font-medium tracking-wide text-[var(--foreground)]">
              &copy; {new Date().getFullYear()} Simeyo
            </p>
            <p className="mx-auto mt-3 max-w-[300px] text-xs leading-5 text-[var(--muted)]">
              Platform komunitas independen.
              <br />
              Tidak mewakili layanan resmi universitas.
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
