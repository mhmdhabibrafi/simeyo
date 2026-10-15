"use client";
import { useState } from "react";
import { useInfiniteQuery, useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/providers";
type Report = {
  id: number;
  body: string;
  reason: string;
  details: string | null;
  author_id: number;
};
export default function Page() {
  const toast = useToast();
  const [selected, setSelected] = useState<Report | null>(null);
  const [action, setAction] = useState("dismiss");
  const [note, setNote] = useState("");
  const q = useInfiniteQuery({
    queryKey: ["moderation"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<{
        data: Report[];
        next_cursor: string | null;
        stats: {
          pending_reports: number;
          active_members: number;
          communities: number;
        };
      }>(
        `admin/moderation${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (p) => p.next_cursor,
  });
  const orgs = useQuery({
    queryKey: ["organization-requests"],
    queryFn: () =>
      api<{ data: { id: number; name: string; owner_id: number }[] }>(
        "admin/organizations",
      ),
  });
  const [orgId, setOrgId] = useState<number | null>(null);
  const m = useMutation({
    mutationFn: () =>
      api(
        orgId
          ? `admin/organizations/${orgId}`
          : `admin/moderation/${selected!.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(orgId ? { note } : { action, note }),
        },
      ),
    onSuccess: () => {
      setSelected(null);
      setOrgId(null);
      setNote("");
      q.refetch();
      orgs.refetch();
      toast("Tinjauan disimpan dan diaudit.");
    },
    onError: (e) => toast(e.message),
  });
  return (
    <>
      <header className="border-b border-[var(--border)] p-6">
        <h1 className="text-xl font-semibold">Moderasi kampus</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Setiap keputusan memerlukan alasan dan tercatat dalam audit.
        </p>
      </header>
      <div className="p-6">
        {q.isError && (
          <p role="alert">
            Akses moderasi tidak tersedia. Peran moderator atau administrator
            diperlukan.
          </p>
        )}
        {q.data && (
          <p className="text-sm text-[var(--muted)]">
            {q.data.pages[0].stats.pending_reports} laporan menunggu ·{" "}
            {q.data.pages[0].stats.active_members} anggota aktif ·{" "}
            {q.data.pages[0].stats.communities} komunitas
          </p>
        )}
      </div>
      {q.data?.pages
        .flatMap((p) => p.data)
        .map((r) => (
          <article
            key={r.id}
            className="space-y-3 border-b border-[var(--border)] p-6"
          >
            <p className="text-xs text-[var(--muted)]">
              Laporan #{r.id} · {r.reason}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-7">{r.body}</p>
            {r.details && (
              <p className="text-sm text-[var(--muted)]">{r.details}</p>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setSelected(r);
                setAction("dismiss");
                setNote("");
              }}
            >
              Tinjau laporan
            </Button>
          </article>
        ))}
      {q.hasNextPage && (
        <Button onClick={() => q.fetchNextPage()}>Laporan lainnya</Button>
      )}
      {orgs.data && (
        <section className="p-6">
          <h2 className="font-semibold">Verifikasi organisasi</h2>
          {orgs.data.data.map((c) => (
            <div
              key={c.id}
              className="mt-4 flex items-center justify-between gap-3 text-sm"
            >
              <span>{c.name}</span>
              <Button
                variant="outline"
                onClick={() => {
                  setOrgId(c.id);
                  setNote("");
                }}
              >
                Tinjau organisasi
              </Button>
            </div>
          ))}
        </section>
      )}
      <ConfirmDialog
        open={!!selected || !!orgId}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setOrgId(null);
          }
        }}
        title={orgId ? "Verifikasi organisasi" : "Tinjau laporan"}
        description="Periksa bukti dan konteks. Penangguhan akun hanya tersedia untuk administrator dan langsung mencabut sesi serta token."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          {!orgId && (
            <label className="block text-sm">
              Keputusan
              <select
                className="input mt-2 w-full"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="dismiss">Tutup tanpa tindakan</option>
                <option value="remove">Hapus konten</option>
                <option value="suspend">Tangguhkan akun</option>
              </select>
            </label>
          )}
          <label className="block text-sm">
            Alasan tinjauan
            <textarea
              className="input mt-2 min-h-24 w-full"
              required
              minLength={10}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={m.isPending}>
            Simpan keputusan
          </Button>
        </form>
      </ConfirmDialog>
    </>
  );
}
