"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
type Catalog = {
  data: { id: number; name: string }[];
  faculties: { id: number; name: string; institution_id: number }[];
  departments: { id: number; name: string; faculty_id: number }[];
  cohorts: { id: number; year: number; institution_id: number }[];
};
export default function Page() {
  const { data: user } = useMe();
  const router = useRouter();
  const client = useQueryClient();
  const [institution, setInstitution] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const catalog = useQuery({
    queryKey: ["institutions"],
    queryFn: () => api<Catalog>("institutions"),
  });
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(
      [...form].map(([key, value]) => [key, value ? Number(value) : null]),
    );
    try {
      await api("onboarding", { method: "POST", body: JSON.stringify(values) });
      await client.invalidateQueries({ queryKey: ["me"] });
      router.push("/settings#account-campus");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Tidak dapat menyimpan afiliasi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="p-6">
      <p className="text-xs uppercase tracking-[.15em] text-[var(--accent)]">
        Kenalan dulu, yuk
      </p>
      <h1 className="mb-3 mt-4 text-3xl font-semibold tracking-tight">
        Di mana ruangmu?
      </h1>
      <p className="mb-8 text-sm leading-7 text-[var(--muted)]">
        Pilih kampusmu. Fakultas, program studi, dan angkatan bersifat opsional
        dan disembunyikan secara default.
      </p>
      {!user?.email_verified ? (
        <Link href="/settings#account-campus" className="text-sm text-[var(--accent)]">
          Verifikasi email sebelum melanjutkan →
        </Link>
      ) : catalog.isPending ? (
        <div className="skeleton h-64" />
      ) : catalog.isError ? (
        <>
          <p role="alert">Data kampus belum dapat dimuat.</p>
          <Button onClick={() => catalog.refetch()}>Coba lagi</Button>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="form-label" htmlFor="institution">
              Kampus
            </label>
            <select
              id="institution"
              name="institution_id"
              required
              value={institution}
              onChange={(e) => {
                setInstitution(e.target.value);
                setFaculty("");
                setDepartment("");
              }}
              className="field"
            >
              <option value="">Pilih kampus</option>
              {catalog.data?.data.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="faculty">
              Fakultas (opsional)
            </label>
            <select
              id="faculty"
              name="faculty_id"
              value={faculty}
              onChange={(e) => {
                setFaculty(e.target.value);
                setDepartment("");
              }}
              className="field"
            >
              <option value="">Tidak dicantumkan</option>
              {catalog.data?.faculties
                .filter((f) => String(f.institution_id) === institution)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="department">
              Program studi (opsional)
            </label>
            <select
              id="department"
              name="department_id"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="field"
            >
              <option value="">Tidak dicantumkan</option>
              {catalog.data?.departments
                .filter((d) => String(d.faculty_id) === faculty)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="cohort">
              Angkatan (opsional)
            </label>
            <select id="cohort" name="academic_cohort_id" className="field">
              <option value="">Tidak dicantumkan</option>
              {catalog.data?.cohorts
                .filter((c) => String(c.institution_id) === institution)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.year}
                  </option>
                ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan dan lanjutkan"}
          </Button>
        </form>
      )}
    </div>
  );
}
