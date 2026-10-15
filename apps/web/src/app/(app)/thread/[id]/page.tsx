import { Thread } from "@/components/social/thread";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Thread id={Number(id)} />;
}
