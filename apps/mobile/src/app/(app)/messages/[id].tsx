import { useLocalSearchParams } from "expo-router";
import { MessageThread } from "../../../components/communications";
export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MessageThread id={Number(id)} />;
}
