"use client";
import { useQuery } from "@tanstack/react-query";
import { userSchema } from "../../../../packages/api-contracts/src";
import { api } from "./api";
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const result = await api<{ data: unknown }>("me");
      return userSchema.parse(result.data);
    },
  });
}
