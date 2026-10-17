"use client";
import { useEffect, useRef, useState } from "react";
import { ProfileCover } from "@/components/profile-cover";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ImagePlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  userSchema,
  type User,
} from "../../../../../../../packages/api-contracts/src";
import {
  profileValues,
  readProfileDraft,
  saveProfileDraft,
  clearProfileDraft,
  type ProfileValues,
} from "@/lib/profile-draft";
import { useMe } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers";
import { Avatar } from "@/components/app-shell";
import { PhotoCropper } from "@/components/photo-cropper";
import { ConfirmDialog } from "@/components/ui/dialog";
export default function Page() {
  const { data: user } = useMe();
  return user ? (
    <ProfileEditor key={user.id} u={user} />
  ) : (
    <div className="skeleton m-5 h-64" aria-label="Memuat profil" />
  );
}
function ProfileEditor({ u }: { u: User }) {
  const [baseline, setBaseline] = useState(() => profileValues(u));
  const [restored] = useState(() => readProfileDraft(u.id));
  const [values, setValues] = useState<ProfileValues>(
    () => restored ?? baseline,
  );
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const [draftSaved, setDraftSaved] = useState(true);
  const actionLock = useRef(false);
  function change<K extends keyof ProfileValues>(
    key: K,
    value: ProfileValues[K],
  ) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (JSON.stringify(next) === JSON.stringify(baseline))
      clearProfileDraft(u.id);
    else setDraftSaved(saveProfileDraft(u.id, next));
  }
  async function photoChanged(kind: string, url: string | null) {
    await Promise.all([
      client.cancelQueries({ queryKey: ["me"] }),
      client.cancelQueries({ queryKey: ["profile"] }),
    ]);
    if (client.getQueryData<User>(["me"])?.id !== u.id) return;
    const field = kind === "avatar" ? "avatar_url" : "cover_url";
    client.setQueryData<User>(["me"], (old) =>
      old ? { ...old, [field]: url } : old,
    );
    client.setQueriesData<User>({ queryKey: ["profile"] }, (old) =>
      old?.id === u.id ? { ...old, [field]: url } : old,
    );
  }
  const client = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [crop, setCrop] = useState<{
    file: File;
    kind: "avatar" | "cover";
  } | null>(null);
  const [removePhoto, setRemovePhoto] = useState<"avatar" | "cover" | null>(
    null,
  );
  const [leave, setLeave] = useState(false);
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
  useEffect(() => {
    if (busy || !error || crop || removePhoto) return;
    const field = Object.keys(errors)[0]?.split(".")[0];
    (
      document.getElementById(field || "profile-error") ??
      document.getElementById("profile-error")
    )?.focus();
  }, [busy, error, errors, crop, removePhoto]);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    setErrors({});
    const payload = {
      ...values,
      links: values.links
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean),
      interests: values.interests
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    };
    try {
      const response = await api<{ data: unknown }>("me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const saved = userSchema.parse(response.data);
      await Promise.all([
        client.cancelQueries({ queryKey: ["me"] }),
        client.cancelQueries({ queryKey: ["profile"] }),
      ]);
      if (client.getQueryData<User>(["me"])?.id !== u.id) return;
      client.setQueryData(["me"], saved);
      client.setQueriesData<User>({ queryKey: ["profile"] }, (old) =>
        old?.id === saved.id ? saved : old,
      );
      if (saved.username !== u.username)
        client.removeQueries({ queryKey: ["profile", u.username] });
      const canonical = profileValues(saved);
      setBaseline(canonical);
      setValues(canonical);
      clearProfileDraft(u.id);
      toast("Profil disimpan.");
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors);
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Profil belum dapat disimpan.",
      );
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function upload(file: File | undefined, kind: string) {
    if (!file || actionLock.current) return false;
    setErrors({});
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Gunakan gambar JPEG, PNG, atau WebP.");
      return false;
    }
    actionLock.current = true;
    setBusy(true);
    setUploading(kind);
    setError("");
    const form = new FormData();
    form.set("kind", kind);
    form.set("image", file);
    try {
      const result = await api<{ data: { url: string } }>("me/media", {
        method: "POST",
        body: form,
      });
      if (typeof result.data?.url !== "string" || !result.data.url)
        throw new Error("Foto belum dapat dikonfirmasi.");
      await photoChanged(kind, result.data.url);
      toast("Foto diperbarui.");
      return true;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Upload belum berhasil.",
      );
      return false;
    } finally {
      setBusy(false);
      setUploading("");
      actionLock.current = false;
    }
  }
  return (
    <>
      {crop && (
        <PhotoCropper
          key={crop.file.name + crop.file.lastModified}
          file={crop.file}
          kind={crop.kind}
          busy={busy}
          uploadError={error}
          onSave={(file) => upload(file, crop.kind)}
          onClose={() => {
            setCrop(null);
            setError("");
          }}
        />
      )}
      <header className="page-header sticky top-0 z-30 justify-between bg-[var(--surface)]/95 backdrop-blur">
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
          <h1 className="whitespace-nowrap text-base font-semibold sm:text-lg">
            Edit profil
          </h1>
        </div>
        <Button
          form="profile-form"
          disabled={busy || !dirty}
          className="min-h-11 px-4 text-xs sm:text-sm"
        >
          {busy && !uploading ? (
            "Menyimpan…"
          ) : (
            <>
              <span className="sm:hidden" aria-hidden="true">
                Simpan
              </span>
              <span className="sr-only sm:not-sr-only">Simpan perubahan</span>
            </>
          )}
        </Button>
      </header>
      <div className="px-4 pb-8 pt-5 sm:px-6">
        <section aria-label="Foto profil dan sampul" className="mb-7">
          <div className="relative aspect-[3/1] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--soft)]">
            {u.cover_url ? (
              <ProfileCover url={u.cover_url} alt="Sampul profil saat ini" />
            ) : (
              <div className="flex h-full items-center justify-center pb-5 text-[var(--muted)]">
                <ImagePlus size={28} strokeWidth={1.4} aria-hidden="true" />
              </div>
            )}
            <button
              type="button"
              onClick={() => document.getElementById("cover")?.click()}
              disabled={busy}
              className="absolute right-3 top-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-semibold shadow-sm"
            >
              <ImagePlus size={16} />
              {u.cover_url ? "Ubah sampul" : "Tambah sampul"}
            </button>
          </div>
          <div className="relative -mt-8 ml-3 flex items-end gap-3 sm:ml-4">
            <button
              type="button"
              aria-label="Ubah foto profil"
              disabled={busy}
              onClick={() => document.getElementById("avatar")?.click()}
              className="relative shrink-0 rounded-full border-4 border-[var(--surface)] bg-[var(--surface)]"
            >
              <Avatar name={u.name} url={u.avatar_url} size={80} />
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--foreground)] text-[var(--surface)]">
                <Camera size={15} />
              </span>
            </button>
            <div className="min-w-0 pb-1">
              <p className="truncate text-sm font-semibold">{u.name}</p>
              <p className="mt-1 truncate text-xs text-[var(--muted)]">
                @{u.username}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            {u.avatar_url && (
              <button
                type="button"
                disabled={busy}
                className="min-h-11 text-xs text-[var(--muted)] underline underline-offset-4"
                onClick={() => setRemovePhoto("avatar")}
              >
                Hapus foto profil
              </button>
            )}
            {u.cover_url && (
              <button
                type="button"
                disabled={busy}
                className="min-h-11 text-xs text-[var(--muted)] underline underline-offset-4"
                onClick={() => setRemovePhoto("cover")}
              >
                Hapus sampul
              </button>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Ketuk foto untuk mengubahnya. Foto dan sampul disimpan terpisah
            melalui tombol Simpan foto.
          </p>
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
                const selected = input.files?.[0];
                if (selected) {
                  if (
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      selected.type,
                    )
                  )
                    setError("Gunakan gambar JPEG, PNG, atau WebP.");
                  else if (selected.size > 64 * 1024 * 1024)
                    setError("Ukuran foto melebihi batas unggahan 64 MB.");
                  else {
                    setError("");
                    setCrop({ file: selected, kind });
                  }
                }
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
        <p
          aria-live="polite"
          className="mb-5 text-xs leading-5 text-[var(--muted)]"
        >
          {busy
            ? uploading
              ? "Foto sedang disimpan. Tunggu sampai selesai."
              : "Menyimpan perubahan..."
            : dirty
              ? draftSaved
                ? "Belum disimpan. Draft tersedia di sesi perangkat ini."
                : "Belum disimpan. Draft perangkat tidak tersedia; tetap di halaman ini sampai berhasil."
              : "Perubahan profil sudah tersimpan."}
        </p>
        {restored && dirty && (
          <p className="mb-4 text-xs text-[var(--muted)]">
            Draft dipulihkan. Periksa kembali sebelum menyimpan.
          </p>
        )}
        {error && !crop && !removePhoto && (
          <p
            id="profile-error"
            tabIndex={-1}
            role="alert"
            className="mb-5 rounded-xl border border-red-500/40 p-3 text-sm text-[var(--foreground)]"
          >
            {error}
          </p>
        )}
        <form id="profile-form" key={u.id} onSubmit={save} aria-busy={busy}>
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <legend className="sr-only">Informasi profil</legend>
            <h2 className="text-sm font-semibold">Tentang kamu</h2>
            <div className="grid gap-5">
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
                      value={String(values[f.name as keyof ProfileValues])}
                      onChange={(event) =>
                        change(
                          f.name as keyof ProfileValues,
                          event.target.value,
                        )
                      }
                      maxLength={f.max}
                      className="field min-h-24 resize-y"
                      aria-invalid={Object.keys(errors).some(
                        (key) => key === f.name || key.startsWith(f.name + "."),
                      )}
                      aria-describedby={`${f.name}-hint`}
                    />
                  ) : (
                    <input
                      id={f.name}
                      name={f.name}
                      value={String(values[f.name as keyof ProfileValues])}
                      onChange={(event) =>
                        change(
                          f.name as keyof ProfileValues,
                          event.target.value,
                        )
                      }
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
                          ? `${values.bio.length}/500`
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
                checked={values.academic_visible}
                onChange={(event) =>
                  change("academic_visible", event.target.checked)
                }
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
            <label className="flex min-h-12 items-center justify-between gap-4 text-sm">
              <span>
                Akun privat
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                  Setujui pengikut sebelum mereka melihat ceritamu.
                </span>
              </span>
              <input
                name="private_account"
                aria-label="Akun privat"
                type="checkbox"
                checked={values.private_account}
                onChange={(event) =>
                  change("private_account", event.target.checked)
                }
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
        busy={busy}
        open={!!removePhoto}
        onOpenChange={(open) => {
          if (!open && !busy) setRemovePhoto(null);
        }}
        title={
          removePhoto === "cover"
            ? "Hapus sampul profil?"
            : "Hapus foto profil?"
        }
        description="Kamu dapat mengunggah foto baru kapan saja."
      >
        {error && (
          <p role="alert" className="mb-3 text-sm">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setRemovePhoto(null)}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              if (actionLock.current) return;
              actionLock.current = true;
              setBusy(true);
              setError("");
              try {
                await api(`me/media/${removePhoto}`, { method: "DELETE" });
                await photoChanged(removePhoto!, null);
                setRemovePhoto(null);
                toast("Foto dihapus.");
              } catch {
                setError("Foto belum dapat dihapus. Coba lagi.");
              } finally {
                actionLock.current = false;
                setBusy(false);
              }
            }}
          >
            Hapus foto
          </Button>
        </div>
      </ConfirmDialog>
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
          <Button
            onClick={() => {
              clearProfileDraft(u.id);
              router.push("/profile");
            }}
          >
            Tinggalkan
          </Button>
        </div>
      </ConfirmDialog>
    </>
  );
}
