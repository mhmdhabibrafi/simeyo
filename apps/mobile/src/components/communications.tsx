import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useSession, useTheme } from "../lib/providers";
import {
  conversationsSchema,
  messagesSchema,
  notificationsSchema,
} from "../lib/contracts";
import { Avatar } from "./media";
import { Screen, Heading, Button, Status } from "./ui";
export function Conversations() {
  const { api } = useSession();
  const { colors } = useTheme();
  const q = useInfiniteQuery({
    queryKey: ["conversations"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      conversationsSchema.parse(
        await api(
          `conversations${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        ),
      ),
    getNextPageParam: (p) => p.next_cursor,
    refetchInterval: 20000,
  });
  return (
    <Screen>
      <Heading title="Pesan" description="Percakapan pribadi dalam kampusmu." />
      <FlatList
        data={q.data?.pages.flatMap((p) => p.data) ?? []}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item: c }) => (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(`/messages/${c.id}`)}
            style={{
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Avatar name={c.user.name} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{ fontWeight: "600", fontSize: 15, color: colors.text }}
              >
                {c.user.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                @{c.user.username}
              </Text>
            </View>
            {c.unread_count > 0 && (
              <Text style={{ fontSize: 12, color: colors.accent }}>
                {c.unread_count} baru
              </Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <Status
            loading={q.isPending}
            error={q.error?.message}
            empty={
              q.data
                ? "Belum ada percakapan. Mulai melalui profil teman."
                : undefined
            }
            onRetry={() => void q.refetch()}
          />
        }
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => void q.refetch()}
      />
    </Screen>
  );
}
export function MessageThread({ id }: { id: number }) {
  const { api, user } = useSession();
  const { colors } = useTheme();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [draftId, setDraftId] = useState(() => Crypto.randomUUID());
  const q = useInfiniteQuery({
    queryKey: ["messages", id],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      messagesSchema.parse(
        await api(
          `conversations/${id}/messages${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        ),
      ),
    getNextPageParam: (p) => p.next_cursor,
    refetchInterval: 15000,
  });
  const m = useMutation({
    mutationFn: ({ body, client_id }: { body: string; client_id: string }) =>
      api(`conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, client_id }),
      }),
    onSuccess: () => {
      setBody("");
      setDraftId(Crypto.randomUUID());
      void client.invalidateQueries({ queryKey: ["messages", id] });
      void client.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
  const read = useMutation({
    mutationFn: () => api(`conversations/${id}/read`, { method: "PUT" }),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["conversations"] }),
  });
  const messages =
    q.data?.pages
      .flatMap((p) => p.data)
      .filter(
        (m, index, rows) => rows.findIndex((row) => row.id === m.id) === index,
      )
      .sort((a, b) => b.id - a.id) ?? [];
  if (q.isError)
    return (
      <Screen>
        <Status error={q.error.message} onRetry={() => void q.refetch()} />
      </Screen>
    );
  return (
    <Screen>
      <Heading
        title={q.data?.pages[0].user.name ?? "Percakapan"}
        action={
          q.data ? (
            <Button
              outline
              label="Tandai dibaca"
              disabled={read.isPending}
              onPress={() => read.mutate()}
            />
          ) : undefined
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          renderItem={({ item: m }) => (
            <View
              style={{
                alignItems:
                  m.sender_id === user?.id ? "flex-end" : "flex-start",
              }}
            >
              <View
                style={{
                  maxWidth: "85%",
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor:
                    m.sender_id === user?.id
                      ? colors.accentSoft
                      : colors.surface,
                  gap: 6,
                }}
              >
                <Text
                  style={{ fontSize: 14, lineHeight: 23, color: colors.text }}
                >
                  {m.body}
                </Text>
                <Text style={{ fontSize: 10, color: colors.text }}>
                  {new Date(m.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          )}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Status
              loading={q.isPending}
              empty={q.data ? "Mulai percakapan dengan sapaan." : undefined}
            />
          }
          ListFooterComponent={
            q.hasNextPage ? (
              <Button
                outline
                label="Pesan sebelumnya"
                disabled={q.isFetchingNextPage}
                onPress={() => void q.fetchNextPage()}
              />
            ) : null
          }
        />
        {q.data?.pages[0].can_send ? (
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              gap: 10,
            }}
          >
            <TextInput
              accessibilityLabel="Tulis pesan"
              placeholder="Tulis pesan…"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
              value={body}
              editable={!m.isPending}
              onChangeText={(value) => {
                setBody(value);
                setDraftId(Crypto.randomUUID());
              }}
              style={{
                color: colors.text,
                minHeight: 48,
                maxHeight: 140,
                fontSize: 15,
                lineHeight: 24,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
              }}
            />
            {m.error && (
              <Text
                accessibilityRole="alert"
                style={{ fontSize: 12, color: colors.danger }}
              >
                {m.error.message}
              </Text>
            )}
            <Button
              label={m.isPending ? "Mengirim…" : "Kirim pesan"}
              disabled={m.isPending || !body.trim()}
              onPress={() => m.mutate({ body, client_id: draftId })}
            />
          </View>
        ) : (
          q.data && <Status empty="Penerima membatasi pesan saat ini." />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
const labels: Record<string, string> = {
  likes: "menyukai ceritamu",
  replies: "membalas ceritamu",
  reposts: "membagikan ceritamu",
  follows: "mulai mengikuti atau meminta mengikuti",
  mentions: "menyebutmu",
  messages: "mengirim pesan",
  moderation: "menyampaikan keputusan moderasi",
  verification: "memperbarui afiliasimu",
};
export function Notifications() {
  const { api } = useSession();
  const { colors } = useTheme();
  const client = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ["notifications"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      notificationsSchema.parse(
        await api(
          `notifications${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        ),
      ),
    getNextPageParam: (p) => p.next_cursor,
    refetchInterval: 20000,
  });
  const read = useMutation({
    mutationFn: (id: string) =>
      api(`notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return (
    <Screen>
      <Heading
        title="Aktivitas"
        action={
          <Button
            outline
            label="Pesan"
            onPress={() => router.push("/messages")}
          />
        }
      />
      <FlatList
        data={q.data?.pages.flatMap((p) => p.data) ?? []}
        keyExtractor={(n) => n.id}
        renderItem={({ item: n }) => (
          <View
            style={{
              padding: 20,
              gap: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                if (n.conversation_id)
                  router.push(`/messages/${n.conversation_id}`);
                else if (n.post_id) router.push(`/thread/${n.post_id}`);
                else if (n.kind === "follows") router.push("/requests");
              }}
              style={{ flexDirection: "row", gap: 12 }}
            >
              <Avatar name={n.actor.name} />
              <View style={{ flex: 1, gap: 7 }}>
                <Text
                  style={{ color: colors.text, fontSize: 14, lineHeight: 23 }}
                >
                  <Text style={{ fontWeight: "600" }}>{n.actor.name}</Text>{" "}
                  {labels[n.kind] ?? "memperbarui aktivitas"}.
                </Text>
                {!!n.message && (
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 21,
                      color: colors.muted,
                    }}
                  >
                    {n.message}
                  </Text>
                )}
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  {new Date(n.created_at).toLocaleString("id-ID")}
                </Text>
              </View>
            </Pressable>
            {!n.read_at && (
              <Button
                outline
                label="Tandai dibaca"
                disabled={read.isPending}
                onPress={() => read.mutate(n.id)}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <Status
            loading={q.isPending}
            error={q.error?.message}
            empty={q.data ? "Belum ada aktivitas." : undefined}
            onRetry={() => void q.refetch()}
          />
        }
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => void q.refetch()}
      />
    </Screen>
  );
}
