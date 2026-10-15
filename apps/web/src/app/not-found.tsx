import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-24">
      <p className="text-sm text-[var(--accent)]">404</p>
      <h1 className="mt-4 text-3xl font-semibold">
        Ruang ini belum ditemukan.
      </h1>
      <p className="my-5 text-sm text-[var(--muted)]">
        Tautannya mungkin berubah atau halaman belum tersedia.
      </p>
      <Link href="/" className="text-sm text-[var(--accent)]">
        Kembali ke halaman utama →
      </Link>
    </main>
  );
}
