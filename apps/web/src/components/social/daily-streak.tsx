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
        className="skeleton mt-4 h-24 rounded-2xl"
        aria-label="Memuat runtutan"
      />
    );
  if (q.isError)
    return (
      <button
        type="button"
        disabled={q.isFetching}
        aria-busy={q.isFetching}
        className="mt-4 min-h-11 text-sm text-[var(--muted)] underline"
        onClick={() => q.refetch()}
      >
        Coba muat runtutan lagi
      </button>
    );
  const s = q.data;
  return (
    <section
      aria-label="Runtutan harian"
      className="mt-4 rounded-2xl bg-[var(--soft)] p-4"
    >
      <div className="flex items-start gap-3">
        <Flame size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {s.current_days
              ? `${s.current_days} hari berturut-turut`
              : "Mulai runtutanmu"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {s.completed_today
              ? "Hari ini sudah terisi. Sampai besok!"
              : "Bagikan cerita atau balasan hari ini untuk melanjutkan."}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Terbaik {s.longest_days} hari · Berganti hari pukul 00.00 WIB
          </p>
        </div>
      </div>
    </section>
  );
}
