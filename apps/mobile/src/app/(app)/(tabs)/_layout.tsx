import { Linking, Text } from "react-native";
import { useSession, useTheme } from "../../../lib/providers";
import Tabs from "../../../components/tab-layout";
import { Screen, Heading, Button } from "../../../components/ui";
export default function Layout() {
  const { user, refresh, logout } = useSession();
  const { colors } = useTheme();
  return user?.verified && user.email_verified ? (
    <Tabs />
  ) : (
    <Screen scroll>
      <Heading
        title="Selamat datang di Simeyo"
        description="Verifikasi email dan afiliasi kampus diperlukan untuk masuk ke percakapan."
      />
      <Text style={{ color: colors.muted, lineHeight: 24 }}>
        Status akun: {user?.verification_state ?? "belum dapat dimuat"}. Proses
        verifikasi tersedia pada web Simeyo.
      </Text>
      <Button
        label="Periksa status"
        onPress={() => void refresh().catch(() => {})}
      />
      <Button
        outline
        label="Buka verifikasi kampus"
        onPress={() =>
          void Linking.openURL(
            `${process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000"}/verification`,
          )
        }
      />
      <Button
        outline
        label="Keluar"
        onPress={() => void logout().catch(() => {})}
      />
    </Screen>
  );
}
