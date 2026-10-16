import Link from "next/link";
import { Brand } from "./brand";
import { ThemeToggle } from "./providers";

export function AuthLayout({ title, description, linkHref, linkLabel, children }: {
  title: string;
  description: string;
  linkHref: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-7">
        <Brand />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href={linkHref} className="text-sm font-medium">{linkLabel}</Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-lg px-6 py-10 sm:py-16">
        <section className="mx-auto w-full max-w-[420px]">
          <h1 className="text-center text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mb-8 mt-3 text-center text-sm leading-6 text-[var(--muted)]">{description}</p>
          {children}
          <footer className="mt-10 border-t border-[var(--border)] pt-6 text-center">
            <p className="text-xs font-medium tracking-wide text-[var(--foreground)]">
              &copy; {new Date().getFullYear()} Simeyo
            </p>
            <p className="mx-auto mt-3 max-w-[300px] text-xs leading-5 text-[var(--muted)]">
              Platform komunitas independen.
              <br />
              Tidak mewakili layanan resmi universitas.
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
