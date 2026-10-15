import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession, useTheme } from "../lib/providers";
import { userSchema } from "../lib/contracts";
import { Avatar } from "./media";
import { Button, Field, Status } from "./ui";
export function People({
  relation,
  userId,
}: {
  relation?: string;
  userId?: number;
}) {
  const { api } = useSession();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const q = useInfiniteQuery({
    queryKey: ["people", query, relation, userId],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const p = new URLSearchParams();
      if (query) p.set("q", query);
      if (relation) p.set("relation", relation);
      if (userId) p.set("user_id", String(userId));
      if (pageParam) p.set("cursor", pageParam);
      const r = await api<{
        data: unknown[];
        meta: { next_cursor: string | null };
      }>(`people?${p}`);
      return { data: r.data.map((u) => userSchema.parse(u)), meta: r.meta };
    },
    getNextPageParam: (p) => p.meta.next_cursor,
  });
  return (
    <FlatList
      data={q.data?.pages.flatMap((p) => p.data) ?? []}
      keyExtractor={(u) => String(u.id)}
      ListHeaderComponent={
        !relation ? (
          <View style={{ padding: 24, gap: 12 }}>
            <Field
              label="Cari nama atau username"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => setQuery(input.trim())}
            />
            <Button
              outline
              label="Cari pengguna"
              onPress={() => setQuery(input.trim())}
            />
            <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 20 }}>
              Rekomendasi menampilkan akun kampus terverifikasi yang baru
              bergabung dan belum kamu ikuti. Akun disenyapkan dikecualikan.
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item: u }) => (
        <Pressable
          accessibilityLabel={`Profil @${u.username}`}
          accessibilityRole="link"
          onPress={() => router.push(`/u/${u.username}`)}
          style={{
            padding: 20,
            flexDirection: "row",
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Avatar name={u.name} url={u.avatar_url} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "600", color: colors.text }}
            >
              {u.name} ✓
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              @{u.username}
              {u.department ? ` · ${u.department}` : ""}
            </Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <Status
          loading={q.isPending}
          error={q.error?.message}
          empty={q.data ? "Belum ada pengguna yang cocok." : undefined}
          onRetry={() => void q.refetch()}
        />
      }
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
      }}
      onEndReachedThreshold={0.6}
    />
  );
}
