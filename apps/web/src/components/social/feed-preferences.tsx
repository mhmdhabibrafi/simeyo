"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feedPreferencesSchema } from "../../../../../packages/api-contracts/src/social";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";
export function FeedPreferences() {
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const q = useQuery({
    queryKey: ["feed-preferences"],
    queryFn: async () =>
      feedPreferencesSchema.parse(await api("feed/preferences")),
  });
  const reset = useMutation({
    mutationFn: () => api("feed/preferences", { method: "DELETE" }),
    onSuccess: () => {
      setConfirm(false);
      client.invalidateQueries({ queryKey: ["feed-preferences"] });
      client.invalidateQueries({ queryKey: ["feed"] });
      client.removeQueries({ queryKey: ["feed-latest"] });
    },
  });
  return (
    <section className="px-5 py-5 sm:px-6">
      <h2 className="text-sm font-medium">Preferensi beranda</h2>
      <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
        Cerita yang disembunyikan tidak muncul di beranda. Kurangi konten
        menurunkan prioritas akun tersebut di Untukmu, tanpa berhenti mengikuti.
      </p>
      {q.isError ? (
        <Button variant="ghost" onClick={() => q.refetch()}>
          Coba muat preferensi lagi
        </Button>
      ) : (
        q.data && (
          <>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {q.data.data.hidden_count} cerita disembunyikan,{" "}
              {q.data.data.reduced_authors_count} akun dikurangi
            </p>
            <Button
              variant="outline"
              className="mt-3"
              disabled={!q.data.data.hidden_count}
              onClick={() => setConfirm(true)}
            >
              Atur ulang preferensi
            </Button>
          </>
        )
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={(v) => {
          if (!reset.isPending) setConfirm(v);
        }}
        title="Atur ulang preferensi beranda?"
        description="Cerita yang masih tersedia dapat muncul lagi. Prioritas akun kembali mengikuti urutan biasa."
      >
        {reset.isError && (
          <p role="alert" className="mb-3 text-sm">
            Preferensi belum diatur ulang. Coba lagi.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={reset.isPending}
            onClick={() => setConfirm(false)}
          >
            Batal
          </Button>
          <Button disabled={reset.isPending} onClick={() => reset.mutate()}>
            Atur ulang
          </Button>
        </div>
      </ConfirmDialog>
    </section>
  );
}
