"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-md p-10">
      <h1 className="text-2xl font-semibold">Ada kendala sementara.</h1>
      <p className="my-5 text-sm text-[var(--muted)]">
        Halaman belum berhasil dimuat. Coba kembali.
      </p>
      <Button onClick={reset}>Coba lagi</Button>
    </main>
  );
}
