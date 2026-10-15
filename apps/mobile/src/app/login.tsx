import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useSession, useTheme } from "../lib/providers";
import { Screen, Field, Button } from "../components/ui";
export default function Login() {
  const { login } = useSession();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Screen scroll>
      <View style={{ paddingTop: 64, paddingBottom: 32 }}>
        <Text
          style={{
            fontSize: 48,
            fontWeight: "800",
            letterSpacing: -3,
            color: colors.text,
          }}
        >
          simeyo<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 25,
            fontWeight: "600",
            letterSpacing: -0.7,
            color: colors.text,
            marginTop: 28,
          }}
        >
          Kembali ke lingkaranmu.
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 24,
            color: colors.muted,
            marginTop: 12,
          }}
        >
          Masuk untuk melanjutkan cerita bersama komunitas kampusmu.
        </Text>
      </View>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Field
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.danger, fontSize: 13, lineHeight: 22 }}
        >
          {error}
        </Text>
      )}
      <Button
        label={busy ? "Sedang masuk…" : "Masuk"}
        disabled={busy || !email.trim() || !password}
        onPress={async () => {
          setBusy(true);
          setError("");
          try {
            await login(email.trim(), password);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Masuk belum berhasil.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button
        outline
        label="Belum punya akun? Daftar"
        onPress={() =>
          void Linking.openURL(
            `${process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000"}/register`,
          )
        }
      />
      <Button
        outline
        label="Lupa kata sandi"
        onPress={() =>
          void Linking.openURL(
            `${process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000"}/forgot-password`,
          )
        }
      />
    </Screen>
  );
}
