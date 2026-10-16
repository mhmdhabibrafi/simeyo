"use client";
import {
  type InfiniteData,
  type QueryClient,
  useMutation,
  useQueryClient,
  useIsMutating,
} from "@tanstack/react-query";
import { api } from "./api";
import {
  postSchema,
  type Post,
  type FeedPage,
} from "../../../../packages/api-contracts/src/social";
import { useToast } from "@/components/providers";
export async function clearBlockedContent(client: QueryClient) {
  const keys = new Set(["messages", "message-search", "conversations", "notifications", "message-recipients", "profile", "people", "feed", "feed-latest", "post", "pulse", "post-search", "topic-search"]);
  const predicate = (query: { queryKey: readonly unknown[] }) => keys.has(String(query.queryKey[0]));
  await client.cancelQueries({ predicate });
  client.removeQueries({ predicate });
  client.invalidateQueries({ queryKey: ["relationship"] });
}
export function updatePost(
  client: QueryClient,
  id: number,
  update: (p: Post) => Post,
) {
  client.setQueriesData<InfiniteData<FeedPage>>(
    { predicate: (q) => ["feed", "post-search"].includes(String(q.queryKey[0])) },
    (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((p) => (p.id === id ? update(p) : p)),
            })),
          }
        : old,
  );
  client.setQueryData<Post>(["post", id], (old) => (old ? update(old) : old));
  client.setQueriesData<{data:{posts:Post[]}}>({queryKey:["pulse"]}, old => old ? {...old,data:{...old.data,posts:old.data.posts.map(p=>p.id===id?update(p):p)}} : old);
}
export function useInteraction(post: Post) {
  const client = useQueryClient();
  const toast = useToast();
  const pending = useIsMutating({ mutationKey: ["interaction", post.id] }) > 0;
  const mutation = useMutation({
    mutationKey: ["interaction", post.id],
    scope: { id: `post-${post.id}` },
    mutationFn: async ({
      kind,
      active,
    }: {
      kind: "like" | "repost" | "bookmark";
      active: boolean;
    }) => {
      const r = await api<{ data: unknown }>(
        `posts/${post.id}/interactions/${kind}`,
        { method: active ? "DELETE" : "PUT" },
      );
      return postSchema.parse(r.data);
    },
    onMutate: async ({ kind, active }) => {
      await client.cancelQueries({ predicate: (q) => ["feed", "post-search", "pulse"].includes(String(q.queryKey[0])) });
      await client.cancelQueries({ queryKey: ["post", post.id] });
      const flag =
        kind === "like"
          ? "liked"
          : kind === "repost"
            ? "reposted"
            : "bookmarked";
      const count =
        kind === "like"
          ? "likes_count"
          : kind === "repost"
            ? "reposts_count"
            : null;
      updatePost(client, post.id, (p) => ({
        ...p,
        [flag]: !active,
        ...(count
          ? { [count]: Math.max(0, p[count] + (active ? -1 : 1)) }
          : {}),
      }));
      return { flag, count, active, oldCount: count ? post[count] : 0 };
    },
    onError: (_error, _kind, context) => {
      if (context)
        updatePost(client, post.id, (p) => ({
          ...p,
          [context.flag]: context.active,
          ...(context.count ? { [context.count]: context.oldCount } : {}),
        }));
      toast("Interaksi belum tersimpan. Perubahan dikembalikan.");
    },
    onSuccess: (server) => updatePost(client, post.id, () => server),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["feed"] });
      client.invalidateQueries({ queryKey: ["post-search"] });
      client.invalidateQueries({ queryKey: ["pulse"] });
    },
  });
  return {
    ...mutation,
    pending,
    mutate: (kind: "like" | "repost" | "bookmark") =>
      mutation.mutate({
        kind,
        active:
          kind === "like"
            ? post.liked
            : kind === "repost"
              ? post.reposted
              : post.bookmarked,
      }),
  };
}
