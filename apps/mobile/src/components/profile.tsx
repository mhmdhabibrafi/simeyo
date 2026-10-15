import { useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, useTheme } from "../lib/providers";
import { userSchema, relationshipSchema } from "../lib/contracts";
import { Avatar } from "./media";
import { Feed } from "./feed";
import { Button, Heading, Screen, Status } from "./ui";
export function Profile({ username }: { username?: string }) {
  const { api, user: me } = useSession();
  const { colors } = useTheme();
  const client = useQueryClient();
  const [tab, setTab] = useState("profile");
  const [error, setError] = useState("");
  const q = useQuery({
    queryKey: ["profile", username],
    enabled: !!username,
    queryFn: async () =>
      userSchema.parse(
        (
          await api<{ data: unknown }>(
            `profiles/${encodeURIComponent(username!)}`,
          )
        ).data,
      ),
  });
  const u = username ? q.data : me;
  const own = u?.id === me?.id;
  const relation = useQuery({
    queryKey: ["relationship", u?.id],
    enabled: !!u?.verified,
    queryFn: async () =>
      relationshipSchema.parse(
        (await api<{ data: unknown }>(`relationships/${u!.id}`)).data,
      ),
  });
  const m = useMutation({
    mutationFn: ({ path, method }: { path: string; method: string }) =>
      api(path, { method }),
    onSuccess: () => {
      void relation.refetch();
      void client.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e) => setError(e.message),
  });
  if (!u)
    return (
      <Screen>
        <Status
          loading={q.isPending}
          error={q.error?.message}
          onRetry={() => void q.refetch()}
        />
      </Screen>
    );
  const locked =
    u.private_account && !own && relation.data?.follow_state !== "accepted";
  const header = (
    <>
      <Heading
        title={own ? "Profilmu" : u.name}
        action={
          own ? (
            <Button
              outline
              label="Pengaturan"
              onPress={() => router.push("/settings")}
            />
          ) : undefined
        }
      />
      <View style={{ padding: 24, gap: 14 }}>
        <Avatar name={u.name} url={u.avatar_url} size={76} />
        <Text
          style={{
            fontSize: 24,
            letterSpacing: -0.7,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          {u.name}
          {u.verified ? " ✓" : ""}
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>@{u.username}</Text>
        {!!u.department && (
          <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 20 }}>
            {[u.department, u.faculty, u.cohort].filter(Boolean).join(" · ")}
          </Text>
        )}
        {!!u.bio && (
          <Text style={{ fontSize: 14, lineHeight: 24, color: colors.text }}>
            {u.bio}
          </Text>
        )}
        {!!u.location && (
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {u.location}
          </Text>
        )}
        {u.links.map((url) => (
          <Text
            key={url}
            style={{ fontSize: 13, color: colors.accent }}
            onPress={() => void Linking.openURL(url)}
          >
            {url}
          </Text>
        ))}
        <View style={{ flexDirection: "row", gap: 24 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/people",
                params: { relation: "followers", userId: u.id },
              })
            }
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ fontSize: 13, color: colors.muted }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>
                {relation.data?.followers_count ?? "—"}
              </Text>{" "}
              pengikut
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/people",
                params: { relation: "following", userId: u.id },
              })
            }
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ fontSize: 13, color: colors.muted }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>
                {relation.data?.following_count ?? "—"}
              </Text>{" "}
              mengikuti
            </Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {own ? (
            <>
              <Button
                outline
                label="Ubah profil"
                onPress={() => router.push("/edit-profile")}
              />
              <Button
                outline
                label="Tersimpan"
                onPress={() => router.push("/bookmarks")}
              />
            </>
          ) : (
            <>
              <Button
                disabled={m.isPending || !relation.data}
                label={
                  relation.data?.follow_state === "pending"
                    ? "Batalkan permintaan"
                    : relation.data?.follow_state
                      ? "Mengikuti"
                      : "Ikuti"
                }
                onPress={() =>
                  m.mutate({
                    path: `relationships/${u.id}/follow`,
                    method: relation.data?.follow_state ? "DELETE" : "PUT",
                  })
                }
              />
              <Button
                outline
                label="Pesan"
                disabled={m.isPending}
                onPress={async () => {
                  try {
                    const r = await api<{ data: { id: number } }>(
                      "conversations",
                      {
                        method: "POST",
                        body: JSON.stringify({ user_id: u.id }),
                      },
                    );
                    router.push(`/messages/${r.data.id}`);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Pesan belum tersedia.",
                    );
                  }
                }}
              />
              <Button
                outline
                label={relation.data?.muted ? "Bunyikan" : "Senyapkan"}
                disabled={m.isPending}
                onPress={() =>
                  m.mutate({
                    path: `relationships/${u.id}/mute`,
                    method: relation.data?.muted ? "DELETE" : "PUT",
                  })
                }
              />
              <Button
                outline
                label="Blokir"
                onPress={() =>
                  Alert.alert(
                    "Blokir akun?",
                    "Kalian tidak dapat mengakses cerita atau percakapan satu sama lain.",
                    [
                      { text: "Batal", style: "cancel" },
                      {
                        text: "Blokir",
                        style: "destructive",
                        onPress: () => {
                          void api(`relationships/${u.id}/block`, {
                            method: "PUT",
                          })
                            .then(() => {
                              client.removeQueries({ queryKey: ["profile"] });
                              void client.invalidateQueries({
                                queryKey: ["feed"],
                              });
                              router.replace("/explore");
                            })
                            .catch((e) => setError(e.message));
                        },
                      },
                    ],
                  )
                }
              />
            </>
          )}
        </View>
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ fontSize: 13, color: colors.danger }}
          >
            {error}
          </Text>
        )}
      </View>
      {!locked && (
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {[
            ["profile", "Cerita"],
            ["replies", "Balasan"],
            ["media", "Media"],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === value }}
              onPress={() => setTab(value)}
              style={{
                flex: 1,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
                borderBottomWidth: tab === value ? 2 : 0,
                borderBottomColor: colors.accent,
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "500", color: colors.text }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
  return (
    <Screen>
      {locked ? (
        <>
          {header}
          <Status empty="Akun privat. Cerita tersedia setelah permintaan mengikutimu disetujui." />
        </>
      ) : (
        <Feed feed={tab} userId={u.id} header={header} />
      )}
    </Screen>
  );
}
