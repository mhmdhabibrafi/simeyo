import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useSession, useTheme } from "../lib/providers";
export function useMediaSource() {
  const { origin, token } = useSession();
  return (path: string) => {
    const url = new URL(path, origin);
    if (
      url.origin !== origin ||
      !["/media/profiles/", "/api/v1/media/posts/"].some((prefix) =>
        url.pathname.startsWith(prefix),
      )
    )
      return undefined;
    if (!token) return undefined;
    return { uri: url.href, headers: { Authorization: `Bearer ${token}` } };
  };
}
export function Avatar({
  name,
  url,
  size = 42,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const { colors } = useTheme();
  const source = useMediaSource();
  const media = url ? source(url) : undefined;
  return media ? (
    <Image
      source={media}
      cachePolicy="none"
      accessibilityIgnoresInvertColors
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: colors.accent, fontWeight: "700", fontSize: size / 3 }}
      >
        {name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")}
      </Text>
    </View>
  );
}
export function PostImage({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const source = useMediaSource();
  const { colors } = useTheme();
  const media = source(url);
  return media ? (
    <Image
      source={media}
      cachePolicy="none"
      accessibilityLabel="Gambar cerita"
      contentFit="cover"
      style={{
        width: "100%",
        aspectRatio: Math.min(1.6, Math.max(0.75, width / height)),
        borderRadius: 16,
        backgroundColor: colors.surface,
      }}
    />
  ) : null;
}
