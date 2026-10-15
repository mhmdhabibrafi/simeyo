"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SquarePen, Send, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { userSchema } from "../../../../../packages/api-contracts/src";
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
export function Conversations({ selectedId }: { selectedId?: number }) {
  const { data: me } = useMe();
  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState(false);
  const [composing, setComposing] = useState(false);
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
  const conversations = q.data?.pages.flatMap((p) => p.data).filter((c) =>
    (!unread || c.unread_count > 0) &&
    `${c.user.name} ${c.user.username}`.toLocaleLowerCase("id").includes(search.trim().toLocaleLowerCase("id")),
  ) ?? [];
  return (
    <div className="message-workspace">
      <h1 className="sr-only">Pesan pribadi</h1>
      <section aria-label="Daftar percakapan" className={`message-list min-w-0 ${selectedId ? "hidden lg:block" : ""}`}>
        <header className="px-5 pb-4 pt-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Pesan</h2>
            <button className="icon-button" aria-label="Buat pesan baru" onClick={() => setComposing(true)}><SquarePen size={21} /></button>
          </div>
          <label className="flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2.5">
            <Search size={17} className="shrink-0 text-[var(--muted)]" />
            <span className="sr-only">Cari percakapan</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari percakapan" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <div className="mt-4 flex gap-2" aria-label="Filter pesan">
            {[{ label: "Kotak masuk", value: false }, { label: "Belum dibaca", value: true }].map((filter) => (
              <button key={filter.label} aria-pressed={unread === filter.value} onClick={() => setUnread(filter.value)} className={`min-h-9 rounded-full border border-[var(--border)] px-4 text-xs font-medium transition-colors ${unread === filter.value ? "bg-[var(--soft)]" : "text-[var(--muted)] hover:bg-[var(--soft)]"}`}>{filter.label}</button>
            ))}
          </div>
        </header>
      <div>
        {conversations
          .map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              aria-current={selectedId === c.id ? "page" : undefined}
              className={`flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--soft)] ${selectedId === c.id ? "bg-[var(--soft)]" : ""}`}
            >
              <Avatar name={c.user.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${c.unread_count ? "font-semibold" : "font-medium"}`}>{c.user.name}</p>
                  {c.last_message && <time dateTime={c.last_message.created_at} className="shrink-0 text-[10px] text-[var(--muted)]">{new Date(c.last_message.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</time>}
                </div>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">
                  {c.last_message ? `${c.last_message.sender_id === me?.id ? "Kamu: " : ""}${c.last_message.body}` : `@${c.user.username}`}
                </p>
              </div>
              {c.unread_count > 0 && (
                <span aria-label={`${c.unread_count} belum dibaca`} className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-semibold text-[var(--accent-foreground)]">
                  {c.unread_count > 99 ? "99+" : c.unread_count}
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
        {q.data && !conversations.length && (
          <p className="py-5 text-center text-sm leading-6 text-[var(--muted)]">
            {search ? "Tidak ada percakapan yang cocok." : unread ? "Semua pesan sudah dibaca." : "Belum ada percakapan."}
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
      </section>
      <section aria-label="Percakapan" className={`message-detail min-w-0 ${selectedId ? "" : "hidden lg:flex"}`}>
        {selectedId ? <MessageThread key={selectedId} id={selectedId} /> : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--muted)]"><Send size={32} strokeWidth={1.4} /></div>
            <h2 className="text-lg font-semibold">Percakapan dimulai dari sini</h2>
            <p className="mb-6 mt-2 max-w-xs text-sm leading-6 text-[var(--muted)]">Sapa teman kampus dan lanjutkan cerita lewat pesan pribadi.</p>
            <Button onClick={() => setComposing(true)}>Pesan baru</Button>
          </div>
        )}
      </section>
      <NewMessage open={composing} onOpenChange={setComposing} />
    </div>
  );
}
function NewMessage({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const { data: me } = useMe();
  const router = useRouter();
  const client = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["message-recipients", search], enabled: open,
    queryFn: async () => {
      const r = await api<{ data: unknown[] }>(`people?q=${encodeURIComponent(search)}`);
      return r.data.map((person) => userSchema.parse(person)).filter((person) => person.id !== me?.id);
    },
  });
  const start = useMutation({
    mutationFn: (userId: number) => api<{ data: { id: number } }>("conversations", { method: "POST", body: JSON.stringify({ user_id: userId }) }),
    onSuccess: (r) => { client.invalidateQueries({ queryKey: ["conversations"] }); onOpenChange(false); router.push(`/messages/${r.data.id}`); },
    onError: (e) => toast(e.message),
  });
  return <ConfirmDialog open={open} onOpenChange={(value) => { if (!start.isPending) onOpenChange(value); }} title="Pesan baru" description="Pilih teman kampus untuk memulai percakapan.">
    <form className="mb-3 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-2" onSubmit={(e) => { e.preventDefault(); setSearch(term.trim()); }}>
      <Search size={18} className="ml-2 shrink-0 text-[var(--muted)]" />
      <input aria-label="Cari penerima pesan" type="search" value={term} onChange={(e) => setTerm(e.target.value)} maxLength={80} placeholder="Nama atau username" className="min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
      <Button type="submit" variant="ghost" className="px-3">Cari</Button>
    </form>
    {q.isPending && <p role="status" className="py-6 text-sm text-[var(--muted)]">Mencari teman…</p>}
    {q.isError && <p role="alert" className="py-6 text-sm">Daftar teman belum tersedia. <button className="underline" onClick={() => q.refetch()}>Coba lagi</button></p>}
    <div className="max-h-80 space-y-1 overflow-y-auto">
      {q.data?.map((person) => <button key={person.id} disabled={start.isPending} onClick={() => start.mutate(person.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-[var(--soft)] disabled:opacity-50">
        <Avatar name={person.name} url={person.avatar_url} />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{person.name}</span><span className="block truncate text-xs text-[var(--muted)]">@{person.username}</span></span>
        <Send size={17} className="text-[var(--muted)]" />
      </button>)}
    </div>
    {q.data?.length === 0 && <p className="py-8 text-center text-sm text-[var(--muted)]">Tidak ada teman yang cocok.</p>}
  </ConfirmDialog>;
}
export function MessageThread({ id }: { id: number }) {
  const log = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const previousLastId = useRef<number | null>(null);
  const [newMessages, setNewMessages] = useState(false);
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
      atBottom.current = true;
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
  const lastId = messages.at(-1)?.id ?? null;
  useEffect(() => {
    if (lastId === null || lastId === previousLastId.current) return;
    const element = log.current;
    if (element && (previousLastId.current === null || atBottom.current)) {
      element.scrollTop = element.scrollHeight;
      setNewMessages(false);
    } else {
      setNewMessages(true);
    }
    previousLastId.current = lastId;
  }, [lastId]);
  if (q.isError) {
    return <div className="p-6">
      <Link href="/messages" className="text-sm text-[var(--muted)]">← Semua pesan</Link>
      <p role="alert" className="my-5 text-sm">Percakapan tidak tersedia atau kamu tidak memiliki akses.</p>
      <Button variant="outline" onClick={() => q.refetch()}>Coba lagi</Button>
    </div>;
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <Link href="/messages" aria-label="Semua pesan" className="icon-button lg:hidden">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-base font-semibold">
          {q.data?.pages[0].user.name ?? "Percakapan"}
        </h2>
      </header>
      <div ref={log} onScroll={() => {
        const element = log.current;
        if (element) {
          atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
          if (atBottom.current) setNewMessages(false);
        }
      }} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5" role="log" aria-label="Riwayat pesan" aria-relevant="additions">
        {q.isPending && <p role="status">Memuat pesan…</p>}
        {q.data && messages.length === 0 && <p className="py-10 text-center text-sm leading-6 text-[var(--muted)]">Belum ada pesan. Mulai percakapan dengan sapaan pertama.</p>}
        {q.hasNextPage && (
          <Button
            variant="outline"
            onClick={async () => {
              const element = log.current;
              const previousHeight = element?.scrollHeight ?? 0;
              const previousTop = element?.scrollTop ?? 0;
              await q.fetchNextPage();
              requestAnimationFrame(() => {
                if (element) element.scrollTop = previousTop + element.scrollHeight - previousHeight;
              });
            }}
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
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.sender_id === me?.id ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--soft)]"}`}
            >
              <p className="whitespace-pre-wrap break-words text-sm">
                {m.body}
              </p>
              <time className="mt-2 block text-[10px] opacity-70">
                {new Date(m.created_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        ))}
        {q.data && messages.length > 0 && (
          <button
            className="text-sm text-[var(--muted)]"
            disabled={read.isPending}
            onClick={() => read.mutate()}
          >
            Tandai dibaca
          </button>
        )}
      </div>
      {newMessages && <button className="mx-auto my-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs" onClick={() => {
        if (log.current) log.current.scrollTop = log.current.scrollHeight;
        atBottom.current = true;
        setNewMessages(false);
      }}>Pesan baru ↓</button>}
      {q.data?.pages[0].can_send ? (
        <form
          className="shrink-0 space-y-3 border-t border-[var(--border)] p-4"
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
            className="min-h-16 w-full resize-none rounded-2xl bg-[var(--soft)] px-4 py-3 text-sm outline-none"
            rows={2}
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
    </div>
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
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Aktivitas</h1>
        <Link
          className="icon-button"
          aria-label="Preferensi notifikasi"
          href="/settings/communications"
        >
          <SlidersHorizontal size={19} />
        </Link>
      </header>
      {q.data?.pages
        .flatMap((p) => p.data)
        .map((n) => (
          <div
            key={n.id}
            className={`flex gap-3 border-b border-[var(--border)] px-5 py-5 sm:px-6 ${!n.read_at ? "bg-[var(--soft)]/50" : ""}`}
          >
            <Avatar name={n.actor.name} />
            <div className="min-w-0 flex-1">
              <Link
                href={
                  n.conversation_id
                    ? `/messages/${n.conversation_id}`
                    : n.post_id
                      ? `/thread/${n.post_id}`
                      : n.kind === "verification"
                        ? "/settings#account-campus"
                        : `/u/${n.actor.username}`
                }
                onClick={() => { if (!n.read_at) read.mutate(n.id); }}
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
              <time dateTime={n.created_at} className="mt-2 block text-xs text-[var(--muted)]">
                {new Date(n.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </time>
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
            {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--foreground)]"><span className="sr-only">Belum dibaca</span></span>}
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
