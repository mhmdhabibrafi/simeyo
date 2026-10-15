import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Orbit,
  MoveUpRight,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/providers";
export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10">
        <Brand />
        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="#tentang"
            className="hidden text-sm text-[var(--muted)] sm:block"
          >
            Tentang Simeyo
          </a>
          <ThemeToggle />
          <Link href="/login" className="text-sm font-semibold">
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--surface)]"
          >
            Gabung <ArrowUpRight size={15} className="ml-1 inline" />
          </Link>
        </div>
      </header>
      <main id="main">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_1fr] lg:px-10 lg:pb-28 lg:pt-20">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Untuk cerita di antara jadwal kuliah
            </div>
            <h1 className="text-[clamp(3.4rem,6.1vw,6.2rem)] font-semibold leading-[1.02] tracking-[-.065em]">
              Satu kampus.
              <br />
              Banyak <span className="text-[var(--accent)]">cerita.</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-8 text-[var(--muted)] sm:text-lg">
              Lebih dekat dengan orang-orang di kampusmu.
              <br className="hidden sm:block" /> Ruang untuk bertanya, berbagi,
              dan jadi diri sendiri.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
              >
                Temukan ruangmu <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center gap-2 text-sm font-medium"
              >
                Sudah punya akun? <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="mt-9 flex items-center gap-2 text-xs text-[var(--muted)]">
              <ShieldCheck size={16} />
              Afiliasi terverifikasi. Percakapan lebih berarti.
            </div>
          </div>
          <div
            className="relative mx-auto flex aspect-square w-full max-w-[500px] items-center justify-center"
            aria-label="Ilustrasi ruang percakapan kampus"
          >
            <div className="absolute inset-8 rounded-full border border-[var(--border)]" />
            <div className="absolute inset-20 rounded-full border border-[var(--border)]" />
            <div className="absolute inset-32 rounded-full bg-[var(--accent)]/5" />
            <div className="relative -rotate-6 rounded-[36px] bg-[var(--accent)] p-12 text-white shadow-[0_24px_80px_#6d4aff35]">
              <MessageCircle size={110} strokeWidth={1.4} />
              <div className="mt-5 text-center text-3xl font-semibold tracking-tight">
                halo, kampus.
              </div>
            </div>
            <div className="absolute left-0 top-12 rotate-[-8deg] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
              <span className="text-xl">✦</span>
              <p className="mt-1 text-sm font-medium">
                Ide kecil, obrolan besar.
              </p>
            </div>
            <div className="absolute bottom-10 right-0 rotate-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
              <span className="text-xs text-[var(--muted)]">
                Bukan sekadar satu angkatan.
              </span>
              <p className="mt-1 text-sm font-medium">
                Satu komunitas kampus ↗
              </p>
            </div>
            <div className="absolute right-4 top-10 text-[var(--accent)]">
              <Orbit size={46} strokeWidth={1} />
            </div>
          </div>
        </section>
        <section
          id="tentang"
          className="border-y border-[var(--border)] bg-[var(--soft)]"
        >
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
              <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
                Ada banyak hal yang tak kamu temukan di ruang kelas.
              </h2>
              <p className="max-w-sm text-sm leading-7 text-[var(--muted)]">
                Simeyo sedang dibangun untuk komunitas UIN Sultan Syarif Kasim
                Riau. Platform independen, tanpa klaim afiliasi resmi.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: MessageCircle,
                  n: "01",
                  title: "Percakapan yang dekat",
                  text: "Mulai dengan pertanyaan sederhana. Temukan perspektif dari orang-orang yang berbagi kampus denganmu.",
                },
                {
                  icon: Orbit,
                  n: "02",
                  title: "Kenali lingkaran baru",
                  text: "Isi profil dan minatmu. Biarkan identitasmu lebih luas daripada fakultas atau nomor angkatan.",
                },
                {
                  icon: ShieldCheck,
                  n: "03",
                  title: "Ruang yang terjaga",
                  text: "Verifikasi afiliasi menjadi pintu masuk. Detail akademik tetap dalam kendalimu.",
                },
              ].map((item) => (
                <div
                  key={item.n}
                  className="border-t border-[var(--border)] pt-6"
                >
                  <div className="mb-7 flex items-center justify-between">
                    <item.icon
                      size={25}
                      strokeWidth={1.5}
                      className="text-[var(--accent)]"
                    />
                    <span className="text-xs text-[var(--muted)]">
                      {item.n}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-6 py-16 lg:px-10">
          <div>
            <p className="text-xs uppercase tracking-[.18em] text-[var(--accent)]">
              Mulai dengan satu halo
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Cerita selanjutnya bisa jadi milikmu.
            </h2>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-5 rounded-xl border border-[var(--border)] px-6 py-4 text-sm font-semibold"
          >
            Bergabung dengan Simeyo <MoveUpRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap justify-between gap-4 border-t border-[var(--border)] px-6 py-7 text-xs text-[var(--muted)] lg:px-10">
        <span>simeyo. · Satu kampus. Banyak cerita.</span>
        <span>Privasi dimulai dari pilihanmu.</span>
      </footer>
    </div>
  );
}
