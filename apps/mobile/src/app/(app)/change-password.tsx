import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { useSession, useTheme } from "../../lib/providers";
import { Button, Field, Screen, Status } from "../../components/ui";

export default function ChangePassword() {
  const { api, logout } = useSession();
  const { colors } = useTheme();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (password !== confirmation) { setError("Konfirmasi kata sandi belum sama."); return; }
    setBusy(true); setError("");
    try {
      await api("me/password", { method: "PUT", body: JSON.stringify({ current_password: current, password, password_confirmation: confirmation }) });
      setCurrent(""); setPassword(""); setConfirmation("");
      // Password rotation already revoked the current native token.
      await logout().catch(() => {});
      router.replace("/login");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Kata sandi belum dapat diperbarui.");
    } finally { setBusy(false); }
  }
  return <Screen scroll>
    <Text style={{color: colors.muted, fontSize: 14, lineHeight: 23}}>Gunakan minimal 12 karakter, huruf besar, huruf kecil, dan angka. Setelah disimpan, semua perangkat perlu masuk kembali.</Text>
    <View style={{gap: 18}}>
      <Field label="Kata sandi saat ini" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" autoCapitalize="none" maxLength={1024} editable={!busy} />
      <Field label="Kata sandi baru" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" maxLength={1024} editable={!busy} />
      <Field label="Konfirmasi kata sandi baru" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" autoCapitalize="none" maxLength={1024} editable={!busy} />
    </View>
    {!!error && <Status error={error} />}
    <Button label={busy ? "Menyimpan…" : "Simpan kata sandi"} disabled={busy || !current || !password || !confirmation} onPress={() => void save()} />
  </Screen>;
}
