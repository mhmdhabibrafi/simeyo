import React, { memo } from "react";
import { FlatList, Linking, Pressable, Share, Text, View } from "react-native";
import { router } from "expo-router";
import {
  useInfiniteQuery,
  useIsMutating,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useSession, useTheme } from "../lib/providers";
import {
  feedSchema,
  postSchema,
  type FeedPage,
  type Post,
} from "../lib/contracts";
import { Avatar, PostImage } from "./media";
import { Button, Status } from "./ui";
export function PostBody({ body }: { body: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 15, lineHeight: 26, color: colors.text }}>
      {body
        .split(/(https?:\/\/[^\s]+|@[a-zA-Z0-9_]{3,24}|#[\p{L}\p{N}_]{2,40})/gu)
        .map((p, i) =>
          p.startsWith("http") ? (
            <Text
              key={i}
              style={{ color: colors.accent }}
              onPress={() => void Linking.openURL(p)}
            >
              {p}
            </Text>
          ) : p.startsWith("@") ? (
            <Text
              key={i}
              style={{ color: colors.accent }}
              onPress={() => router.push(`/u/${p.slice(1)}`)}
            >
              {p}
            </Text>
          ) : p.startsWith("#") ? (
            <Text
              key={i}
              style={{ color: colors.accent }}
              onPress={() =>
                router.push({ pathname: "/explore", params: { q: p } })
              }
            >
              {p}
            </Text>
          ) : (
            p
          ),
        )}
    </Text>
  );
}
export const PostCard = memo(function PostCard({ post }: { post: Post }) {
  const { api } = useSession();
  const { colors } = useTheme();
  const client = useQueryClient();
  const pending = useIsMutating({ mutationKey: ["interaction", post.id] }) > 0;
  const update = (transform: (p: Post) => Post) => {
    client.setQueriesData<InfiniteData<FeedPage>>(
      { queryKey: ["feed"] },
      (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((p) => ({
                ...p,
                data: p.data.map((row) =>
                  row.id === post.id ? transform(row) : row,
                ),
              })),
            }
          : old,
    );
    client.setQueryData<Post>(["post", post.id], (old) =>
      old ? transform(old) : old,
    );
    client.setQueriesData<{ data: { posts: Post[] } }>(
      { queryKey: ["pulse"] },
      (old) =>
        old
          ? {
              ...old,
              data: {
                ...old.data,
                posts: old.data.posts.map((p) =>
                  p.id === post.id ? transform(p) : p,
                ),
              },
            }
          : old,
    );
  };
  const m = useMutation({
    mutationKey: ["interaction", post.id],
    scope: { id: `post-${post.id}` },
    mutationFn: async ({
      kind,
      active,
    }: {
      kind: "like" | "repost" | "bookmark";
      active: boolean;
    }) =>
      postSchema.parse(
        (
          await api<{ data: unknown }>(
            `posts/${post.id}/interactions/${kind}`,
            { method: active ? "PUT" : "DELETE" },
          )
        ).data,
      ),
    onMutate: async ({ kind, active }) => {
      await client.cancelQueries({ queryKey: ["feed"] });
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
      const previous = {
        flag,
        count,
        active: post[flag],
        countValue: count ? post[count] : 0,
      };
      update((p) => ({
        ...p,
        [flag]: active,
        ...(count
          ? { [count]: Math.max(0, p[count] + (active ? 1 : -1)) }
          : {}),
      }));
      return previous;
    },
    onError: (_e, _v, old) => {
      if (old)
        update((p) => ({
          ...p,
          [old.flag]: old.active,
          ...(old.count ? { [old.count]: old.countValue } : {}),
        }));
    },
    onSuccess: (server) => update(() => server),
  });
  const action = (
    label: string,
    text: string,
    onPress: () => void,
    active = false,
  ) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled: pending }}
      disabled={pending}
      onPress={onPress}
      style={{
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
      }}
    >
      <Text
        style={{ color: active ? colors.accent : colors.muted, fontSize: 14 }}
      >
        {text}
      </Text>
    </Pressable>
  );
  return (
    <View
      testID={`post-${post.id}`}
      style={{
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Profil ${post.author.name}`}
          onPress={() => router.push(`/u/${post.author.username}`)}
        >
          <Avatar name={post.author.name} url={post.author.avatar_url} />
        </Pressable>
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            onPress={() => router.push(`/u/${post.author.username}`)}
            style={{ fontWeight: "600", fontSize: 14, color: colors.text }}
          >
            {post.author.name}
            {post.author.verified ? " ✓" : ""}
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>
            @{post.author.username}
            {post.author.department ? ` · ${post.author.department}` : ""}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Opsi cerita"
          onPress={() => router.push(`/post-actions/${post.id}`)}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 24 }}>···</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Buka percakapan"
        onPress={() => router.push(`/thread/${post.id}`)}
      >
        <PostBody body={post.body} />
      </Pressable>
      {post.media.map((image) => (
        <Pressable
          key={image.id}
          onPress={() =>
            router.push({
              pathname: "/image",
              params: {
                url: image.url,
                width: image.width,
                height: image.height,
              },
            })
          }
        >
          <PostImage {...image} />
        </Pressable>
      ))}
      {post.quote && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/thread/${post.quote!.id}`)}
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text }}>
            {post.quote.author.name}
          </Text>
          <PostBody body={post.quote.body} />
        </Pressable>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {action(
          "Sukai cerita",
          `${post.liked ? "♥" : "♡"} ${post.likes_count || ""}`,
          () => m.mutate({ kind: "like", active: !post.liked }),
          post.liked,
        )}
        {action("Balas cerita", `↳ ${post.replies_count || ""}`, () =>
          router.push({
            pathname: "/compose-thread",
            params: { parentId: post.id },
          }),
        )}
        {action(
          "Bagikan ulang cerita",
          `↻ ${post.reposts_count || ""}`,
          () => m.mutate({ kind: "repost", active: !post.reposted }),
          post.reposted,
        )}
        {action("Kutip cerita", "❞", () =>
          router.push({
            pathname: "/compose-thread",
            params: { quoteId: post.id },
          }),
        )}
        {action(
          "Simpan cerita",
          post.bookmarked ? "▣" : "▢",
          () => m.mutate({ kind: "bookmark", active: !post.bookmarked }),
          post.bookmarked,
        )}
        {action(
          "Bagikan tautan",
          "↗",
          () =>
            void Share.share({
              message: `${process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000"}/thread/${post.id}`,
            }),
        )}
      </View>
      {m.error && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.danger, fontSize: 12 }}
        >
          Perubahan dikembalikan. {m.error.message}
        </Text>
      )}
    </View>
  );
});
export function Feed({
  feed = "campus",
  userId,
  parentId,
  communityId,
  header,
  search,
}: {
  feed?: string;
  userId?: number;
  parentId?: number;
  communityId?: number;
  header?: React.ReactElement;
  search?: string;
}) {
  const { api } = useSession();
  const { colors } = useTheme();
  const q = useInfiniteQuery({
    queryKey: ["feed", feed, userId, parentId, communityId, search],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const p = new URLSearchParams({ feed });
      if (userId) p.set("user_id", String(userId));
      if (parentId) p.set("parent_id", String(parentId));
      if (communityId) p.set("community_id", String(communityId));
      if (pageParam) p.set("cursor", pageParam);
      if (search) p.set("q", search);
      return feedSchema.parse(
        await api(search ? `search/posts?${p}` : `feed?${p}`),
      );
    },
    getNextPageParam: (p) => p.meta.next_cursor,
  });
  const posts = q.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={posts}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Status
          loading={q.isPending}
          error={q.error?.message}
          empty={
            !q.isPending && !q.isError
              ? "Belum ada cerita di sini. Mulai percakapan pertama."
              : undefined
          }
          onRetry={() => void q.refetch()}
        />
      }
      ListFooterComponent={
        q.hasNextPage ? (
          <View style={{ padding: 20 }}>
            <Button
              outline
              label={
                q.isFetchingNextPage ? "Memuat…" : "Lihat cerita berikutnya"
              }
              disabled={q.isFetchingNextPage}
              onPress={() => void q.fetchNextPage()}
            />
          </View>
        ) : (
          <View style={{ height: 32 }} />
        )
      }
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
      }}
      onEndReachedThreshold={0.7}
      refreshing={q.isRefetching && !q.isFetchingNextPage}
      onRefresh={() => void q.refetch()}
      initialNumToRender={8}
      maxToRenderPerBatch={6}
      windowSize={7}
      keyboardShouldPersistTaps="handled"
    />
  );
}
