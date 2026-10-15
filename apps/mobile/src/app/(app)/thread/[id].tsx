import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../../lib/providers";
import { postSchema } from "../../../lib/contracts";
import { Screen, Status } from "../../../components/ui";
import { Feed, PostCard } from "../../../components/feed";
export default function Thread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const q = useQuery({
    queryKey: ["post", Number(id)],
    queryFn: async () =>
      postSchema.parse((await api<{ data: unknown }>(`posts/${id}`)).data),
  });
  return (
    <Screen>
      {!q.isError && q.data ? (
        <Feed parentId={Number(id)} header={<PostCard post={q.data} />} />
      ) : (
        <Status
          loading={q.isPending}
          error={q.error?.message}
          onRetry={() => void q.refetch()}
        />
      )}
    </Screen>
  );
}
