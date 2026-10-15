import { useState } from "react";
import { Linking, Platform, Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useSession, useTheme } from "../../lib/providers";
import { communicationPreferencesSchema } from "../../lib/contracts";
import { Button, Heading, Screen, Status } from "../../components/ui";
export default function Settings() {
  const { api, user, logout } = useSession();
  const { colors, mode, setMode } = useTheme();
  const [message, setMessage] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const prefs = useQuery({
    queryKey: ["communication-preferences"],
    enabled: !!user?.verified,
    queryFn: async () =>
      communicationPreferencesSchema.parse(
        (await api<{ data: unknown }>("communication-preferences")).data,
      ),
  });
  const m = useMutation({
    mutationFn: (d: unknown) =>
      api("communication-preferences", {
        method: "PATCH",
        body: JSON.stringify(d),
      }),
    onSuccess: () => void prefs.refetch(),
  });
  const registerPush = async () => {
    setPushBusy(true);
    try {
      const config = await api<{ data: { enabled: boolean } }>("push-config");
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!config.data.enabled || !projectId) {
        setMessage("Notifikasi push belum tersedia pada versi aplikasi ini.");
        return;
      }
      if (!Device.isDevice || Platform.OS === "web") {
        setMessage(
          "Aktifkan notifikasi melalui aplikasi pada perangkat Android atau iOS.",
        );
        return;
      }
      if (Platform.OS === "android")
        await Notifications.setNotificationChannelAsync("default", {
          name: "Aktivitas kampus",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      let permissions = await Notifications.getPermissionsAsync();
      if (permissions.status !== "granted")
        permissions = await Notifications.requestPermissionsAsync();
      if (permissions.status !== "granted") {
        setMessage(
          "Izin notifikasi belum diberikan. Kamu dapat mengubahnya melalui pengaturan perangkat.",
        );
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
        .data;
      await api("push-devices", {
        method: "PUT",
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          name: Device.modelName ?? "Perangkat Simeyo",
        }),
      });
      setMessage("Perangkat terdaftar untuk notifikasi push.");
    } catch {
      setMessage(
        "Pendaftaran notifikasi belum berhasil. Periksa koneksi dan coba kembali.",
      );
    } finally {
      setPushBusy(false);
    }
  };
  return (
    <Screen scroll>
      <Heading title="Pengaturan" />
      <Text style={{ fontSize: 14, color: colors.muted }}>{user?.email}</Text>
      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
        Tampilan
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Tema aplikasi"
        style={{ gap: 8 }}
      >
        {[
          ["system", "Ikuti perangkat"],
          ["light", "Terang"],
          ["dark", "Gelap"],
        ].map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: mode === value }}
            onPress={() => setMode(value as "system" | "light" | "dark")}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 18 }}>
              {mode === value ? "◉" : "○"}
            </Text>
            <Text style={{ fontSize: 14, color: colors.text }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Button
        outline
        label="Ubah profil dan privasi"
        onPress={() => router.push("/edit-profile")}
      />
      <Button
        outline
        label="Permintaan mengikuti"
        onPress={() => router.push("/requests")}
      />
      <Button
        outline
        label="Akun diblokir dan disenyapkan"
        onPress={() => router.push("/privacy")}
      />
      {prefs.data && (
        <>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
            Privasi pesan
          </Text>
          {[
            ["campus", "Anggota kampus"],
            ["followers", "Akun yang saya ikuti"],
            ["nobody", "Tidak ada"],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{
                checked: prefs.data!.dm_policy === value,
                disabled: m.isPending,
              }}
              disabled={m.isPending}
              onPress={() => m.mutate({ dm_policy: value })}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Text style={{ color: colors.accent, fontSize: 18 }}>
                {prefs.data!.dm_policy === value ? "◉" : "○"}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14 }}>{label}</Text>
            </Pressable>
          ))}
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
            Notifikasi aktivitas
          </Text>
          {Object.entries({
            likes: "Suka",
            replies: "Balasan",
            mentions: "Mention",
            reposts: "Repost dan kutipan",
            follows: "Pengikut",
            messages: "Pesan",
          }).map(([key, label]) => (
            <View
              key={key}
              style={{
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: colors.text, fontSize: 14 }}>{label}</Text>
              <Switch
                accessibilityLabel={`Notifikasi ${label}`}
                value={prefs.data!.notification_preferences?.[key] ?? true}
                disabled={m.isPending}
                onValueChange={(value) =>
                  m.mutate({
                    notification_preferences: {
                      ...prefs.data!.notification_preferences,
                      [key]: value,
                    },
                  })
                }
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.background}
              />
            </View>
          ))}
        </>
      )}
      {(m.error || prefs.error) && (
        <Status error={m.error?.message ?? prefs.error?.message} />
      )}
      <Button
        outline
        label="Aktifkan notifikasi push"
        disabled={pushBusy}
        onPress={() => void registerPush()}
      />
      <Button
        outline
        label="Kelola perangkat push"
        onPress={() => router.push("/push-devices")}
      />
      {!!message && (
        <Text
          accessibilityRole="alert"
          style={{ fontSize: 13, lineHeight: 22, color: colors.muted }}
        >
          {message}
        </Text>
      )}
      <Button
        outline
        label="Pengelolaan sesi di web"
        onPress={() =>
          void Linking.openURL(
            `${process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000"}/settings`,
          )
        }
      />
      <Button
        outline
        label="Keluar"
        onPress={async () => {
          try {
            await logout();
          } catch (e) {
            setMessage(
              e instanceof Error
                ? e.message
                : "Keluar belum dapat dikonfirmasi.",
            );
          }
        }}
      />
      <Text style={{ fontSize: 11, lineHeight: 18, color: colors.muted }}>
        Simeyo · Pengalaman kampus di genggamanmu.
      </Text>
    </Screen>
  );
}
