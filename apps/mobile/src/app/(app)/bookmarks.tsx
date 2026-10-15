import { Feed } from "../../components/feed";
import { Heading, Screen } from "../../components/ui";
export default function Page() {
  return (
    <Screen>
      <Feed
        feed="bookmarks"
        header={
          <Heading
            title="Tersimpan"
            description="Cerita yang ingin kamu temukan lagi."
          />
        }
      />
    </Screen>
  );
}
