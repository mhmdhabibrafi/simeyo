"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { feedSchema } from "../../../../../packages/api-contracts/src/social";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
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
  const sentinel = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: ["feed", feed, userId, parentId, communityId],
    initialPageParam: null as string | null,
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
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = query;
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasNextPage || isFetchNextPageError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage)
          fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);
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
  return (
    <div>
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
              : "Masih ada ruang untuk cerita pertama."}
          </h2>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
            {feed === "following"
              ? "Ikuti teman kampus untuk menemukan cerita mereka."
              : feed === "bookmarks"
                ? "Simpan cerita yang ingin kamu baca lagi."
                : "Mulai dengan satu pertanyaan atau sudut pandang."}
          </p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
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
