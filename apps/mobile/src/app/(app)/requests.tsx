import { Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession, useTheme } from "../../lib/providers";
import { Screen, Heading, Button, Status } from "../../components/ui";
export default function Requests() {
  const { api } = useSession();
  const { colors } = useTheme();
  const q = useQuery({
    queryKey: ["follow-requests"],
    queryFn: () =>
      api<{ data: { id: number; name: string; username: string }[] }>(
        "follow-requests",
      ),
  });
  const m = useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) =>
      api(`follow-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ accept }),
      }),
    onSuccess: () => void q.refetch(),
  });
  return (
    <Screen scroll>
      <Heading title="Permintaan mengikuti" />
      {q.data?.data.map((u) => (
        <View
          key={u.id}
          style={{
            gap: 12,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {u.name}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            @{u.username}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button
              label="Terima"
              disabled={m.isPending}
              onPress={() => m.mutate({ id: u.id, accept: true })}
            />
            <Button
              outline
              label="Tolak"
              disabled={m.isPending}
              onPress={() => m.mutate({ id: u.id, accept: false })}
            />
          </View>
        </View>
      ))}
      <Status
        loading={q.isPending}
        error={q.error?.message ?? m.error?.message}
        empty={
          q.data && !q.data.data.length ? "Belum ada permintaan." : undefined
        }
      />
    </Screen>
  );
}
