"use client";
import { conversationReportsSchema } from "../../../../../packages/api-contracts/src/communications";
import { useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/providers";
type Report = {
  id: number;
  reporter_name: string;
  author_name: string;
  body: string | null;
  reason: string;
  details: string | null;
};
export function MessageReports() {
  const { data: me } = useMe();
  const toast = useToast();
  const [selected, setSelected] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const q = useInfiniteQuery({
    queryKey: ["message-reports"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      conversationReportsSchema.parse(
        await api(
          `admin/message-reports${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        ),
      ),
    getNextPageParam: (page) => page.next_cursor,
  });
  const review = useMutation({
    mutationFn: (data: Record<string, FormDataEntryValue>) =>
      api(`admin/message-reports/${selected!.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setSelected(null);
      q.refetch();
      toast("Tinjauan pesan disimpan.");
    },
    onError: (e) => setError(e.message),
  });
  return (
    <section className="border-y border-[var(--border)] p-6">
      <h2 className="font-semibold">Laporan pesan pribadi</h2>
      <p className="mb-5 mt-2 text-xs leading-5 text-[var(--muted)]">
        Hanya pesan yang dilampirkan dalam laporan. Riwayat percakapan tidak
        dibuka.
      </p>
      {q.isError ? (
        <p role="alert">
          Laporan pesan belum dapat dimuat.{" "}
          <button className="underline" onClick={() => q.refetch()}>
            Coba lagi
          </button>
        </p>
      ) : q.isPending ? (
        <p role="status">Memuat laporan pesan...</p>
      ) : (
        <>
          {!q.data?.pages[0].data.length && (
            <p className="text-sm text-[var(--muted)]">
              Tidak ada laporan pesan menunggu.
            </p>
          )}
          {q.data?.pages
            .flatMap((page) => page.data)
            .map((report) => (
              <article
                key={report.id}
                className="mb-4 rounded-xl border border-[var(--border)] p-4"
              >
                <p className="text-sm font-semibold">{report.author_name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Dilaporkan oleh {report.reporter_name} ({report.reason})
                </p>
                <p className="my-3 whitespace-pre-wrap break-words text-sm">
                  {report.body ?? "Belum ada pesan dari akun yang dilaporkan."}
                </p>
                {report.details && (
                  <p className="mb-3 whitespace-pre-wrap break-words text-sm text-[var(--muted)]">
                    {report.details}
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setError("");
                    setSelected(report);
                  }}
                >
                  Tinjau laporan pesan
                </Button>
              </article>
            ))}
          {q.hasNextPage && (
            <Button
              variant="outline"
              disabled={q.isFetchingNextPage}
              onClick={() => q.fetchNextPage()}
            >
              Laporan pesan lainnya
            </Button>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !review.isPending) setSelected(null);
        }}
        title="Tinjau laporan pesan"
        description="Keputusan dicatat dalam audit. Penangguhan hanya tersedia bagi administrator."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            review.mutate(
              Object.fromEntries(new FormData(event.currentTarget)),
            );
          }}
        >
          <fieldset className="space-y-4" disabled={review.isPending}>
            <label className="block text-sm">
              Keputusan
              <select name="action" className="field mt-2">
                <option value="dismiss">Tutup tanpa tindakan</option>
                <option value="warn">Beri peringatan</option>
                {me?.can_review_verifications && (
                  <option value="suspend">Tangguhkan akun</option>
                )}
              </select>
            </label>
            <label className="block text-sm">
              Alasan tinjauan
              <textarea
                name="note"
                className="field mt-2 min-h-24"
                minLength={10}
                maxLength={1000}
                required
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <Button disabled={review.isPending} type="submit">
              Simpan tinjauan pesan
            </Button>
          </fieldset>
        </form>
      </ConfirmDialog>
    </section>
  );
}
