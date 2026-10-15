import { useLocalSearchParams } from "expo-router";
import { Profile } from "../../../components/profile";
export default function Page() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <Profile username={username} />;
}
