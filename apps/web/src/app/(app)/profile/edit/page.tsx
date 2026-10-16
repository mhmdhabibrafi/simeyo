"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers";
import { Avatar } from "@/components/app-shell";
export default function Page() {
  const { data: u } = useMe();
  const client = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!u) return null;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
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
      toast("Profil disimpan.");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Profil belum dapat disimpan.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined, kind: string) {
    if (!file) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("kind", kind);
    form.set("image", file);
    try {
      await api("me/media", { method: "POST", body: form });
      await client.invalidateQueries({ queryKey: ["me"] });
      toast("Foto diperbarui.");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Upload belum berhasil.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="border-b border-[var(--border)] px-6 py-6">
        <h1 className="text-xl font-semibold">Edit profil</h1>
      </header>
      <div className="p-6">
        <div className="mb-8 flex flex-wrap items-center gap-5">
          <Avatar name={u.name} url={u.avatar_url} size={72} />
          <div className="space-y-3">
            <label htmlFor="avatar" className="form-label">
              Foto profil
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => upload(e.target.files?.[0], "avatar")}
              className="max-w-full text-xs"
            />
            <label htmlFor="cover" className="form-label">
              Foto sampul
            </label>
            <input
              id="cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => upload(e.target.files?.[0], "cover")}
              className="max-w-full text-xs"
            />
            <p className="text-xs text-[var(--muted)]">
              JPEG, PNG, atau WebP. Gambar dioptimalkan sebelum disimpan.
            </p>
          </div>
        </div>
        <form key={u.id} onSubmit={save} className="space-y-5">
          {[
            { name: "name", label: "Nama tampilan", value: u.name, max: 80 },
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
              label: "Tautan profil (satu per baris, maksimal 5)",
              value: u.links.join("\n"),
              max: 1280,
            },
            {
              name: "interests",
              label: "Minat (pisahkan dengan koma, maksimal 10)",
              value: u.interests.join(", "),
              max: 410,
            },
          ].map((f) => (
            <div key={f.name}>
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
                />
              ) : (
                <input
                  id={f.name}
                  name={f.name}
                  defaultValue={f.value}
                  maxLength={f.max}
                  required={["name", "username"].includes(f.name)}
                  className="field"
                />
              )}
            </div>
          ))}
          <label className="flex min-h-12 items-center gap-3 text-sm">
            <input
              name="academic_visible"
              type="checkbox"
              defaultChecked={u.academic_visible}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Tampilkan informasi akademik pada profil
          </label>
          <label className="flex min-h-12 items-center gap-3 text-sm">
            <input
              name="private_account"
              type="checkbox"
              defaultChecked={u.private_account}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Akun privat
          </label>
          <p className="text-xs leading-6 text-[var(--muted)]">
            Akun privat membatasi cerita untuk pengikut yang telah kamu setujui.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan perubahan"}
          </Button>
        </form>
      </div>
    </>
  );
}
