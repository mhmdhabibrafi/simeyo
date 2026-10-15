import { CampusExplore } from "@/components/social/campus";
export default async function Page({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return <CampusExplore initialSearch={`#${tag}`} />;
}
