"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { unreadMessagesSchema } from "../../../../../packages/api-contracts/src/communications";
import { useMe } from "@/lib/auth";
export function UnreadMessages() {
  const me = useMe();
  const q = useQuery({
    queryKey: ["message-unread"],
    enabled: !!me.data?.verified,
    queryFn: async () =>
      unreadMessagesSchema.parse(await api("conversations/unread")),
    refetchInterval: 20000,
  });
  const count = q.isError ? 0 : (q.data?.data.unread_count ?? 0);
  if (!count) return null;
  return (
    <span
      className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--foreground)] px-1 text-[10px] font-semibold text-[var(--surface)]"
      aria-label={`${count} pesan belum dibaca`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
