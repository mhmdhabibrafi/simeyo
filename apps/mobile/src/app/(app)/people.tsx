import { useLocalSearchParams } from "expo-router";
import { People } from "../../components/people";
import { Screen, Heading } from "../../components/ui";
export default function Page() {
  const { relation, userId } = useLocalSearchParams<{
    relation?: string;
    userId?: string;
  }>();
  return (
    <Screen>
      <Heading
        title={
          relation === "followers"
            ? "Pengikut"
            : relation === "following"
              ? "Mengikuti"
              : "Temukan teman"
        }
      />
      <People
        relation={relation}
        userId={userId ? Number(userId) : undefined}
      />
    </Screen>
  );
}
