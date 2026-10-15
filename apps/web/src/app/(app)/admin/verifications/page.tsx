"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useMe } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/providers";
type Item = {
  id: number;
  state: string;
  statement: string;
  requested_affiliation: string;
  user: { id: number; name: string; username: string };
};
export default function Page() {
  const { data: u } = useMe();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<{
    item: Item;
    state: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const q = useQuery({
    queryKey: ["admin-verifications", page],
    queryFn: () =>
      api<{ data: Item[]; last_page: number }>(
        `admin/verifications?page=${page}`,
      ),
    enabled: !!u?.can_review_verifications,
  });
  async function review(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selection) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api(`admin/verifications/${selection.item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          state: selection.state,
          review_note: form.get("note"),
        }),
      });
      await q.refetch();
      setSelection(null);
      toast("Review tersimpan pada audit log.");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat().join(" ") || e.message
          : "Review belum berhasil.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="p-6">
      <p className="text-xs uppercase tracking-[.15em] text-[var(--muted)]">
        Administrator
      </p>
      <h1 className="mb-7 mt-3 text-2xl font-semibold">Review afiliasi</h1>
      {!u?.can_review_verifications ? (
        <p role="alert">Akses administrator diperlukan.</p>
      ) : q.isPending ? (
        <div className="skeleton h-40" />
      ) : q.isError ? (
        <>
          <p role="alert">
            Pengajuan tidak dapat dimuat. Pastikan akun administrator
            terverifikasi.
          </p>
          <Button onClick={() => q.refetch()}>Coba lagi</Button>
        </>
      ) : (
        <>
          <div className="space-y-4">
            {q.data?.data.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[var(--border)] p-5"
              >
                <h2 className="text-sm font-semibold">
                  {item.user.name}{" "}
                  <span className="font-normal text-[var(--muted)]">
                    @{item.user.username}
                  </span>
                </h2>
                <p className="my-2 text-xs text-[var(--muted)]">
                  {item.requested_affiliation} · {item.state}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {item.statement}
                </p>
                {item.state === "pending" && (
                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={() => setSelection({ item, state: "approved" })}
                    >
                      Setujui
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelection({ item, state: "rejected" })}
                    >
                      Tolak
                    </Button>
                  </div>
                )}
                {item.state === "approved" && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSelection({ item, state: "suspended" })}
                  >
                    Tangguhkan
                  </Button>
                )}
              </article>
            ))}
            {q.data?.data.length === 0 && (
              <p className="text-sm text-[var(--muted)]">
                Belum ada pengajuan afiliasi.
              </p>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <Button
              variant="ghost"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Sebelumnya
            </Button>
            <span className="text-xs">Halaman {page}</span>
            <Button
              variant="ghost"
              disabled={page === (q.data?.last_page ?? 1)}
              onClick={() => setPage(page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={!!selection}
        onOpenChange={(open) => {
          if (!open) setSelection(null);
        }}
        title="Konfirmasi keputusan"
        description={`Keputusan ${selection?.state ?? ""} akan disimpan bersama identitas reviewer dan waktu tindakan.`}
      >
        <form onSubmit={review}>
          <label className="form-label" htmlFor="note">
            Catatan untuk pemilik akun
          </label>
          <textarea
            id="note"
            name="note"
            required
            minLength={10}
            maxLength={1000}
            className="field min-h-24"
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelection(null)}
            >
              Batal
            </Button>
            <Button disabled={busy}>Simpan keputusan</Button>
          </div>
        </form>
      </ConfirmDialog>
    </div>
  );
}
