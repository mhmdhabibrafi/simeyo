import Link from "next/link";
export function Brand() {
  return (
    <Link
      href="/"
      className="inline-block text-[34px] font-bold leading-none tracking-[-2px]"
      aria-label="Simeyo, halaman utama"
    >
      simeyo<span className="text-[var(--accent)]">.</span>
    </Link>
  );
}
