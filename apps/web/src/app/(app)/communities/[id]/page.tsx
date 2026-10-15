import { CommunityView } from "@/components/social/campus";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CommunityView id={Number(id)} />;
}
