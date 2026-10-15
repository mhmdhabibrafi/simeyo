import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, useTheme } from "../../lib/providers";
import { Screen, Heading, Button, Status } from "../../components/ui";
function List({ kind }: { kind: "blocks" | "mutes" }) {
  const { api } = useSession();
  const { colors } = useTheme();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["privacy", kind],
    queryFn: () =>
      api<{ data: { id: number; name: string }[] }>(`privacy/${kind}`),
  });
  const m = useMutation({
    mutationFn: (id: number) =>
      api(`relationships/${id}/${kind === "blocks" ? "block" : "mute"}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void q.refetch();
      void client.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontWeight: "600", fontSize: 16, color: colors.text }}>
        {kind === "blocks" ? "Diblokir" : "Disenyapkan"}
      </Text>
      {q.data?.data.map((u) => (
        <View
          key={u.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text style={{ color: colors.text, flex: 1 }}>{u.name}</Text>
          <Button
            outline
            label="Pulihkan"
            disabled={m.isPending}
            onPress={() => m.mutate(u.id)}
          />
        </View>
      ))}
      <Status
        loading={q.isPending}
        error={q.error?.message ?? m.error?.message}
        empty={
          q.data && !q.data.data.length
            ? "Tidak ada akun di daftar ini."
            : undefined
        }
      />
    </View>
  );
}
export default function Privacy() {
  return (
    <Screen scroll>
      <Heading title="Privasi lingkaranmu" />
      <List kind="blocks" />
      <List kind="mutes" />
    </Screen>
  );
}
