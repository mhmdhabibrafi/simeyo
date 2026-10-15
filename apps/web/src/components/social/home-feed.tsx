"use client";
import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, ShieldCheck } from "lucide-react";
import { useMe } from "@/lib/auth";
import { Composer } from "./composer";
import { Feed } from "./feed";
export function HomeFeed() {
  const { data: u } = useMe();
  const [tab, setTab] = useState("for-you");
  return (
    <>
      <header className="flex items-center justify-between px-6 py-5">
        <div>
          <p className="text-[10px] uppercase tracking-[.16em] text-[var(--muted)]">
            Satu kampus. Banyak cerita.
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Beranda</h1>
        </div>
        <Link
          href="/settings"
          className="icon-button text-[var(--muted)]"
          aria-label="Pengaturan feed"
        >
          <SlidersHorizontal size={19} />
        </Link>
      </header>
      {!u?.verified || !u.email_verified ? (
        <div className="m-6 rounded-2xl border border-[var(--border)] p-6">
          <ShieldCheck size={26} className="text-[var(--accent)]" />
          <h2 className="mt-4 font-semibold">
            Verifikasi afiliasi untuk mulai bercerita.
          </h2>
          <p className="my-3 text-sm leading-7 text-[var(--muted)]">
            Percakapan kampus hanya tersedia bagi anggota yang disetujui.
          </p>
          <Link
            href="/verification"
            className="inline-flex min-h-11 items-center text-sm text-[var(--accent)]"
          >
            Lihat status verifikasi →
          </Link>
        </div>
      ) : (
        <>
          <div
            className="grid grid-cols-3 border-b border-[var(--border)]"
            role="tablist"
            aria-label="Jenis feed"
          >
            {[
              { id: "for-you", name: "Untukmu" },
              { id: "following", name: "Mengikuti" },
              { id: "campus", name: "Kampus" },
            ].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`panel-${tab}`}
                className={`min-h-12 border-b-2 text-sm ${tab === t.id ? "border-[var(--foreground)] font-semibold" : "border-transparent text-[var(--muted)]"}`}
                onClick={() => setTab(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="border-b border-[var(--border)]">
            <Composer compact />
          </div>
          <section
            id={`panel-${tab}`}
            role="tabpanel"
            aria-label={
              tab === "for-you"
                ? "Feed Untukmu"
                : tab === "following"
                  ? "Feed Mengikuti"
                  : "Feed Kampus"
            }
          >
            {tab === "for-you" && (
              <p className="border-b border-[var(--border)] px-6 py-3 text-[10px] leading-5 text-[var(--muted)]">
                Cerita terkini, interaksi nyata, dan akun yang kamu ikuti.{" "}
                <Link href="/explore" className="underline">
                  Kenali lingkaran baru
                </Link>
              </p>
            )}
            <Feed key={tab} feed={tab} />
          </section>
        </>
      )}
    </>
  );
}
