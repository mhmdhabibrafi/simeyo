"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useMe } from "@/lib/auth";
import { ThreadComposerTrigger } from "./thread-composer";
import { Feed } from "./feed";
export function HomeFeed() {
  const { data: u } = useMe();
  const [tab, setTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem("simeyo-feed-tab");
      if (saved && ["for-you", "following", "campus"].includes(saved))
        return saved;
    } catch {
      /* Feed navigation works when storage is disabled. */
    }
    return "for-you";
  });
  return (
    <>
      <header className="flex h-12 items-center justify-between px-4 sm:px-6 md:h-16">
        <div className="min-w-0 pr-3">
          <h1 className="text-lg font-semibold tracking-tight">Beranda</h1>
        </div>
      </header>
      <div className="feed-surface">
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
              href="/settings#account-campus"
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
                  id={`feed-tab-${t.id}`}
                  role="tab"
                  tabIndex={tab === t.id ? 0 : -1}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  className={`min-h-12 border-b-2 text-sm transition-colors hover:text-[var(--foreground)] ${tab === t.id ? "border-[var(--foreground)] font-semibold" : "border-transparent text-[var(--muted)]"}`}
                  onClick={() => {
                    setTab(t.id);
                    try {
                      sessionStorage.setItem("simeyo-feed-tab", t.id);
                    } catch {
                      /* Optional session preference. */
                    }
                  }}
                  onKeyDown={(event) => {
                    const tabs = Array.from(
                      event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                        '[role="tab"]',
                      ),
                    );
                    const current = tabs.indexOf(event.currentTarget);
                    const next =
                      event.key === "ArrowRight"
                        ? (current + 1) % tabs.length
                        : event.key === "ArrowLeft"
                          ? (current + tabs.length - 1) % tabs.length
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? tabs.length - 1
                              : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    tabs[next].click();
                    tabs[next].focus();
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <ThreadComposerTrigger />
            {["for-you", "following", "campus"]
              .filter((id) => id !== tab)
              .map((id) => (
                <div
                  key={id}
                  id={`panel-${id}`}
                  role="tabpanel"
                  aria-labelledby={`feed-tab-${id}`}
                  hidden
                />
              ))}
            <section
              id={`panel-${tab}`}
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={`feed-tab-${tab}`}
              aria-label={
                tab === "for-you"
                  ? "Feed Untukmu"
                  : tab === "following"
                    ? "Feed Mengikuti"
                    : "Feed Kampus"
              }
            >
              <Feed key={tab} feed={tab} />
            </section>
          </>
        )}
      </div>
    </>
  );
}
