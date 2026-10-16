"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BackButton } from "@/components/ui/back-button";
import { api } from "@/lib/api";
import { postSchema } from "../../../../../packages/api-contracts/src/social";
import { PostCard } from "./post-card";
import { Composer } from "./composer";
import { Feed } from "./feed";
import { Button } from "@/components/ui/button";
export function Thread({ id }: { id: number }) {
  const q = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const r = await api<{ data: unknown }>(`posts/${id}`);
      return postSchema.parse(r.data);
    },
  });
  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)]/95 px-5 py-4 backdrop-blur">
        <BackButton />
        <h1 className="text-lg font-semibold">Percakapan</h1>
      </header>
      {q.isPending ? (
        <div className="skeleton m-6 h-52" />
      ) : q.isError ? (
        <div className="p-8">
          <p role="alert" className="mb-5 text-sm">
            Cerita tidak ditemukan atau tidak dapat kamu akses.
          </p>
          <Button variant="outline" onClick={() => q.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : (
        <>
          {q.data.parent_id && (
            <Link
              href={`/thread/${q.data.parent_id}`}
              className="block border-b border-[var(--border)] px-6 py-4 text-xs text-[var(--accent)]"
            >
              ← Lihat percakapan sebelumnya
            </Link>
          )}
          <PostCard post={q.data} detail />
          <div className="border-b border-[var(--border)]">
            <Composer compact parentId={id} />
          </div>
          <div className="px-6 pb-1 pt-6 text-xs font-semibold text-[var(--muted)]">
            Sudut pandang lain
          </div>
          <Feed parentId={id} />
        </>
      )}
    </>
  );
}
