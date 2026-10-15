import { FlatList, Pressable, Text } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession, useTheme } from "../../../lib/providers";
import { communitySchema } from "../../../lib/contracts";
import { Heading, Screen, Status } from "../../../components/ui";
export default function Communities() {
  const { api } = useSession();
  const { colors } = useTheme();
  const q = useInfiniteQuery({
    queryKey: ["communities"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const r = await api<{ data: unknown[]; next_cursor: string | null }>(
        `communities${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      );
      return { ...r, data: r.data.map((c) => communitySchema.parse(c)) };
    },
    getNextPageParam: (p) => p.next_cursor,
  });
  return (
    <Screen>
      <Heading
        title="Temukan lingkaranmu."
        description="Komunitas mahasiswa, fakultas dan program studi."
      />
      <FlatList
        data={q.data?.pages.flatMap((p) => p.data) ?? []}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item: c }) => (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(`/communities/${c.id}`)}
            style={{
              padding: 24,
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{ fontSize: 17, fontWeight: "600", color: colors.text }}
            >
              {c.name}
            </Text>
            <Text
              numberOfLines={3}
              style={{ fontSize: 13, lineHeight: 22, color: colors.muted }}
            >
              {c.description}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {c.members_count} anggota ·{" "}
              {c.visibility === "private" ? "Privat" : "Terbuka"}
              {c.organization_verified ? " · Organisasi terverifikasi" : ""}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Status
            loading={q.isPending}
            error={q.error?.message}
            empty={q.data ? "Belum ada komunitas di kampusmu." : undefined}
            onRetry={() => void q.refetch()}
          />
        }
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
      />
    </Screen>
  );
}
