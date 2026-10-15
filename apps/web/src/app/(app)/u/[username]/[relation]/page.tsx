import { ProfilePeople } from "@/components/social/profile-people";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ username: string; relation: string }>;
}) {
  const { username, relation } = await params;
  if (relation !== "following" && relation !== "followers") notFound();
  return <ProfilePeople username={username} relation={relation} />;
}
