"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers";
type Person = { id: number; name: string; username: string };
export function PrivacyEdges() {
  const toast = useToast();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["privacy-edges"],
    queryFn: async () => {
      const [blocks, mutes] = await Promise.all([
        api<{ data: Person[] }>("privacy/blocks"),
        api<{ data: Person[] }>("privacy/mutes"),
      ]);
      return { blocks: blocks.data, mutes: mutes.data };
    },
  });
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Akun diblokir & disenyapkan</h1>
      <p className="my-4 text-sm leading-7 text-[var(--muted)]">
        Blokir membatasi akses di kedua arah. Senyapkan menyembunyikan cerita
        dari feedmu.
      </p>
      {q.isPending ? (
        <div className="skeleton h-40" />
      ) : q.isError ? (
        <>
          <p role="alert">Daftar belum dapat dimuat.</p>
          <Button onClick={() => q.refetch()}>Coba lagi</Button>
        </>
      ) : (
        ["blocks", "mutes"].map((kind) => (
          <section
            key={kind}
            className="mb-7 border-t border-[var(--border)] pt-5"
          >
            <h2 className="mb-4 text-sm font-semibold">
              {kind === "blocks" ? "Diblokir" : "Disenyapkan"}
            </h2>
            {q.data?.[kind as "blocks"].length === 0 && (
              <p className="text-xs text-[var(--muted)]">
                Belum ada akun dalam daftar ini.
              </p>
            )}
            {q.data?.[kind as "blocks"].map((u) => (
              <div
                key={u.id}
                className="my-3 flex items-center justify-between gap-4"
              >
                <span className="text-sm">
                  {u.name}{" "}
                  <span className="text-xs text-[var(--muted)]">
                    @{u.username}
                  </span>
                </span>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await api(
                        `relationships/${u.id}/${kind === "blocks" ? "block" : "mute"}`,
                        { method: "DELETE" },
                      );
                      await q.refetch();
                      client.invalidateQueries({ queryKey: ["feed"] });
                      client.invalidateQueries({ queryKey: ["people"] });
                      toast("Preferensi diperbarui.");
                    } catch {
                      toast("Perubahan belum tersimpan.");
                    }
                  }}
                >
                  Batalkan
                </Button>
              </div>
            ))}
          </section>
        ))
      )}
      <Link href="/settings" className="text-sm text-[var(--accent)]">
        ← Kembali ke pengaturan
      </Link>
    </div>
  );
}
export function FollowRequests() {
  const client = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["follow-requests"],
    queryFn: () => api<{ data: Person[] }>("follow-requests"),
  });
  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-semibold">Permintaan mengikuti</h1>
      {q.isPending ? (
        <div className="skeleton h-40" />
      ) : q.isError ? (
        <>
          <p role="alert">Permintaan belum dapat dimuat.</p>
          <Button onClick={() => q.refetch()}>Coba lagi</Button>
        </>
      ) : q.data?.data.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Belum ada permintaan mengikuti.
        </p>
      ) : (
        q.data?.data.map((u) => (
          <article
            key={u.id}
            className="mb-4 rounded-2xl border border-[var(--border)] p-5"
          >
            <Link href={`/u/${u.username}`} className="text-sm font-semibold">
              {u.name}{" "}
              <span className="text-xs font-normal text-[var(--muted)]">
                @{u.username}
              </span>
            </Link>
            <div className="mt-4 flex gap-3">
              {[true, false].map((accept) => (
                <Button
                  key={String(accept)}
                  variant={accept ? "default" : "outline"}
                  onClick={async () => {
                    try {
                      await api(`follow-requests/${u.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ accept }),
                      });
                      await q.refetch();
                      client.invalidateQueries({ queryKey: ["relationship"] });
                      client.invalidateQueries({ queryKey: ["feed"] });
                      toast(
                        accept
                          ? "Permintaan disetujui."
                          : "Permintaan ditolak.",
                      );
                    } catch {
                      toast("Keputusan belum tersimpan.");
                    }
                  }}
                >
                  {accept ? "Setujui" : "Tolak"}
                </Button>
              ))}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
