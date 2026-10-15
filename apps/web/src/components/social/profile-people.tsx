"use client";
import { useQuery } from "@tanstack/react-query";
import { userSchema } from "../../../../../packages/api-contracts/src";
import { api } from "@/lib/api";
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
      <header className="border-b border-[var(--border)] p-6">
        <h1 className="text-xl font-semibold">
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
