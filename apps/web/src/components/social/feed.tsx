"use client";
import Link from "next/link";
import { useMe } from "@/lib/auth";
import { useThreadComposer } from "./thread-composer";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { feedSchema } from "../../../../../packages/api-contracts/src/social";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const subscribeConnection = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};
export function Feed({
  feed = "campus",
  userId,
  parentId,
  communityId,
}: {
  feed?: string;
  userId?: number;
  parentId?: number;
  communityId?: number;
}) {
  const { data: me } = useMe();
  const openComposer = useThreadComposer();
  const sentinel = useRef<HTMLDivElement>(null);
  const isHomeFeed =
    !userId &&
    !parentId &&
    !communityId &&
    ["for-you", "following", "campus"].includes(feed);
  const online = useSyncExternalStore(
    subscribeConnection,
    () => navigator.onLine,
    () => true,
  );
  const query = useInfiniteQuery({
    queryKey: ["feed", feed, userId, parentId, communityId],
    gcTime: 30 * 60 * 1000,
    initialPageParam: null as string | null,
    refetchOnWindowFocus: !isHomeFeed,
    refetchOnMount: !isHomeFeed,
    refetchOnReconnect: !isHomeFeed,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ feed });
      if (userId) params.set("user_id", String(userId));
      if (parentId) params.set("parent_id", String(parentId));
      if (communityId) params.set("community_id", String(communityId));
      if (pageParam) params.set("cursor", pageParam);
      return feedSchema.parse(await api(`feed?${params}`));
    },
    getNextPageParam: (last) => last.meta.next_cursor ?? undefined,
  });
  const latest = useQuery({
    queryKey: ["feed-latest", feed],
    enabled: online && !!query.data && isHomeFeed,
    queryFn: async () =>
      feedSchema.parse(await api(`feed?${new URLSearchParams({ feed })}`)),
    staleTime: 60000,
    refetchInterval: 60000,
  });
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = query;
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !online || !hasNextPage || isFetchNextPageError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage)
          fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    online,
  ]);
  if (query.isPending)
    return (
      <div
        aria-busy="true"
        role="region"
        aria-label="Memuat cerita"
        className="space-y-6 p-6"
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-20" />
            </div>
          </div>
        ))}
      </div>
    );
  if (query.isError && !query.data)
    return (
      <div className="p-8 text-center">
        <p role="alert" className="mb-4 text-sm text-[var(--muted)]">
          {query.error.message}
        </p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  const posts = Array.from(
    new Map(
      (query.data?.pages.flatMap((p) => p.data) ?? []).map((post) => [
        post.id,
        post,
      ]),
    ).values(),
  );
  const newestLoaded = Math.max(0, ...posts.map((post) => post.id));
  const hasNew =
    isHomeFeed && latest.data?.data.some((post) => post.id > newestLoaded);
  return (
    <div>
      {!online && (
        <p
          role="status"
          className="border-b border-[var(--border)] bg-[var(--soft)] px-4 py-3 text-center text-xs text-[var(--muted)]"
        >
          Koneksi terputus. Cerita yang sudah dimuat tetap bisa dibaca.
        </p>
      )}
      {hasNew && online && (
        <div className="sticky top-2 z-20 flex justify-center py-2">
          <Button
            disabled={query.isFetching}
            onClick={async () => {
              const result = await query.refetch();
              if (result.isSuccess)
                window.scrollTo({ top: 0, behavior: "instant" });
            }}
          >
            Lihat cerita baru
          </Button>
        </div>
      )}
      {posts.length === 0 ? (
        <div className="px-8 py-14 text-center">
          <MessageCircle
            size={30}
            strokeWidth={1.3}
            className="mx-auto mb-4 text-[var(--muted)]"
          />
          <h2 className="text-sm font-semibold">
            {parentId
              ? "Percakapan masih terbuka."
              : userId
                ? feed === "media"
                  ? "Belum ada foto."
                  : feed === "replies"
                    ? "Belum ada balasan."
                    : "Belum ada cerita."
                : "Masih ada ruang untuk cerita pertama."}
          </h2>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
            {feed === "following"
              ? "Ikuti teman kampus untuk menemukan cerita mereka."
              : userId
                ? feed === "media"
                  ? "Foto yang dibagikan akan tampil di sini."
                  : feed === "replies"
                    ? "Balasan dalam percakapan akan tampil di sini."
                    : "Cerita yang dibagikan akan tampil di sini."
                : feed === "bookmarks"
                  ? "Simpan cerita yang ingin kamu baca lagi."
                  : "Mulai dengan satu pertanyaan atau sudut pandang."}
          </p>
          {feed === "following" ? (
            <Link
              href="/explore"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold"
            >
              Temukan teman
            </Link>
          ) : feed === "bookmarks" ? (
            <Link
              href="/home"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold"
            >
              Jelajahi cerita
            </Link>
          ) : (
            !parentId &&
            (!userId || userId === me?.id) &&
            me?.verified && (
              <Button variant="outline" className="mt-4" onClick={openComposer}>
                Tulis cerita pertama
              </Button>
            )
          )}
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} feedControls={isHomeFeed} />
        ))
      )}
      <div ref={sentinel} className="flex justify-center p-6">
        {query.hasNextPage && (
          <Button
            variant="ghost"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage
              ? "Memuat…"
              : isFetchNextPageError
                ? "Coba muat berikutnya"
                : "Lihat cerita berikutnya"}
          </Button>
        )}
        {query.isError && !isFetchNextPageError && (
          <Button variant="outline" onClick={() => query.refetch()}>
            Muat ulang feed
          </Button>
        )}
      </div>
    </div>
  );
}
