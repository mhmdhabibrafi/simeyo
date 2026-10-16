"use client";
import Link from "next/link";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Search, BadgeCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import {
  userSchema,
  type User,
} from "../../../../../packages/api-contracts/src";
import {
  relationshipSchema,
  type Relationship,
} from "../../../../../packages/api-contracts/src/social";
import { Avatar } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers";
export function useRelationship(id: number, enabled = true) {
  return useQuery({
    queryKey: ["relationship", id],
    queryFn: async () => {
      const r = await api<{ data: unknown }>(`relationships/${id}`);
      return relationshipSchema.parse(r.data);
    },
    enabled,
  });
}
export function FollowButton({ user }: { user: User }) {
  const { data: me } = useMe();
  const client = useQueryClient();
  const toast = useToast();
  const q = useRelationship(user.id, me?.id !== user.id);
  const m = useMutation({
    mutationKey: ["follow", user.id],
    scope: { id: `follow-${user.id}` },
    mutationFn: async ({ remove }: { remove: boolean }) => {
      const r = await api<{ data: unknown }>(
        `relationships/${user.id}/follow`,
        { method: remove ? "DELETE" : "PUT" },
      );
      return relationshipSchema.parse(r.data);
    },
    onMutate: async () => {
      await client.cancelQueries({ queryKey: ["relationship", user.id] });
      const old = q.data;
      if (old)
        client.setQueryData<Relationship>(["relationship", user.id], {
          ...old,
          follow_state: old.follow_state
            ? null
            : user.private_account
              ? "pending"
              : "accepted",
          followers_count: Math.max(
            0,
            old.followers_count +
              (old.follow_state === "accepted"
                ? -1
                : old.follow_state
                  ? 0
                  : user.private_account
                    ? 0
                    : 1),
          ),
        });
      return old;
    },
    onError: (_e, _v, old) => {
      if (old) client.setQueryData(["relationship", user.id], old);
      toast("Perubahan mengikuti dikembalikan. Coba lagi.");
    },
    onSuccess: (data) => {
      client.setQueryData(["relationship", user.id], data);
      client.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  if (me?.id === user.id) return null;
  return (
    <Button
      variant={q.data?.follow_state ? "outline" : "default"}
      className="min-h-10 px-4 text-xs"
      disabled={m.isPending || q.isPending || q.isError}
      onClick={() => m.mutate({ remove: !!q.data?.follow_state })}
    >
      {q.data?.follow_state === "accepted"
        ? "Mengikuti"
        : q.data?.follow_state === "pending"
          ? "Diminta"
          : "Ikuti"}
    </Button>
  );
}
export function People({
  relation,
  userId,
  initialSearch = "",
  onSearch,
  submittedSearch,
  hideSearch = false,
}: {
  relation?: "following" | "followers";
  userId?: number;
  initialSearch?: string;
  onSearch?: (value: string) => void;
  submittedSearch?: string;
  hideSearch?: boolean;
}) {
  const client = useQueryClient();
  const [localSearch, setSearch] = useState(initialSearch);
  const search = submittedSearch ?? localSearch;
  const query = useInfiniteQuery({
    queryKey: ["people", search, relation, userId],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (relation) params.set("relation", relation);
      if (userId) params.set("user_id", String(userId));
      if (pageParam) params.set("cursor", pageParam);
      const r = await api<{
        data: unknown[];
        meta: { next_cursor: string | null; has_more: boolean };
      }>(`people?${params}`);
      return {
        ...r,
        data: r.data.map((u) => {
          const raw = u as { relationship?: unknown };
          const user = userSchema.parse(u);
          if (raw.relationship)
            client.setQueryData(
              ["relationship", user.id],
              relationshipSchema.parse(raw.relationship),
            );
          return user;
        }),
      };
    },
    getNextPageParam: (p) => p.meta.next_cursor ?? undefined,
  });
  return (
    <div>
      {!hideSearch && (
        <form
          className="mx-6 my-6 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = String(
              new FormData(e.currentTarget).get("search") ?? "",
            ).trim();
            setSearch(value);
            onSearch?.(value);
          }}
        >
          <Search size={19} className="ml-2 shrink-0 text-[var(--muted)]" />
          <label className="sr-only" htmlFor="people-search">
            {relation ? "Cari dalam daftar akun" : "Cari teman kampus"}
          </label>
          <input
            id="people-search"
            name="search"
            defaultValue={initialSearch}
            type="search"
            maxLength={80}
            placeholder="Nama atau username"
            className="min-w-0 flex-1 bg-transparent p-2 text-sm outline-none"
          />
          <Button variant="ghost" className="px-3">
            Cari
          </Button>
        </form>
      )}
      {query.isPending ? (
        <div className="skeleton m-6 h-40" />
      ) : query.isError ? (
        <div className="p-6">
          <p role="alert" className="mb-4 text-sm text-[var(--muted)]">
            {query.error.message}
          </p>
          <Button onClick={() => query.refetch()}>Coba lagi</Button>
        </div>
      ) : (
        <>
          {!relation && !search && (
            <p className="px-6 pb-5 text-xs text-[var(--muted)]">
              Akun kampus terverifikasi yang belum kamu ikuti, diurutkan dari
              yang terbaru.
            </p>
          )}
          {query.data?.pages
            .flatMap((p) => p.data)
            .map((u) => (
              <article
                key={u.id}
                className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-5"
              >
                <Link href={`/u/${u.username}`}>
                  <Avatar name={u.name} url={u.avatar_url} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${u.username}`}
                    className="text-sm font-semibold"
                  >
                    {u.name}
                    {u.verified && (
                      <BadgeCheck
                        size={14}
                        className="ml-1 inline text-[var(--accent)]"
                      />
                    )}
                  </Link>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]">
                    @{u.username}
                    {u.department && ` · ${u.department}`}
                  </p>
                  {u.bio && (
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-[var(--muted)]">
                      {u.bio}
                    </p>
                  )}
                </div>
                <FollowButton user={u} />
              </article>
            ))}
          {query.data?.pages[0].data.length === 0 && (
            <div className="p-10 text-center text-sm text-[var(--muted)]">
              Belum ada akun yang cocok.
            </div>
          )}
          {query.hasNextPage && (
            <div className="p-6 text-center">
              <Button
                variant="ghost"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                Lihat akun berikutnya
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
