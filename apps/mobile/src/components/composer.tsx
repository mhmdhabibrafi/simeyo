import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, useTheme } from "../lib/providers";
import { mediaSchema, type Media } from "../lib/contracts";
import { Avatar, PostImage } from "./media";
import { Button } from "./ui";
export function Composer({
  parentId,
  quoteId,
  communityId,
  editId,
  initialBody = "",
  initialVisibility = "campus",
  existingImages = 0,
  onDone,
}: {
  parentId?: number;
  quoteId?: number;
  communityId?: number;
  editId?: number;
  initialBody?: string;
  initialVisibility?: "campus" | "followers";
  existingImages?: number;
  onDone?: () => void;
}) {
  const { api, user } = useSession();
  const { colors } = useTheme();
  const client = useQueryClient();
  const [body, setBody] = useState(initialBody);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [media, setMedia] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftId, setDraftId] = useState(() => Crypto.randomUUID());
  const changed = () => setDraftId(Crypto.randomUUID());
  const upload = async () => {
    setError("");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 1,
    });
    if (result.canceled) return;
    setBusy(true);
    try {
      for (const asset of result.assets) {
        const context = ImageManipulator.manipulate(asset.uri);
        const scale = Math.min(1, 1920 / Math.max(asset.width, asset.height));
        context.resize({
          width: Math.round(asset.width * scale),
          height: Math.round(asset.height * scale),
        });
        const image = await context.renderAsync();
        const resized = await image.saveAsync({
          format: SaveFormat.JPEG,
          compress: 0.82,
        });
        const data = new FormData();
        if (Platform.OS === "web")
          data.append(
            "image",
            await (await fetch(resized.uri)).blob(),
            "story.jpg",
          );
        else
          data.append("image", {
            uri: resized.uri,
            type: "image/jpeg",
            name: "story.jpg",
          } as unknown as Blob);
        const r = await api<{ data: unknown }>("media/posts", {
          method: "POST",
          body: data,
        });
        setMedia((old) => [...old, mediaSchema.parse(r.data)]);
        changed();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Foto belum dapat diunggah.");
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api(editId ? `posts/${editId}` : "posts", {
        method: editId ? "PATCH" : "POST",
        body: JSON.stringify({
          body,
          visibility,
          parent_id: parentId,
          quote_id: quoteId,
          community_id: communityId,
          media_ids: media.map((m) => m.id),
          client_id: draftId,
        }),
      });
      setBody("");
      setMedia([]);
      changed();
      await client.invalidateQueries({ queryKey: ["feed"] });
      if (editId)
        await client.invalidateQueries({ queryKey: ["post", editId] });
      onDone?.();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Cerita belum berhasil dikirim.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 20 }}
      >
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Avatar name={user?.name ?? "Simeyo"} url={user?.avatar_url} />
          <View>
            <Text
              style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}
            >
              {user?.name}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              {parentId
                ? "Membalas percakapan"
                : quoteId
                  ? "Mengutip cerita"
                  : "Satu cerita, perspektif baru."}
            </Text>
          </View>
        </View>
        <TextInput
          accessibilityLabel={parentId ? "Tulis balasan" : "Tulis cerita"}
          multiline
          maxLength={1000}
          editable={!busy}
          placeholder={
            parentId
              ? "Tambahkan sudut pandangmu…"
              : "Apa cerita kampusmu hari ini?"
          }
          placeholderTextColor={colors.muted}
          style={{
            fontSize: 17,
            lineHeight: 29,
            color: colors.text,
            minHeight: 180,
            textAlignVertical: "top",
          }}
          value={body}
          onChangeText={(value) => {
            setBody(value);
            changed();
          }}
        />
        {media.map((m) => (
          <View key={m.id} style={{ gap: 8 }}>
            <PostImage {...m} />
            <Button
              outline
              label="Hapus lampiran"
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await api(`media/posts/${m.id}`, { method: "DELETE" });
                  setMedia((old) => old.filter((i) => i.id !== m.id));
                  changed();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Lampiran belum dapat dihapus.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          </View>
        ))}
        {!editId && (
          <Button
            outline
            label="Tambahkan foto"
            disabled={busy}
            onPress={() => void upload().catch((e) => setError(e.message))}
          />
        )}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Visibilitas cerita"
          style={{ gap: 8 }}
        >
          {[
            ["campus", "Komunitas kampus"],
            ["followers", "Hanya pengikut"],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{
                checked: visibility === value,
                disabled: busy,
              }}
              disabled={busy}
              onPress={() => {
                setVisibility(value as "campus" | "followers");
                changed();
              }}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Text style={{ color: colors.accent, fontSize: 18 }}>
                {visibility === value ? "◉" : "○"}
              </Text>
              <Text style={{ color: colors.text, fontSize: 13 }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 18 }}>
          {body.length}/1000 · Cerita tetap mengikuti privasi akun dan
          komunitasmu.
        </Text>
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger, lineHeight: 22, fontSize: 13 }}
          >
            {error}
          </Text>
        )}
        <Button
          label={busy ? "Menyimpan…" : editId ? "Simpan perubahan" : "Bagikan"}
          disabled={busy || (!body.trim() && !media.length && !existingImages)}
          onPress={() => void submit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
