import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Image } from "expo-image";
import { useMediaSource } from "../../components/media";
export default function Media() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const source = useMediaSource();
  return (
    <View style={{ flex: 1, backgroundColor: "#111113" }}>
      <Image
        source={source(url ?? "")}
        accessibilityLabel="Gambar cerita"
        cachePolicy="none"
        contentFit="contain"
        style={{ flex: 1 }}
      />
    </View>
  );
}
