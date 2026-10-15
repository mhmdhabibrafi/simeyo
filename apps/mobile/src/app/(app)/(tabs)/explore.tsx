import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession, useTheme } from "../../../lib/providers";
import { Heading, Screen, Field, Button, Status } from "../../../components/ui";
import { Feed, PostCard } from "../../../components/feed";
import { postSchema } from "../../../lib/contracts";
function Explore({initial}:{initial?:string}) {
  const { api } = useSession();
  const { colors } = useTheme();
  const [term, setTerm] = useState(initial ?? "");
  const [search, setSearch] = useState(initial ?? "");
  const pulse = useQuery({
    queryKey: ["pulse"],
    queryFn: () =>
      api<{
        data: {
          topics: { name: string; posts_count: number }[];
          posts: unknown[];
          explanation: string;
        };
      }>("pulse"),
  });
  const header = (
    <>
      <Heading
        title="Jelajahi kampusmu."
        description="Perspektif baru, lingkaran yang lebih dekat."
      />
      <View style={{ padding: 20, gap: 14 }}>
        <Field
          label="Cari cerita atau hashtag"
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={() => setSearch(term.trim())}
        />
        <Button
          outline
          label="Cari cerita"
          onPress={() => setSearch(term.trim())}
        />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Button
            outline
            label="Temukan teman"
            onPress={() => router.push("/people")}
          />
          <Button
            outline
            label="Komunitas"
            onPress={() => router.push("/communities")}
          />
          <Button
            outline
            label="Acara"
            onPress={() => router.push("/events")}
          />
        </View>
        {search ? (
          <Button
            outline
            label="Kembali ke Pulse"
            onPress={() => {
              setSearch("");
              setTerm("");
            }}
          />
        ) : (
          <>
            {pulse.data?.data.topics.map((t) => (
              <Pressable
                key={t.name}
                accessibilityRole="button"
                onPress={() => {
                  setTerm("#" + t.name);
                  setSearch("#" + t.name);
                }}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={{ fontSize: 15, color: colors.text }}>
                  #{t.name}{" "}
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    · {t.posts_count} cerita
                  </Text>
                </Text>
              </Pressable>
            ))}
            <Text style={{ fontSize: 12, lineHeight: 20, color: colors.muted }}>
              {pulse.data?.data.explanation ??
                "Topik muncul dari percakapan nyata yang dapat kamu akses."}
            </Text>
          </>
        )}
      </View>
    </>
  );
  return (
    <Screen>
      {search ? (
        <Feed search={search} header={header} />
      ) : (
        <Feed
          feed="campus"
          header={
            <>
              {header}
              {pulse.isError && (
                <Status
                  error={pulse.error.message}
                  onRetry={() => void pulse.refetch()}
                />
              )}
              <Text
                style={{
                  padding: 20,
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                Cerita pilihan kampus
              </Text>
              {pulse.data?.data.posts.map((p) => {
                const post = postSchema.parse(p);
                return <PostCard key={post.id} post={post} />;
              })}
              <Heading title="Cerita terbaru" />
            </>
          }
        />
      )}
    </Screen>
  );
}

export default function ExploreRoute(){const {q}=useLocalSearchParams<{q?:string}>();return <Explore key={q??"pulse"} initial={q}/>;}