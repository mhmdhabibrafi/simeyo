import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, useTheme } from "../../../lib/providers";
import { postSchema } from "../../../lib/contracts";
import { Composer } from "../../../components/composer";
import { Button, Field, Screen, Status } from "../../../components/ui";
export default function Actions() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { colors } = useTheme();
  const client = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const q = useQuery({
    queryKey: ["post", Number(id)],
    queryFn: async () =>
      postSchema.parse((await api<{ data: unknown }>(`posts/${id}`)).data),
  });
  const m = useMutation({
    mutationFn: (action: "report" | "delete") =>
      api(`posts/${id}${action === "report" ? "/report" : ""}`, {
        method: action === "report" ? "POST" : "DELETE",
        body:
          action === "report" ? JSON.stringify({ reason, details }) : undefined,
      }),
    onSuccess: (_r, action) => {
      if (action === "delete") {
        client.removeQueries({ queryKey: ["post", Number(id)] });
        void client.invalidateQueries({ queryKey: ["feed"] });
        router.replace("/");
      } else router.back();
    },
  });
  if (q.isError || !q.data)
    return (
      <Screen>
        <Status
          loading={q.isPending}
          error={q.error?.message}
          onRetry={() => void q.refetch()}
        />
      </Screen>
    );
  if (edit)
    return (
      <Composer
        editId={Number(id)}
        initialBody={q.data.body}
        initialVisibility={q.data.visibility}
        existingImages={q.data.media.length}
        onDone={() => router.back()}
      />
    );
  return (
    <Screen scroll>
      {q.data.can_edit && (
        <>
          <Button outline label="Edit cerita" onPress={() => setEdit(true)} />
          <Button
            outline
            label="Hapus cerita"
            onPress={() => setConfirm(true)}
          />
          {confirm && (
            <View
              style={{
                gap: 12,
                padding: 16,
                borderRadius: 16,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ fontWeight: "600", color: colors.text }}>
                Hapus cerita ini?
              </Text>
              <Text
                style={{ fontSize: 13, lineHeight: 22, color: colors.muted }}
              >
                Balasan dan kutipan yang bergantung pada cerita ini juga tidak
                lagi dapat diakses.
              </Text>
              <Button
                label="Ya, hapus cerita"
                disabled={m.isPending}
                onPress={() => m.mutate("delete")}
              />
              <Button outline label="Batal" onPress={() => setConfirm(false)} />
            </View>
          )}
        </>
      )}
      <Text
        accessibilityRole="header"
        style={{ fontSize: 19, fontWeight: "600", color: colors.text }}
      >
        Laporkan konten
      </Text>
      <Text style={{ fontSize: 13, lineHeight: 22, color: colors.muted }}>
        Bantu menjaga percakapan kampus tetap nyaman.
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Alasan laporan">
        {[
          ["spam", "Spam"],
          ["harassment", "Pelecehan"],
          ["hate", "Ujaran kebencian"],
          ["misinformation", "Informasi menyesatkan"],
          ["other", "Lainnya"],
        ].map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: reason === value }}
            onPress={() => setReason(value)}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 18 }}>
              {reason === value ? "◉" : "○"}
            </Text>
            <Text style={{ fontSize: 14, color: colors.text }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Field
        label="Keterangan laporan (opsional)"
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={1000}
      />
      {m.error && <Status error={m.error.message} />}
      <Button
        label="Kirim laporan"
        disabled={m.isPending}
        onPress={() => m.mutate("report")}
      />
    </Screen>
  );
}
