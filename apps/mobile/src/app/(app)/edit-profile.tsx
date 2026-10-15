import { useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, useTheme } from "../../lib/providers";
import { Button, Field, Screen, Status } from "../../components/ui";
export default function Edit() {
  const { api, user, refresh } = useSession();
  const { colors } = useTheme();
  const client = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [privateAccount, setPrivate] = useState(user?.private_account ?? false);
  const [academic, setAcademic] = useState(user?.academic_visible ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (kind: "avatar" | "cover") => {
    setError("");
    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (selected.canceled) return;
    setBusy(true);
    try {
      const asset = selected.assets[0];
      const context = ImageManipulator.manipulate(asset.uri);
      context.resize({ width: Math.min(1600, asset.width) });
      const image = await context.renderAsync();
      const file = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.82,
      });
      const form = new FormData();
      form.set("kind", kind);
      if (Platform.OS === "web")
        form.append(
          "image",
          await (await fetch(file.uri)).blob(),
          "profile.jpg",
        );
      else
        form.append("image", {
          uri: file.uri,
          type: "image/jpeg",
          name: "profile.jpg",
        } as unknown as Blob);
      await api("me/media", { method: "POST", body: form });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Foto belum dapat disimpan.");
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api("me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          username,
          bio,
          location,
          private_account: privateAccount,
          academic_visible: academic,
        }),
      });
      await refresh();
      void client.invalidateQueries({ queryKey: ["profile"] });
      void client.invalidateQueries({ queryKey: ["feed"] });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Profil belum dapat disimpan.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen scroll>
      <Field
        label="Nama tampilan"
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Field
        label="Username"
        value={username}
        onChangeText={(value) => setUsername(value.toLowerCase())}
        maxLength={24}
        autoCapitalize="none"
      />
      <Field
        label="Bio"
        value={bio}
        onChangeText={setBio}
        maxLength={500}
        multiline
        style={{ minHeight: 100, textAlignVertical: "top" }}
      />
      <Field
        label="Lokasi"
        value={location}
        onChangeText={setLocation}
        maxLength={80}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 48,
        }}
      >
        <Text style={{ color: colors.text }}>Akun privat</Text>
        <Switch
          accessibilityLabel="Akun privat"
          value={privateAccount}
          onValueChange={setPrivate}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 48,
        }}
      >
        <Text style={{ color: colors.text }}>Tampilkan informasi akademik</Text>
        <Switch
          accessibilityLabel="Tampilkan informasi akademik"
          value={academic}
          onValueChange={setAcademic}
        />
      </View>
      <Button
        outline
        label="Ubah foto profil"
        disabled={busy}
        onPress={() => void upload("avatar")}
      />
      <Button
        outline
        label="Ubah foto sampul"
        disabled={busy}
        onPress={() => void upload("cover")}
      />
      {!!error && <Status error={error} />}
      <Button
        label={busy ? "Menyimpan…" : "Simpan profil"}
        disabled={busy || !name.trim() || !username.trim()}
        onPress={() => void save()}
      />
    </Screen>
  );
}
