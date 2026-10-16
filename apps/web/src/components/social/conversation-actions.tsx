"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Search, Flag, Ban, UserRound } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { messagesSchema } from "../../../../../packages/api-contracts/src/communications";
import { useMe } from "@/lib/auth";
import { api } from "@/lib/api";
import { clearBlockedContent } from "@/lib/social";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/providers";

type Person = { id: number; name: string; username: string };
export function ConversationActions({
  id,
  user,
  messages,
}: {
  id: number;
  user: Person;
  messages: { id: number; sender_id: number; body: string }[];
}) {
  const [dialog, setDialog] = useState<"search" | "block" | "report" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const client = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const incoming = messages
    .filter((message) => message.sender_id !== me?.id)
    .reverse();
  async function block() {
    setBusy(true);
    setError("");
    try {
      await api(`relationships/${user.id}/block`, { method: "PUT" });
      await clearBlockedContent(client);
      router.replace("/messages");
      toast("Akun diblokir.");
      setDialog(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Akun belum dapat diblokir.");
    } finally {
      setBusy(false);
    }
  }
  async function report(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(`conversations/${id}/report`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      setDialog(null);
      toast("Laporan diterima.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laporan belum dapat dikirim.");
    } finally {
      setBusy(false);
    }
  }
  function open(value: typeof dialog) {
    setError("");
    setDialog(value);
  }
  return (
    <>
      <button
        type="button"
        className="icon-button shrink-0"
        aria-label="Cari pesan dalam percakapan"
        onClick={() => open("search")}
      >
        <Search size={19} />
      </button>
      <Menu.Root>
        <Menu.Trigger asChild>
          <button
            type="button"
            className="icon-button shrink-0"
            aria-label="Opsi percakapan"
          >
            <MoreHorizontal size={20} />
          </button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            sideOffset={5}
            align="end"
            className="z-40 min-w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg"
          >
            <Menu.Item asChild>
              <Link
                className="menu-choice"
                href={`/u/${encodeURIComponent(user.username)}`}
              >
                <UserRound
                  size={16}
                  className="mr-2 inline"
                  aria-hidden="true"
                />
                Lihat profil
              </Link>
            </Menu.Item>
            <Menu.Item className="menu-choice" onSelect={() => open("report")}>
              <Flag size={16} className="mr-2 inline" aria-hidden="true" />
              Laporkan percakapan
            </Menu.Item>
            <Menu.Item
              className="menu-choice text-red-600"
              onSelect={() => open("block")}
            >
              <Ban size={16} className="mr-2 inline" aria-hidden="true" />
              Blokir akun
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <MessageSearch
        id={id}
        open={dialog === "search"}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "block" || dialog === "report"}
        onOpenChange={(value) => {
          if (!value && !busy) setDialog(null);
        }}
        title={
          dialog === "block" ? `Blokir ${user.name}?` : "Laporkan percakapan"
        }
        description={
          dialog === "block"
            ? "Kalian tidak bisa saling melihat profil atau mengirim pesan. Hubungan mengikuti juga dihapus. Blokir dapat dibatalkan melalui Pengaturan."
            : "Pilih pesan yang ingin dilaporkan. Hanya pesan tersebut yang dilampirkan untuk moderator kampus."
        }
      >
        {dialog === "block" ? (
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDialog(null)}
            >
              Batal
            </Button>
            <Button variant="danger" disabled={busy} onClick={block}>
              {busy ? "Memproses..." : "Blokir akun"}
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={report}>
            <fieldset disabled={busy} className="space-y-4">
              {incoming.length > 0 && (
                <label className="block text-sm">
                  Pesan yang dilaporkan
                  <select
                    name="message_id"
                    defaultValue={incoming[0].id}
                    className="field mt-2"
                  >
                    {incoming.map((message) => (
                      <option key={message.id} value={message.id}>
                        {message.body.slice(0, 80)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-sm">
                Alasan laporan
                <select name="reason" className="field mt-2">
                  <option value="spam">Spam</option>
                  <option value="harassment">Pelecehan</option>
                  <option value="hate">Ujaran kebencian</option>
                  <option value="other">Lainnya</option>
                </select>
              </label>
              <label className="block text-sm">
                Keterangan (opsional)
                <textarea
                  name="details"
                  maxLength={1000}
                  className="field mt-2 min-h-24"
                />
              </label>
              <Button type="submit" disabled={busy}>
                {busy ? "Mengirim..." : "Kirim laporan"}
              </Button>
            </fieldset>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}

function MessageSearch({
  id,
  open,
  onClose,
}: {
  id: number;
  open: boolean;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const { data: me } = useMe();
  const q = useInfiniteQuery({
    queryKey: ["message-search", id, search],
    enabled: open && !!search,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      messagesSchema.parse(
        await api(
          `conversations/${id}/messages?${new URLSearchParams({ q: search, ...(pageParam ? { cursor: pageParam } : {}) })}`,
        ),
      ),
    getNextPageParam: (page) => page.next_cursor,
  });
  const results = Array.from(
    new Map(
      q.data?.pages
        .flatMap((page) => page.data)
        .map((message) => [message.id, message]) ?? [],
    ).values(),
  );
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title="Cari pesan"
      description="Cari isi pesan dalam percakapan ini. Pencarian tidak mengubah status dibaca."
    >
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(term.trim());
        }}
      >
        <label htmlFor="conversation-search" className="sr-only">
          Cari dalam percakapan
        </label>
        <input
          id="conversation-search"
          type="search"
          className="field min-w-0 flex-1"
          maxLength={80}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Kata kunci pesan"
        />
        <Button type="submit" disabled={!term.trim()}>
          Cari
        </Button>
      </form>
      <div
        className="mt-5 max-h-[50dvh] space-y-3 overflow-y-auto"
        aria-label="Hasil pencarian pesan"
      >
        {!search ? (
          <p className="text-sm text-[var(--muted)]">
            Ketik kata kunci untuk menemukan pesan.
          </p>
        ) : q.isError ? (
          <p role="alert" className="text-sm">
            Pesan belum dapat dicari.{" "}
            <button className="underline" onClick={() => q.refetch()}>
              Coba lagi
            </button>
          </p>
        ) : q.isPending ? (
          <p role="status">Mencari pesan...</p>
        ) : (
          <>
            {!results.length && (
              <p className="py-6 text-center text-sm text-[var(--muted)]">
                Tidak ada pesan yang cocok.
              </p>
            )}
            {results.map((message) => (
              <article
                key={message.id}
                className="rounded-xl bg-[var(--soft)] p-4"
              >
                <p className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]">
                  <span>
                    {message.sender_id === me?.id
                      ? "Kamu"
                      : q.data?.pages[0].user.name}
                  </span>
                  <time dateTime={message.created_at}>
                    {new Date(message.created_at).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {message.body}
                </p>
              </article>
            ))}
            {q.hasNextPage && (
              <Button
                variant="outline"
                disabled={q.isFetchingNextPage}
                onClick={() => q.fetchNextPage()}
              >
                Hasil berikutnya
              </Button>
            )}
          </>
        )}
      </div>
    </ConfirmDialog>
  );
}
