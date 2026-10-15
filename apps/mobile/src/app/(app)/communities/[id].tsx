import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, useTheme } from "../../../lib/providers";
import { communitySchema } from "../../../lib/contracts";
import { Feed } from "../../../components/feed";
import { Button, Heading, Screen, Status } from "../../../components/ui";
export default function Community() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { colors } = useTheme();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["community", Number(id)],
    queryFn: async () =>
      communitySchema.parse(
        (await api<{ data: unknown }>(`communities/${id}`)).data,
      ),
  });
  const m = useMutation({
    mutationFn: (remove: boolean) =>
      api(`communities/${id}/membership`, {
        method: remove ? "DELETE" : "PUT",
      }),
    onSuccess: () => {
      void q.refetch();
      void client.invalidateQueries({ queryKey: ["communities"] });
      void client.invalidateQueries({ queryKey: ["feed"] });
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
  const c = q.data;
  const visible = c.visibility === "campus" || c.membership?.state === "active";
  const header = (
    <>
      <Heading
        title={c.name}
        description={`${c.members_count} anggota · ${c.visibility === "private" ? "Privat" : "Terbuka"}`}
      />
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 14, lineHeight: 24, color: colors.text }}>
          {c.description}
        </Text>
        {!!c.rules && (
          <Text style={{ fontSize: 12, lineHeight: 21, color: colors.muted }}>
            Aturan: {c.rules}
          </Text>
        )}
        {c.membership?.role !== "owner" && (
          <Button
            outline
            label={
              c.membership?.state === "pending"
                ? "Batalkan permintaan"
                : c.membership
                  ? "Keluar komunitas"
                  : "Bergabung"
            }
            disabled={m.isPending}
            onPress={() => m.mutate(!!c.membership)}
          />
        )}
        <Status error={m.error?.message} />
        {c.membership?.state === "active" && (
          <Button
            label="Cerita untuk komunitas"
            onPress={() =>
              router.push({
                pathname: "/compose-thread",
                params: { communityId: c.id },
              })
            }
          />
        )}
      </View>
    </>
  );
  return (
    <Screen>
      {visible ? (
        <Feed communityId={Number(id)} header={header} />
      ) : (
        <>
          {header}
          <Status empty="Cerita hanya tersedia untuk anggota yang disetujui." />
        </>
      )}
    </Screen>
  );
}
