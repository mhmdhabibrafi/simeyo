"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ImagePlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers";
import { Avatar } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/ui/dialog";
export default function Page() {
  const { data: u } = useMe();
  const client = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [dirty, setDirty] = useState(false);
  const [leave, setLeave] = useState(false);
  const [bioLength, setBioLength] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  if (!u) return null;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setErrors({});
    const form = new FormData(e.currentTarget);
    const values = {
      name: form.get("name"),
      username: form.get("username"),
      bio: form.get("bio"),
      location: form.get("location"),
      links: String(form.get("links") || "")
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean),
      interests: String(form.get("interests") || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      academic_visible: form.get("academic_visible") === "on",
      private_account: form.get("private_account") === "on",
    };
    try {
      await api("me", { method: "PATCH", body: JSON.stringify(values) });
      await client.invalidateQueries({ queryKey: ["me"] });
      await client.invalidateQueries({ queryKey: ["profile"] });
      setDirty(false);
      toast("Profil disimpan.");
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors);
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Profil belum dapat disimpan.",
      );
      requestAnimationFrame(() => {
        const field =
          e instanceof ApiError
            ? Object.keys(e.errors)[0]?.split(".")[0]
            : undefined;
        document.getElementById(field || "profile-error")?.focus();
      });
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined, kind: string) {
    if (!file || busy) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Gunakan gambar JPEG, PNG, atau WebP.");
      return;
    }
    setBusy(true);
    setUploading(kind);
    setError("");
    const form = new FormData();
    form.set("kind", kind);
    form.set("image", file);
    try {
      await api("me/media", { method: "POST", body: form });
      await client.invalidateQueries({ queryKey: ["me"] });
      await client.invalidateQueries({ queryKey: ["profile"] });
      toast("Foto diperbarui.");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Upload belum berhasil.",
      );
    } finally {
      setBusy(false);
      setUploading("");
    }
  }
  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="icon-button -ml-2"
            aria-label="Kembali ke profil"
            disabled={busy}
            onClick={() => (dirty ? setLeave(true) : router.push("/profile"))}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold sm:text-lg">Edit profil</h1>
        </div>
        <Button
          form="profile-form"
          disabled={busy || !dirty}
          className="min-h-9 px-3 text-xs sm:text-sm"
        >
          {busy && !uploading ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </header>
      <div className="px-4 pb-8 pt-5 sm:px-6">
        <section aria-label="Foto profil dan sampul" className="mb-7">
          {u.cover_url && (
            <div className="relative h-28 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--soft)] sm:h-32">
              {u.cover_url && (
                <Image
                  unoptimized
                  src={u.cover_url}
                  alt="Sampul profil saat ini"
                  width={1200}
                  height={400}
                  className="h-full w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => document.getElementById("cover")?.click()}
                disabled={busy}
                className="absolute bottom-3 right-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium"
              >
                <ImagePlus size={16} />
                {u.cover_url ? "Ubah sampul" : "Tambah sampul"}
              </button>
            </div>
          )}
          <div
            className={`relative flex items-center gap-4 ${u.cover_url ? "-mt-9 ml-4" : ""}`}
          >
            <button
              type="button"
              aria-label="Ubah foto profil"
              disabled={busy}
              onClick={() => document.getElementById("avatar")?.click()}
              className="relative shrink-0 rounded-full border-4 border-[var(--surface)] bg-[var(--surface)]"
            >
              <Avatar name={u.name} url={u.avatar_url} size={72} />
              <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-[var(--surface)] bg-[var(--foreground)] p-1.5 text-[var(--surface)]">
                <Camera size={14} />
              </span>
            </button>
            <div>
              <p className="mb-1 text-sm font-semibold">Foto profil</p>
              <p className="text-xs leading-5 text-[var(--muted)]">
                Foto langsung disimpan.
                <br />
                JPEG, PNG, atau WebP.
              </p>
            </div>
          </div>
          {!u.cover_url && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
              <span className="text-xs text-[var(--muted)]">
                Sampul profil · opsional
              </span>
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-semibold hover:bg-[var(--soft)]"
                disabled={busy}
                onClick={() => document.getElementById("cover")?.click()}
              >
                <ImagePlus size={16} />
                Tambah sampul
              </button>
            </div>
          )}
          {(["avatar", "cover"] as const).map((kind) => (
            <input
              key={kind}
              id={kind}
              aria-label={kind === "avatar" ? "Foto profil" : "Foto sampul"}
              type="file"
              tabIndex={-1}
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={async (event) => {
                const input = event.currentTarget;
                await upload(input.files?.[0], kind);
                input.value = "";
              }}
            />
          ))}
          {uploading && (
            <p role="status" className="mt-4 text-xs text-[var(--muted)]">
              {uploading === "avatar"
                ? "Mengunggah foto profil…"
                : "Mengunggah sampul…"}
            </p>
          )}
        </section>
        {error && (
          <p
            id="profile-error"
            tabIndex={-1}
            role="alert"
            className="mb-5 rounded-xl border border-red-500/40 p-3 text-sm text-[var(--foreground)]"
          >
            {error}
          </p>
        )}
        <form
          id="profile-form"
          key={u.id}
          onSubmit={save}
          onChange={() => setDirty(true)}
        >
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <legend className="sr-only">Informasi profil</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  name: "name",
                  label: "Nama tampilan",
                  value: u.name,
                  max: 80,
                },
                {
                  name: "username",
                  label: "Username",
                  value: u.username ?? "",
                  max: 24,
                },
                { name: "bio", label: "Bio", value: u.bio ?? "", max: 500 },
                {
                  name: "location",
                  label: "Lokasi (opsional)",
                  value: u.location ?? "",
                  max: 80,
                },
                {
                  name: "links",
                  label: "Tautan profil",
                  value: u.links.join("\n"),
                  max: 1280,
                },
                {
                  name: "interests",
                  label: "Minat",
                  value: u.interests.join(", "),
                  max: 410,
                },
              ].map((f) => (
                <div
                  key={f.name}
                  className={
                    ["name", "username"].includes(f.name)
                      ? "min-w-0"
                      : "min-w-0 sm:col-span-2"
                  }
                >
                  <label className="form-label" htmlFor={f.name}>
                    {f.label}
                  </label>
                  {["bio", "links"].includes(f.name) ? (
                    <textarea
                      id={f.name}
                      name={f.name}
                      defaultValue={f.value}
                      maxLength={f.max}
                      className="field min-h-24"
                      aria-invalid={Object.keys(errors).some(
                        (key) => key === f.name || key.startsWith(f.name + "."),
                      )}
                      aria-describedby={`${f.name}-hint`}
                      onChange={
                        f.name === "bio"
                          ? (event) => setBioLength(event.target.value.length)
                          : undefined
                      }
                    />
                  ) : (
                    <input
                      id={f.name}
                      name={f.name}
                      defaultValue={f.value}
                      maxLength={f.max}
                      required={["name", "username"].includes(f.name)}
                      className="field"
                      minLength={f.name === "username" ? 3 : undefined}
                      pattern={
                        f.name === "username" ? "[a-z0-9_]{3,24}" : undefined
                      }
                      autoCapitalize={
                        f.name === "username" ? "none" : undefined
                      }
                      spellCheck={f.name !== "username"}
                      aria-invalid={!!errors[f.name]}
                      aria-describedby={`${f.name}-hint`}
                    />
                  )}
                  <p
                    id={`${f.name}-hint`}
                    className="mt-1.5 text-xs leading-5 text-[var(--muted)]"
                  >
                    {Object.entries(errors)
                      .filter(
                        ([key]) =>
                          key === f.name || key.startsWith(f.name + "."),
                      )
                      .flatMap(([, messages]) => messages)
                      .join(" ") ||
                      (f.name === "username"
                        ? "3–24 karakter: huruf kecil, angka, atau garis bawah."
                        : f.name === "bio"
                          ? `${bioLength ?? u.bio?.length ?? 0}/500`
                          : f.name === "links"
                            ? "Satu tautan https:// per baris, maksimal 5."
                            : f.name === "interests"
                              ? "Pisahkan dengan koma, maksimal 10. Contoh: desain, teknologi."
                              : "")}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] pt-5">
              <h2 className="text-sm font-semibold">Privasi profil</h2>
            </div>
            <label className="flex min-h-12 items-center justify-between gap-4 text-sm">
              <span>
                Tampilkan informasi akademik pada profil
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                  Fakultas, program studi, dan angkatan.
                </span>
              </span>
              <input
                name="academic_visible"
                type="checkbox"
                defaultChecked={u.academic_visible}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
            <label className="flex min-h-12 items-center justify-between gap-4 text-sm">
              <span>Akun privat</span>
              <input
                name="private_account"
                type="checkbox"
                defaultChecked={u.private_account}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
            <p className="text-xs leading-6 text-[var(--muted)]">
              Akun privat membatasi cerita untuk pengikut yang telah kamu
              setujui.
            </p>
          </fieldset>
        </form>
      </div>
      <ConfirmDialog
        open={leave}
        onOpenChange={setLeave}
        title="Tinggalkan perubahan?"
        description="Perubahan teks dan privasi belum disimpan. Foto yang sudah diunggah tetap tersimpan."
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setLeave(false)}>
            Lanjut mengedit
          </Button>
          <Button onClick={() => router.push("/profile")}>Tinggalkan</Button>
        </div>
      </ConfirmDialog>
    </>
  );
}
