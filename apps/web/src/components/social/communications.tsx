"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/app-shell";
import { useToast } from "@/components/providers";
import {
  conversationsSchema,
  messagesSchema,
  notificationsSchema,
  communicationPreferencesSchema,
} from "../../../../../packages/api-contracts/src/communications";
export function MessageButton({ userId }: { userId: number }) {
  const router = useRouter();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () =>
      api<{ data: { id: number } }>("conversations", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      }),
    onSuccess: (r) => router.push(`/messages/${r.data.id}`),
    onError: (e) => toast(e.message),
  });
  return (
    <Button variant="outline" disabled={m.isPending} onClick={() => m.mutate()}>
      Pesan
    </Button>
  );
}
export function Conversations() {
  const q = useInfiniteQuery({
    queryKey: ["conversations"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      conversationsSchema.parse(
        await api(
          `conversations${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        ),
      ),
    getNextPageParam: (p) => p.next_cursor,
    refetchInterval: 20000,
  });
  return (
    <>
      <header className="border-b border-[var(--border)] px-6 py-5">
        <h1 className="text-lg font-semibold">Pesan</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Percakapan pribadi dalam kampusmu.
        </p>
      </header>
      <div className="divide-y divide-[var(--border)]">
        {q.data?.pages
          .flatMap((p) => p.data)
          .map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 px-6 py-5 hover:bg-[var(--surface)]"
            >
              <Avatar name={c.user.name} />
              <div>
                <p className="font-semibold">{c.user.name}</p>
                <p className="text-sm text-[var(--muted)]">
                  @{c.user.username}
                </p>
              </div>
              {c.unread_count > 0 && (
                <span className="ml-auto text-sm">
                  {c.unread_count} belum dibaca
                </span>
              )}
            </Link>
          ))}
      </div>
      <div className="p-6">
        {q.isPending && <p role="status">Memuat percakapan…</p>}
        {q.isError && (
          <p role="alert">
            Pesan belum dapat dimuat.{" "}
            <button onClick={() => q.refetch()}>Coba lagi</button>
          </p>
        )}
        {q.data && !q.data.pages[0].data.length && (
          <p className="text-sm text-[var(--muted)]">
            Belum ada percakapan. Mulai melalui tombol Pesan pada profil teman.
          </p>
        )}
        {q.hasNextPage && (
          <Button
            variant="outline"
            onClick={() => q.fetchNextPage()}
            disabled={q.isFetchingNextPage}
          >
            Percakapan lainnya
          </Button>
        )}
      </div>
    </>
  );
}
export function MessageThread({ id }: { id: number }) {
  const { data: me } = useMe();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const toast = useToast();
  const q = useInfiniteQuery({
    queryKey: ["messages", id],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      messagesSchema.parse(
        await api(
          `conversations/${id}/messages${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        ),
      ),
    getNextPageParam: (p) => p.next_cursor,
    refetchInterval: 15000,
  });
  const m = useMutation({
    mutationFn: ({ body, client_id }: { body: string; client_id: string }) =>
      api(`conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, client_id }),
      }),
    onSuccess: () => {
      setBody("");
      setDraftId(null);
      client.invalidateQueries({ queryKey: ["messages", id] });
      client.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e) => toast(e.message),
  });
  const read = useMutation({
    mutationFn: () => api(`conversations/${id}/read`, { method: "PUT" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"] });
      toast("Percakapan ditandai dibaca.");
    },
  });
  const messages =
    q.data?.pages.flatMap((p) => p.data).sort((a, b) => a.id - b.id) ?? [];
  return (
    <>
      <header className="border-b border-[var(--border)] px-6 py-5">
        <Link href="/messages" className="text-sm text-[var(--muted)]">
          ← Semua pesan
        </Link>
        <h1 className="mt-3 text-lg font-semibold">
          {q.data?.pages[0].user.name ?? "Percakapan"}
        </h1>
      </header>
      <div className="space-y-4 p-6">
        {q.isError && (
          <p role="alert">
            Percakapan tidak tersedia atau kamu tidak memiliki akses.
          </p>
        )}
        {q.isPending && <p role="status">Memuat pesan…</p>}
        {q.hasNextPage && (
          <Button
            variant="outline"
            onClick={() => q.fetchNextPage()}
            disabled={q.isFetchingNextPage}
          >
            Pesan sebelumnya
          </Button>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            data-message-id={m.id}
            className={`flex ${m.sender_id === me?.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.sender_id === me?.id ? "bg-[var(--accent)]/10" : "bg-[var(--surface)]"}`}
            >
              <p className="whitespace-pre-wrap break-words text-sm">
                {m.body}
              </p>
              <time className="mt-2 block text-[10px] text-[var(--foreground)]">
                {new Date(m.created_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        ))}
        {q.data && (
          <button
            className="text-sm text-[var(--muted)]"
            disabled={read.isPending}
            onClick={() => read.mutate()}
          >
            Tandai dibaca
          </button>
        )}
      </div>
      {q.data?.pages[0].can_send ? (
        <form
          className="space-y-3 border-t border-[var(--border)] p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const client_id = draftId ?? crypto.randomUUID();
            setDraftId(client_id);
            m.mutate({ body, client_id });
          }}
        >
          <label htmlFor="message-body" className="sr-only">
            Tulis pesan
          </label>
          <textarea
            id="message-body"
            className="input min-h-24 w-full resize-none"
            value={body}
            disabled={m.isPending}
            maxLength={2000}
            placeholder="Tulis pesan…"
            onChange={(e) => {
              setBody(e.target.value);
              setDraftId(null);
            }}
          />
          <Button disabled={m.isPending || !body.trim()} type="submit">
            {m.isPending ? "Mengirim…" : "Kirim pesan"}
          </Button>
        </form>
      ) : (
        q.data && (
          <p className="p-6 text-sm text-[var(--muted)]">
            Penerima membatasi pesan saat ini.
          </p>
        )
      )}
    </>
  );
}
const labels: Record<string, string> = {
  likes: "menyukai ceritamu",
  replies: "membalas ceritamu",
  reposts: "membagikan ceritamu",
  follows: "mulai mengikuti atau meminta mengikuti",
  mentions: "menyebutmu",
  messages: "mengirim pesan",
  verification: "memperbarui status afiliasimu",
  moderation: "menyampaikan keputusan moderasi",
};
export function Notifications() {
  const client = useQueryClient();
  const toast = useToast();
  const q = useInfiniteQuery({
    queryKey: ["notifications"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      notificationsSchema.parse(
        await api(
          `notifications${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        ),
      ),
    getNextPageParam: (p) => p.next_cursor,
    refetchInterval: 20000,
  });
  const read = useMutation({
    mutationFn: (id: string) =>
      api(`notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e) => toast(e.message),
  });
  return (
    <>
      <header className="border-b border-[var(--border)] px-6 py-5">
        <h1 className="text-lg font-semibold">Aktivitas</h1>
        <Link
          className="mt-2 block text-sm text-[var(--muted)]"
          href="/settings/communications"
        >
          Preferensi notifikasi
        </Link>
      </header>
      {q.data?.pages
        .flatMap((p) => p.data)
        .map((n) => (
          <div
            key={n.id}
            className="flex gap-3 border-b border-[var(--border)] px-6 py-5"
          >
            <Avatar name={n.actor.name} />
            <div className="min-w-0 flex-1">
              <Link
                href={
                  n.conversation_id
                    ? `/messages/${n.conversation_id}`
                    : n.post_id
                      ? `/thread/${n.post_id}`
                      : `/u/${n.actor.username}`
                }
                className="text-sm"
              >
                <strong>{n.actor.name}</strong>{" "}
                {labels[n.kind] ?? "memperbarui aktivitas kampus"}.
              </Link>
              {n.message && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                  {n.message}
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--muted)]">
                {new Date(n.created_at).toLocaleString("id-ID")}
              </p>
              {!n.read_at && (
                <button
                  className="mt-3 text-xs"
                  disabled={read.isPending}
                  onClick={() => read.mutate(n.id)}
                >
                  Tandai dibaca
                </button>
              )}
            </div>
          </div>
        ))}
      <div className="p-6">
        {q.isError && (
          <p role="alert">
            Aktivitas belum dapat dimuat.{" "}
            <button onClick={() => q.refetch()}>Coba lagi</button>
          </p>
        )}
        {q.isPending && <p role="status">Memuat aktivitas…</p>}
        {q.data && !q.data.pages[0].data.length && (
          <p className="text-sm text-[var(--muted)]">Belum ada aktivitas.</p>
        )}
        {q.hasNextPage && (
          <Button
            onClick={() => q.fetchNextPage()}
            disabled={q.isFetchingNextPage}
          >
            Aktivitas lainnya
          </Button>
        )}
      </div>
    </>
  );
}
export function CommunicationSettings() {
  const toast = useToast();
  const q = useQuery({
    queryKey: ["communication-preferences"],
    queryFn: async () =>
      communicationPreferencesSchema.parse(
        (await api<{ data: unknown }>("communication-preferences")).data,
      ),
  });
  const m = useMutation({
    mutationFn: (d: unknown) =>
      api("communication-preferences", {
        method: "PATCH",
        body: JSON.stringify(d),
      }),
    onSuccess: () => {
      q.refetch();
      toast("Preferensi komunikasi disimpan.");
    },
    onError: (e) => toast(e.message),
  });
  const preferences: Record<string, string> = {
    likes: "Suka",
    replies: "Balasan",
    mentions: "Mention",
    reposts: "Repost dan kutipan",
    follows: "Pengikut",
    messages: "Pesan",
    community: "Komunitas",
    events: "Acara",
  };
  return (
    <>
      <header className="border-b border-[var(--border)] px-6 py-5">
        <h1 className="text-lg font-semibold">Komunikasi</h1>
      </header>
      <div className="space-y-6 p-6">
        {q.isError && <p role="alert">Preferensi belum dapat dimuat.</p>}
        {q.data && (
          <>
            <label className="block text-sm">
              Siapa yang boleh mengirim pesan?
              <select
                className="input mt-3 w-full"
                value={q.data.dm_policy}
                disabled={m.isPending}
                onChange={(e) => m.mutate({ dm_policy: e.target.value })}
              >
                <option value="campus">Anggota kampus</option>
                <option value="followers">Akun yang saya ikuti</option>
                <option value="nobody">Tidak ada</option>
              </select>
            </label>
            <p className="text-xs text-[var(--muted)]">
              Akun privat tetap membatasi pesan ke akun yang kamu ikuti. Blokir
              selalu menghentikan akses percakapan.
            </p>
            <h2 className="font-semibold">Notifikasi aktivitas</h2>
            {Object.entries(preferences).map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-11 items-center justify-between text-sm"
              >
                {label}
                <input
                  type="checkbox"
                  checked={q.data!.notification_preferences?.[key] ?? true}
                  disabled={m.isPending}
                  onChange={(e) =>
                    m.mutate({
                      notification_preferences: {
                        ...q.data!.notification_preferences,
                        [key]: e.target.checked,
                      },
                    })
                  }
                />
              </label>
            ))}
          </>
        )}
      </div>
    </>
  );
}
