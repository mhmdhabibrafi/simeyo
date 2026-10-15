import { Feed } from "@/components/social/feed";
export default function Page() {
  return (
    <>
      <header className="border-b border-[var(--border)] px-6 py-6">
        <h1 className="text-xl font-semibold">Cerita tersimpan</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Sudut pandang yang ingin kamu baca lagi.
        </p>
      </header>
      <Feed feed="bookmarks" />
    </>
  );
}
