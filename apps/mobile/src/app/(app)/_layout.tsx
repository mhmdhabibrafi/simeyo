import { Stack } from "expo-router";
import { useTheme } from "../../lib/providers";
export default function Layout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="compose-thread"
        options={{ presentation: "modal", title: "Cerita kampus" }}
      />
      <Stack.Screen name="thread/[id]" options={{ title: "Percakapan" }} />
      <Stack.Screen name="u/[username]" options={{ title: "Profil" }} />
      <Stack.Screen name="messages/index" options={{ title: "Pesan" }} />
      <Stack.Screen
        name="messages/[id]"
        options={{ title: "Percakapan pribadi" }}
      />
      <Stack.Screen name="settings" options={{ title: "Pengaturan" }} />
      <Stack.Screen name="change-password" options={{ title: "Ubah kata sandi" }} />
      <Stack.Screen name="edit-profile" options={{ title: "Ubah profil" }} />
      <Stack.Screen
        name="post-actions/[id]"
        options={{ presentation: "modal", title: "Opsi cerita" }}
      />
      <Stack.Screen
        name="image"
        options={{ presentation: "fullScreenModal", title: "Gambar cerita" }}
      />
    </Stack>
  );
}
