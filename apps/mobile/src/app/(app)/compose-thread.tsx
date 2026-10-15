import { router, useLocalSearchParams } from "expo-router";
import { Composer } from "../../components/composer";
export default function Compose() {
  const params = useLocalSearchParams<{
    parentId?: string;
    quoteId?: string;
    communityId?: string;
  }>();
  return (
    <Composer
      parentId={params.parentId ? Number(params.parentId) : undefined}
      quoteId={params.quoteId ? Number(params.quoteId) : undefined}
      communityId={params.communityId ? Number(params.communityId) : undefined}
      onDone={() => router.back()}
    />
  );
}
