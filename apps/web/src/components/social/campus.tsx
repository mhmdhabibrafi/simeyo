"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Feed } from "./feed";
import { Composer } from "./composer";
import { PostCard } from "./post-card";
import { People } from "./people";
import {
  postSchema,
  feedSchema,
} from "../../../../../packages/api-contracts/src/social";
import {
  communitySchema,
  eventSchema,
  type Community,
  type CampusEvent,
} from "../../../../../packages/api-contracts/src/campus";
type Catalog = {
  faculties: { id: number; institution_id: number; name: string }[];
  departments: { id: number; faculty_id: number; name: string }[];
};
export function CampusExplore({
  initialSearch = "",
}: {
  initialSearch?: string;
}) {
  const [tab, setTab] = useState("pulse");
  const [term, setTerm] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const pulse = useQuery({
    queryKey: ["pulse"],
    queryFn: () =>
      api<{
        data: {
          topics: { name: string; posts_count: number }[];
          posts: unknown[];
          explanation: string;
        };
      }>("pulse"),
  });
  const posts = useInfiniteQuery({
    queryKey: ["post-search", search],
    enabled: !!search,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      feedSchema.parse(
        await api(
          `search/posts?q=${encodeURIComponent(search)}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
        ),
      ),
    getNextPageParam: (p) => p.meta.next_cursor,
  });
  return (
    <>
      <header className="border-b border-[var(--border)] p-6">
        <p className="text-xs text-[var(--muted)]">Campus Pulse</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Cerita yang menghubungkan kita.
        </h1>
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <Link href="/communities">Komunitas →</Link>
          <Link href="/events">Acara →</Link>
          <Link href="/requests">Permintaan mengikuti →</Link>
        </div>
      </header>
      <div
        className="flex gap-5 border-b border-[var(--border)] px-6"
        aria-label="Jelajahi"
      >
        <button
          className="min-h-12 text-sm"
          aria-pressed={tab === "pulse"}
          onClick={() => setTab("pulse")}
        >
          Pulse & cerita
        </button>
        <button
          className="min-h-12 text-sm"
          aria-pressed={tab === "people"}
          onClick={() => setTab("people")}
        >
          Temukan teman
        </button>
      </div>
      {tab === "people" ? (
        <People />
      ) : (
        <>
          <form
            className="flex gap-2 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(term.trim());
            }}
          >
            <label className="sr-only" htmlFor="campus-search">
              Cari cerita atau hashtag
            </label>
            <input
              id="campus-search"
              className="input min-w-0 flex-1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Cari cerita, #topik…"
              maxLength={80}
            />
            <Button type="submit">Cari</Button>
          </form>
          {search ? (
            <>
              <p className="px-6 pb-4 text-sm text-[var(--muted)]">
                Hasil untuk “{search}”{" "}
                <button
                  onClick={() => {
                    setSearch("");
                    setTerm("");
                  }}
                >
                  · Hapus pencarian
                </button>
              </p>
              {posts.data?.pages
                .flatMap((p) => p.data)
                .map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              {posts.isError && (
                <p role="alert" className="p-6">
                  Pencarian belum tersedia.
                </p>
              )}
              {posts.data && !posts.data.pages[0].data.length && (
                <p className="p-6 text-sm">Belum ada cerita yang cocok.</p>
              )}
              {posts.hasNextPage && (
                <Button
                  onClick={() => posts.fetchNextPage()}
                  disabled={posts.isFetchingNextPage}
                >
                  Hasil lainnya
                </Button>
              )}
            </>
          ) : (
            <>
              {pulse.isError && (
                <p role="alert" className="p-6">
                  Pulse belum dapat dimuat.
                </p>
              )}
              {pulse.data && (
                <>
                  <section className="px-6 pb-6">
                    <h2 className="text-sm font-semibold">
                      Sedang dibicarakan
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {pulse.data.data.topics.map((t) => (
                        <button
                          key={t.name}
                          className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                          onClick={() => {
                            setSearch("#" + t.name);
                            setTerm("#" + t.name);
                          }}
                        >
                          #{t.name}
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            {t.posts_count} cerita
                          </span>
                        </button>
                      ))}
                    </div>
                    {!pulse.data.data.topics.length && (
                      <p className="mt-3 text-sm text-[var(--muted)]">
                        Topik muncul dari cerita kampus, bukan daftar buatan.
                      </p>
                    )}
                    <details className="mt-5 text-xs leading-6 text-[var(--muted)]">
                      <summary className="cursor-pointer">
                        Mengapa cerita ini muncul?
                      </summary>
                      {pulse.data.data.explanation}
                    </details>
                  </section>
                  {pulse.data.data.posts.map((raw) => {
                    const p = postSchema.parse(raw);
                    return <PostCard key={p.id} post={p} />;
                  })}
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
export function CommunityForm({
  initial,
  onDone,
}: {
  initial?: Community;
  onDone: (id: number) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [rules, setRules] = useState(initial?.rules ?? "");
  const [visibility, setVisibility] = useState(initial?.visibility ?? "campus");
  const [faculty, setFaculty] = useState(initial?.faculty_id?.toString() ?? "");
  const [department, setDepartment] = useState(
    initial?.department_id?.toString() ?? "",
  );
  const [organization, setOrganization] = useState(false);
  const { data: me } = useMe();
  const toast = useToast();
  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: () => api<Catalog>("institutions"),
  });
  const m = useMutation({
    mutationFn: async () =>
      api<{ data: unknown }>(
        initial ? `communities/${initial.id}` : "communities",
        {
          method: initial ? "PATCH" : "POST",
          body: JSON.stringify({
            name,
            description,
            rules,
            visibility,
            faculty_id: faculty ? Number(faculty) : null,
            department_id: department ? Number(department) : null,
            organization_requested: organization,
          }),
        },
      ),
    onSuccess: (r) => onDone(communitySchema.parse(r.data).id),
    onError: (e) => toast(e.message),
  });
  return (
    <form
      className="space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <label className="block text-sm">
        Nama komunitas
        <input
          className="input mt-2 w-full"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Tentang komunitas
        <textarea
          className="input mt-2 min-h-24 w-full"
          required
          maxLength={1500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Aturan
        <textarea
          className="input mt-2 w-full"
          maxLength={1500}
          value={rules}
          onChange={(e) => setRules(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Visibilitas komunitas
        <select
          className="input mt-2 w-full"
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as "campus" | "private")
          }
        >
          <option value="campus">Terbuka untuk kampus</option>
          <option value="private">Privat · anggota disetujui</option>
        </select>
      </label>
      <label className="block text-sm">
        Fakultas (opsional)
        <select
          className="input mt-2 w-full"
          value={faculty}
          onChange={(e) => {
            setFaculty(e.target.value);
            setDepartment("");
          }}
        >
          <option value="">Semua fakultas</option>
          {catalog.data?.faculties
            .filter((f) => f.institution_id === me?.institution?.id)
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
        </select>
      </label>
      <label className="block text-sm">
        Program studi (opsional)
        <select
          className="input mt-2 w-full"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">Semua program studi</option>
          {catalog.data?.departments
            .filter((d) => d.faculty_id === Number(faculty))
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={organization}
          onChange={(e) => setOrganization(e.target.checked)}
        />
        Ajukan sebagai organisasi resmi
      </label>
      <p className="text-xs leading-6 text-[var(--muted)]">
        Status resmi memerlukan verifikasi administrator dan afiliasi organisasi
        pemilik.
      </p>
      <Button type="submit" disabled={m.isPending}>
        {initial ? "Simpan komunitas" : "Buat komunitas"}
      </Button>
    </form>
  );
}
export function Communities() {
  const [create, setCreate] = useState(false);
  const router = useRouter();
  const q = useInfiniteQuery({
    queryKey: ["communities"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const r = await api<{ data: unknown[]; next_cursor: string | null }>(
        `communities${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      );
      return { ...r, data: r.data.map((c) => communitySchema.parse(c)) };
    },
    getNextPageParam: (p) => p.next_cursor,
  });
  return (
    <>
      <header className="border-b border-[var(--border)] p-6">
        <h1 className="text-xl font-semibold">Temukan lingkaranmu.</h1>
        <p className="my-3 text-sm text-[var(--muted)]">
          Dari fakultas sampai hobi yang mempertemukanmu.
        </p>
        <Button variant="outline" onClick={() => setCreate(!create)}>
          {create ? "Tutup formulir" : "Komunitas baru"}
        </Button>
      </header>
      {create && (
        <CommunityForm onDone={(id) => router.push(`/communities/${id}`)} />
      )}
      <div className="divide-y divide-[var(--border)]">
        {q.data?.pages
          .flatMap((p) => p.data)
          .map((c) => (
            <Link
              className="block p-6"
              key={c.id}
              href={`/communities/${c.id}`}
            >
              <h2 className="font-semibold">{c.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                {c.description}
              </p>
              <p className="mt-3 text-xs text-[var(--muted)]">
                {c.members_count} anggota ·{" "}
                {c.visibility === "private" ? "Privat" : "Terbuka"}
                {c.organization_verified ? " · Organisasi terverifikasi" : ""}
              </p>
            </Link>
          ))}
      </div>
      {q.isError && (
        <p role="alert" className="p-6">
          Komunitas belum dapat dimuat.
        </p>
      )}
      {q.hasNextPage && (
        <Button
          onClick={() => q.fetchNextPage()}
          disabled={q.isFetchingNextPage}
        >
          Komunitas lainnya
        </Button>
      )}
    </>
  );
}
type CommunityMember = {
  id: number;
  name: string;
  username: string;
  pivot: { role: string; state: string };
};
export function CommunityView({ id }: { id: number }) {
  const toast = useToast();
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  const q = useQuery({
    queryKey: ["community", id],
    queryFn: async () =>
      communitySchema.parse(
        (await api<{ data: unknown }>(`communities/${id}`)).data,
      ),
  });
  const c = q.data;
  const manage =
    c?.membership?.state === "active" &&
    ["owner", "moderator"].includes(c.membership.role);
  const members = useInfiniteQuery({
    queryKey: ["community-members", id],
    enabled: !!manage && edit,
    refetchInterval: edit ? 15000 : false,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<{ data: CommunityMember[]; next_cursor: string | null }>(
        `communities/${id}/members${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    getNextPageParam: (p) => p.next_cursor,
  });
  const m = useMutation({
    mutationFn: ({
      path,
      method,
      body,
    }: {
      path: string;
      method: string;
      body?: unknown;
    }) => api(path, { method, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: () => {
      q.refetch();
      members.refetch();
      toast("Komunitas diperbarui.");
    },
    onError: (e) => toast(e.message),
  });
  if (!c)
    return (
      <p className="p-6" role={q.isError ? "alert" : "status"}>
        {q.isError ? "Komunitas tidak tersedia." : "Memuat komunitas…"}
      </p>
    );
  return (
    <>
      <header className="border-b border-[var(--border)] p-6">
        <Link href="/communities" className="text-xs text-[var(--muted)]">
          ← Komunitas kampus
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">{c.name}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">
          {c.description}
        </p>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {c.members_count} anggota ·{" "}
          {c.visibility === "private" ? "Privat" : "Terbuka"}
        </p>
        {c.rules && (
          <details className="mt-4 text-sm">
            <summary>Aturan komunitas</summary>
            <p className="mt-2 whitespace-pre-wrap leading-6">{c.rules}</p>
          </details>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {c.membership?.role !== "owner" && (
            <Button
              disabled={m.isPending}
              variant="outline"
              onClick={() =>
                m.mutate({
                  path: `communities/${id}/membership`,
                  method: c.membership ? "DELETE" : "PUT",
                })
              }
            >
              {c.membership?.state === "pending"
                ? "Batalkan permintaan"
                : c.membership
                  ? "Keluar komunitas"
                  : "Bergabung"}
            </Button>
          )}
          {manage && (
            <Button variant="outline" onClick={() => setEdit(!edit)}>
              Kelola komunitas
            </Button>
          )}
          {c.membership?.role === "owner" && (
            <Button variant="ghost" onClick={() => setRemove(true)}>
              Hapus komunitas
            </Button>
          )}
        </div>
      </header>
      {edit && (
        <>
          <CommunityForm
            initial={c}
            onDone={() => {
              q.refetch();
              setEdit(false);
            }}
          />
          <section className="border-t border-[var(--border)] p-6">
            <h2 className="font-semibold">Anggota & permintaan</h2>
            {members.data?.pages
              .flatMap((p) => p.data)
              .map((u) => (
                <div
                  key={u.id}
                  className="mt-4 flex flex-wrap items-center gap-3 text-sm"
                >
                  <Link href={`/u/${u.username}`}>{u.name}</Link>
                  <span className="text-xs text-[var(--muted)]">
                    {u.pivot.state} · {u.pivot.role}
                  </span>
                  {u.pivot.role !== "owner" && (
                    <>
                      {u.pivot.state === "pending" && (
                        <Button
                          variant="outline"
                          disabled={m.isPending}
                          onClick={() =>
                            m.mutate({
                              path: `communities/${id}/members/${u.id}`,
                              method: "PATCH",
                              body: { action: "accept" },
                            })
                          }
                        >
                          Terima
                        </Button>
                      )}
                      {c.membership?.role === "owner" &&
                        u.pivot.state === "active" && (
                          <Button
                            variant="ghost"
                            disabled={m.isPending}
                            onClick={() =>
                              m.mutate({
                                path: `communities/${id}/members/${u.id}`,
                                method: "PATCH",
                                body: {
                                  action:
                                    u.pivot.role === "moderator"
                                      ? "demote"
                                      : "promote",
                                },
                              })
                            }
                          >
                            {u.pivot.role === "moderator"
                              ? "Jadikan anggota"
                              : "Jadikan moderator"}
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        disabled={m.isPending}
                        onClick={() =>
                          m.mutate({
                            path: `communities/${id}/members/${u.id}`,
                            method: "PATCH",
                            body: { action: "remove" },
                          })
                        }
                      >
                        Keluarkan
                      </Button>
                    </>
                  )}
                </div>
              ))}
            {members.hasNextPage && (
              <Button onClick={() => members.fetchNextPage()}>
                Anggota lainnya
              </Button>
            )}
          </section>
        </>
      )}
      {c.membership?.state === "active" && (
        <div className="border-b border-[var(--border)] px-6 py-4">
          <Composer communityId={id} />
        </div>
      )}
      {c.visibility === "campus" || c.membership?.state === "active" ? (
        <Feed communityId={id} />
      ) : (
        <p className="p-6 text-sm text-[var(--muted)]">
          Cerita hanya tersedia untuk anggota yang disetujui.
        </p>
      )}
      <ConfirmDialog
        open={remove}
        onOpenChange={setRemove}
        title="Hapus komunitas?"
        description="Komunitas, cerita dan acara di dalamnya tidak lagi dapat diakses."
      >
        <Button
          variant="danger"
          onClick={async () => {
            try {
              await api(`communities/${id}`, { method: "DELETE" });
              router.replace("/communities");
            } catch (e) {
              toast(e instanceof Error ? e.message : "Belum berhasil.");
            }
          }}
        >
          Hapus komunitas
        </Button>
      </ConfirmDialog>
    </>
  );
}
export function EventForm({
  initial,
  onDone,
}: {
  initial?: CampusEvent;
  onDone: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [start, setStart] = useState(
    initial
      ? new Date(
          new Date(initial.starts_at).getTime() -
            new Date(initial.starts_at).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : "",
  );
  const [end, setEnd] = useState(
    initial
      ? new Date(
          new Date(initial.ends_at).getTime() -
            new Date(initial.ends_at).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : "",
  );
  const [community, setCommunity] = useState(
    initial?.community_id?.toString() ?? "",
  );
  const spaces = useInfiniteQuery({
    queryKey: ["managed-communities"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const r = await api<{ data: unknown[]; next_cursor: string | null }>(
        `communities?managed=1${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
      );
      return { ...r, data: r.data.map((c) => communitySchema.parse(c)) };
    },
    getNextPageParam: (p) => p.next_cursor,
  });
  const m = useMutation({
    mutationFn: () =>
      api(initial ? `events/${initial.id}` : "events", {
        method: initial ? "PATCH" : "POST",
        body: JSON.stringify({
          title,
          description,
          location,
          starts_at: new Date(start).toISOString(),
          ends_at: new Date(end).toISOString(),
          community_id: community ? Number(community) : null,
        }),
      }),
    onSuccess: onDone,
    onError: (e) => toast(e.message),
  });
  return (
    <form
      className="space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <label className="block text-sm">
        Judul acara
        <input
          className="input mt-2 w-full"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Deskripsi acara
        <textarea
          className="input mt-2 w-full"
          required
          maxLength={3000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Lokasi
        <input
          className="input mt-2 w-full"
          required
          maxLength={200}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Mulai
        <input
          type="datetime-local"
          className="input mt-2 w-full"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Selesai
        <input
          type="datetime-local"
          className="input mt-2 w-full"
          required
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Komunitas penyelenggara (opsional)
        <select
          className="input mt-2 w-full"
          value={community}
          onChange={(e) => setCommunity(e.target.value)}
        >
          <option value="">Acara kampus</option>
          {spaces.data?.pages
            .flatMap((p) => p.data)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </label>
      {spaces.hasNextPage && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => spaces.fetchNextPage()}
        >
          Muat komunitas lainnya
        </Button>
      )}
      <p className="text-xs text-[var(--muted)]">
        Acara komunitas hanya dapat dibuat oleh pengelola. Waktu mengikuti zona
        waktu perangkatmu.
      </p>
      <Button disabled={m.isPending} type="submit">
        Simpan acara
      </Button>
    </form>
  );
}
function EventCard({
  event: e,
  onUpdate,
}: {
  event: CampusEvent;
  onUpdate: () => void;
}) {
  const { data: me } = useMe();
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  const m = useMutation({
    mutationFn: ({ method, state }: { method: string; state?: string }) =>
      api(`events/${e.id}/rsvp`, {
        method,
        body: state ? JSON.stringify({ state }) : undefined,
      }),
    onSuccess: onUpdate,
    onError: (e) => toast(e.message),
  });
  return (
    <article className="border-b border-[var(--border)] p-6">
      <p className="text-xs text-[var(--muted)]">
        {new Date(e.starts_at).toLocaleString("id-ID")}
      </p>
      <h2 className="mt-3 text-lg font-semibold">{e.title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {e.location} · {e.going_count} akan hadir
      </p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7">
        {e.description}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={m.isPending}
          onClick={() =>
            m.mutate({
              method: e.rsvp === "going" ? "DELETE" : "PUT",
              state: "going",
            })
          }
        >
          {e.rsvp === "going" ? "Batalkan hadir" : "Saya hadir"}
        </Button>
        <Button
          variant="ghost"
          disabled={m.isPending}
          onClick={() =>
            m.mutate({
              method: e.rsvp === "interested" ? "DELETE" : "PUT",
              state: "interested",
            })
          }
        >
          {e.rsvp === "interested" ? "Batalkan tertarik" : "Tertarik"}
        </Button>
        {me?.id === e.user_id && (
          <>
            <Button variant="ghost" onClick={() => setEdit(!edit)}>
              Ubah acara
            </Button>
            <Button variant="ghost" onClick={() => setRemove(true)}>
              Hapus acara
            </Button>
          </>
        )}
      </div>
      {edit && (
        <EventForm
          initial={e}
          onDone={() => {
            setEdit(false);
            onUpdate();
          }}
        />
      )}
      <ConfirmDialog
        open={remove}
        onOpenChange={setRemove}
        title="Hapus acara?"
        description="Acara dan RSVP tidak lagi ditampilkan."
      >
        <Button
          variant="danger"
          onClick={async () => {
            try {
              await api(`events/${e.id}`, { method: "DELETE" });
              setRemove(false);
              onUpdate();
            } catch (e) {
              toast(e instanceof Error ? e.message : "Belum berhasil.");
            }
          }}
        >
          Hapus acara
        </Button>
      </ConfirmDialog>
    </article>
  );
}
export function Events() {
  const [create, setCreate] = useState(false);
  const q = useInfiniteQuery({
    queryKey: ["events"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const r = await api<{ data: unknown[]; next_cursor: string | null }>(
        `events${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      );
      return { ...r, data: r.data.map((e) => eventSchema.parse(e)) };
    },
    getNextPageParam: (p) => p.next_cursor,
  });
  return (
    <>
      <header className="border-b border-[var(--border)] p-6">
        <h1 className="text-xl font-semibold">Agenda kampus.</h1>
        <p className="my-3 text-sm text-[var(--muted)]">
          Percakapan yang berlanjut di dunia nyata.
        </p>
        <Button variant="outline" onClick={() => setCreate(!create)}>
          {create ? "Tutup formulir" : "Acara baru"}
        </Button>
      </header>
      {create && (
        <EventForm
          onDone={() => {
            setCreate(false);
            q.refetch();
          }}
        />
      )}
      {q.data?.pages
        .flatMap((p) => p.data)
        .map((e) => (
          <EventCard key={e.id} event={e} onUpdate={() => q.refetch()} />
        ))}
      {q.isError && (
        <p role="alert" className="p-6">
          Acara belum dapat dimuat.
        </p>
      )}
      {q.data && !q.data.pages[0].data.length && (
        <p className="p-6 text-sm text-[var(--muted)]">
          Belum ada acara mendatang.
        </p>
      )}
      {q.hasNextPage && (
        <Button
          onClick={() => q.fetchNextPage()}
          disabled={q.isFetchingNextPage}
        >
          Acara lainnya
        </Button>
      )}
    </>
  );
}
