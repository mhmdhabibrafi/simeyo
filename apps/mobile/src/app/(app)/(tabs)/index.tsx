import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Button } from "../../../components/ui";
import { Feed } from "../../../components/feed";
import { useTheme } from "../../../lib/providers";
export default function Home() {
  const { colors } = useTheme();
  const [feed, setFeed] = useState("for-you");
  return (
    <Screen>
      <Feed
        feed={feed}
        header={
          <>
            <Heading
              title="simeyo."
              action={
                <Button
                  outline
                  label="Pesan"
                  onPress={() => router.push("/messages")}
                />
              }
            />
            <View
              accessibilityRole="tablist"
              style={{
                flexDirection: "row",
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              {[
                ["for-you", "Untukmu"],
                ["following", "Mengikuti"],
                ["campus", "Kampus"],
              ].map(([id, label]) => (
                <Pressable
                  key={id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: feed === id }}
                  onPress={() => setFeed(id)}
                  style={{
                    flex: 1,
                    minHeight: 52,
                    justifyContent: "center",
                    alignItems: "center",
                    borderBottomWidth: feed === id ? 2 : 0,
                    borderBottomColor: colors.accent,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 13,
                      color: feed === id ? colors.text : colors.muted,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {feed === "for-you" && (
              <Text
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 14,
                  fontSize: 11,
                  lineHeight: 18,
                  color: colors.muted,
                }}
              >
                Cerita kampus berdasarkan kebaruan, interaksi dan akun yang kamu
                ikuti.
              </Text>
            )}
          </>
        }
      />
    </Screen>
  );
}
