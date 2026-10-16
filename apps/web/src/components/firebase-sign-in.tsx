"use client";

import { useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthOptions } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "./ui/button";
import { userSchema } from "../../../../packages/api-contracts/src";

export function FirebaseSignIn() {
  const policy = useAuthOptions();
  const router = useRouter();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const config = policy.data?.firebase;
  if (!config) return null;

  async function login() {
    if (!config) return;
    setBusy(true);
    setError("");
    let auth: Auth | undefined;
    try {
      const app =
        getApps().find((app) => app.name === "simeyo-auth") ??
        initializeApp(config, "simeyo-auth");
      auth = getAuth(app);
      await setPersistence(auth, inMemoryPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const response = await api<{ data: unknown }>("auth/firebase", {
        method: "POST",
        body: JSON.stringify({
          firebase_token: await result.user.getIdToken(true),
        }),
      });
      const user = userSchema.parse(response.data);
      await client.cancelQueries();
      client.clear();
      client.setQueryData(["me"], user);
      router.push("/home");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Google Sign-In belum berhasil. Gunakan akun Google kampus dan coba kembali.",
      );
    } finally {
      if (auth) await signOut(auth).catch(() => {});
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 space-y-3 text-center">
      <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={login}>
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55Z" />
          <path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
        </svg>
        {busy ? "Menghubungkan akun…" : "Lanjutkan dengan Google kampus"}
      </Button>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
