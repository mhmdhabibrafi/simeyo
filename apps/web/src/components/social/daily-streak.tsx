"use client";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { api } from "@/lib/api";
import { streakSchema } from "../../../../../packages/api-contracts/src";

export function DailyStreak({ userId }: { userId: number }) {
  const q = useQuery({
    queryKey: ["daily-streak", userId],
    queryFn: async () =>
      streakSchema.parse((await api<{ data: unknown }>("me/streak")).data),
    refetchInterval: 60000,
  });
  if (q.isPending)
    return (
      <div
        className="skeleton my-3 h-5 w-36 rounded"
        aria-label="Memuat runtutan"
      />
    );
  if (q.isError)
    return (
      <button
        type="button"
        disabled={q.isFetching}
        aria-busy={q.isFetching}
        className="min-h-11 text-xs text-[var(--muted)] underline"
        onClick={() => q.refetch()}
      >
        Coba muat runtutan lagi
      </button>
    );
  const s = q.data;
  return (
    <section aria-label="Runtutan harian" className="text-xs">
      <details>
        <summary className="flex min-h-11 max-w-full cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 rounded-lg text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
          <Flame size={15} className="shrink-0" aria-hidden="true" />
          <span className="font-medium text-[var(--foreground)]">
            {s.current_days
              ? `${s.current_days} hari berturut-turut`
              : "Mulai runtutan"}
          </span>
          {s.longest_days > 0 && <span>Terbaik {s.longest_days} hari</span>}
        </summary>
        <div className="max-w-sm pb-2 leading-5 text-[var(--muted)]">
          <p>
            {s.completed_today
              ? "Hari ini sudah terisi. Sampai besok!"
              : "Bagikan cerita atau balasan hari ini untuk melanjutkan."}
          </p>
          <p>Berganti hari pukul 00.00 WIB.</p>
        </div>
      </details>
    </section>
  );
}
