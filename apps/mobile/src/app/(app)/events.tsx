import { FlatList, Text, View } from "react-native";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useSession, useTheme } from "../../lib/providers";
import { eventSchema } from "../../lib/contracts";
import { Button, Heading, Screen, Status } from "../../components/ui";
export default function Events() {
  const { api } = useSession();
  const { colors } = useTheme();
  const q = useInfiniteQuery({
    queryKey: ["events"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const r = await api<{ data: unknown[]; next_cursor: string | null }>(
        `events${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      );
      return { ...r, data: r.data.map((e) => eventSchema.parse(e)) };
    },
    getNextPageParam: (p) => p.next_cursor,
  });
  const m = useMutation({
    mutationFn: ({
      id,
      state,
      remove,
    }: {
      id: number;
      state: string;
      remove: boolean;
    }) =>
      api(`events/${id}/rsvp`, {
        method: remove ? "DELETE" : "PUT",
        body: remove ? undefined : JSON.stringify({ state }),
      }),
    onSuccess: () => void q.refetch(),
  });
  return (
    <Screen>
      <Heading
        title="Agenda kampus."
        description="Percakapan yang berlanjut di dunia nyata."
      />
      <FlatList
        data={q.data?.pages.flatMap((p) => p.data) ?? []}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item: e }) => (
          <View
            style={{
              padding: 24,
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {new Date(e.starts_at).toLocaleString("id-ID")}
            </Text>
            <Text
              style={{ fontSize: 19, fontWeight: "600", color: colors.text }}
            >
              {e.title}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {e.location} · {e.going_count} akan hadir
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 24, color: colors.text }}>
              {e.description}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Button
                outline
                label={e.rsvp === "going" ? "Batalkan hadir" : "Saya hadir"}
                disabled={m.isPending}
                onPress={() =>
                  m.mutate({
                    id: e.id,
                    state: "going",
                    remove: e.rsvp === "going",
                  })
                }
              />
              <Button
                outline
                label={
                  e.rsvp === "interested" ? "Batalkan tertarik" : "Tertarik"
                }
                disabled={m.isPending}
                onPress={() =>
                  m.mutate({
                    id: e.id,
                    state: "interested",
                    remove: e.rsvp === "interested",
                  })
                }
              />
            </View>
          </View>
        )}
        ListHeaderComponent={
          m.error ? <Status error={m.error.message} /> : null
        }
        ListEmptyComponent={
          <Status
            loading={q.isPending}
            error={q.error?.message}
            empty={q.data ? "Belum ada acara mendatang." : undefined}
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
