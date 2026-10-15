"use client";
import { useQuery } from "@tanstack/react-query";
import { userSchema, authenticationOptionsSchema } from "../../../../packages/api-contracts/src";
import { api } from "./api";
export function useAuthOptions(enabled = true) {
  return useQuery({ queryKey: ["auth-options"], enabled, queryFn: async () => authenticationOptionsSchema.parse((await api<{data: unknown}>("auth/options")).data) });
}
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const result = await api<{ data: unknown }>("me");
      return userSchema.parse(result.data);
    },
  });
}
