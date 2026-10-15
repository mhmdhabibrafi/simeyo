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
    <div className="mb-6 space-y-3">
      <Button type="button" className="w-full" disabled={busy} onClick={login}>
        {busy ? "Menghubungkan akun…" : "Lanjutkan dengan Google kampus"}
      </Button>
      <p className="text-xs leading-5 text-[var(--muted)]">
        Mahasiswa: @students.uin-suska.ac.id. Dosen dan staf: @uin-suska.ac.id.
        Email kampus diverifikasi melalui Google.
      </p>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
