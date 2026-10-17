"use client";
import { useQuery } from "@tanstack/react-query";
import { userSchema } from "../../../../../packages/api-contracts/src";
import { api } from "@/lib/api";
import { BackButton } from "@/components/ui/back-button";
import { People } from "./people";
export function ProfilePeople({
  username,
  relation,
}: {
  username: string;
  relation: "followers" | "following";
}) {
  const q = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const r = await api<{ data: unknown }>(
        `profiles/${encodeURIComponent(username)}`,
      );
      return userSchema.parse(r.data);
    },
  });
  return (
    <>
      <header className="page-header">
        <BackButton />
        <h1 className="min-w-0 break-words text-base font-semibold">
          {relation === "following" ? "Mengikuti" : "Pengikut"} · @{username}
        </h1>
      </header>
      {q.data ? (
        <People relation={relation} userId={q.data.id} />
      ) : q.isError ? (
        <p role="alert" className="p-6">
          Profil tidak dapat diakses.
        </p>
      ) : (
        <div className="skeleton m-6 h-40" />
      )}
    </>
  );
}
