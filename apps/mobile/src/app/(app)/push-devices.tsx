import { Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession, useTheme } from "../../lib/providers";
import { Screen, Heading, Button, Status } from "../../components/ui";
export default function Devices() {
  const { api } = useSession();
  const { colors } = useTheme();
  const q = useQuery({
    queryKey: ["push-devices"],
    queryFn: () =>
      api<{ data: { id: number; name: string; platform: string }[] }>(
        "push-devices",
      ),
  });
  const m = useMutation({
    mutationFn: (id: number) => api(`push-devices/${id}`, { method: "DELETE" }),
    onSuccess: () => void q.refetch(),
  });
  return (
    <Screen scroll>
      <Heading
        title="Perangkat push"
        description="Keluar dari sesi native juga mencabut langganan push sesi tersebut."
      />
      {q.data?.data.map((d) => (
        <View
          key={d.id}
          style={{
            gap: 12,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text }}>
            {d.name} · {d.platform}
          </Text>
          <Button
            outline
            label="Cabut perangkat"
            disabled={m.isPending}
            onPress={() => m.mutate(d.id)}
          />
        </View>
      ))}
      <Status
        loading={q.isPending}
        error={q.error?.message ?? m.error?.message}
        empty={
          q.data && !q.data.data.length
            ? "Belum ada perangkat push terdaftar."
            : undefined
        }
      />
    </Screen>
  );
}
