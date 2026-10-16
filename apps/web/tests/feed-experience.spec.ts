import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { waitForAnimations } from "./ui-ready";

// Presentation and failure-state fixtures only; real API coverage remains in social.spec.ts.
const user = {
  id: 901,
  name: "Alya Putri",
  username: "alya_pengujian",
  verified: true,
  email_verified: true,
  verification_state: "approved",
  onboarded: true,
  bio: null,
  location: null,
  avatar_url: null,
  cover_url: null,
  links: [],
  interests: [],
  academic_visible: true,
  private_account: false,
  institution: {
    id: 1,
    name: "UIN Sultan Syarif Kasim Riau",
    slug: "uin-suska-riau",
  },
  faculty: null,
  department: "Sistem Informasi",
  cohort: 2024,
  affiliation: null,
  can_review_verifications: false,
  can_moderate: false,
};
const post = {
  id: 901,
  body: "Ada yang lagi mengerjakan proyek akhir? Yuk, saling berbagi ide dan referensi di sini.",
  visibility: "campus",
  parent_id: null,
  root_id: null,
  depth: 0,
  quote_id: null,
  created_at: "2026-10-15T10:00:00Z",
  edited_at: null,
  author: {
    id: 901,
    name: "Alya Putri",
    username: "alya_pengujian",
    verified: true,
    avatar_url: null,
    department: "Sistem Informasi",
  },
  media: [],
  quote: null,
  likes_count: 12,
  replies_count: 3,
  reposts_count: 2,
  liked: false,
  reposted: false,
  bookmarked: false,
  can_edit: true,
};
const posts = [
  post,
  {
    ...post,
    id: 902,
    body: "Sore ini kampus rasanya lebih tenang. Semoga apa pun yang sedang kamu usahakan diberi jalan.",
    author: {
      ...post.author,
      id: 902,
      name: "Raka Pratama",
      username: "raka_pengujian",
      department: "Teknik Informatika",
    },
  },
  {
    ...post,
    id: 903,
    body: "Satu hal kecil yang bikin harimu lebih baik hari ini?",
    author: {
      ...post.author,
      id: 903,
      name: "Nadia Rahma",
      username: "nadia_pengujian",
      department: null,
    },
  },
];

async function fixtures(page: Page) {
  let fixtureRead = false;
  await page.route("**/sanctum/csrf-cookie", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/me"))
      return route.fulfill({ json: { data: user } });
    if (url.pathname.endsWith("/realtime"))
      return route.fulfill({ json: { data: { enabled: false } } });
    if (url.pathname.endsWith("/pulse"))
      return route.fulfill({ json: { data: {
        topics: [{ name: "proyekakhir", posts_count: 12 }],
        posts, explanation: "Cerita terbaru dan interaksi dari kampusmu.",
      } } });
    if (url.pathname.endsWith("/search/posts"))
      return route.fulfill({ json: { data: [post], meta: { next_cursor: null, has_more: false, feed: "search" } } });
    if (url.pathname.endsWith("/people"))
      return route.fulfill({ json: { data: [], meta: { next_cursor: null, has_more: false } } });
    if (url.pathname.endsWith("/communities") || url.pathname.endsWith("/events"))
      return route.fulfill({ json: { data: [], next_cursor: null } });
    if (url.pathname.endsWith("/auth/sessions"))
      return route.fulfill({ json: { data: [] } });
    if (url.pathname.endsWith("/notifications/read")) { fixtureRead = true; return route.fulfill({ status: 204 }); }
    if (url.pathname.endsWith("/notifications"))
      return route.fulfill({ json: { data: [{ id: "11111111-1111-4111-8111-111111111111", kind: "messages", actor: { id: 902, name: "Raka Pratama", username: "raka_pengujian" }, post_id: null, conversation_id: 42, read_at: fixtureRead ? "2026-10-16T00:00:00Z" : null, created_at: "2026-10-15T10:00:00Z" }], next_cursor: null, unread_count: fixtureRead ? 0 : 1 } });
    if (url.pathname.endsWith("/feed"))
      return route.fulfill({
        json: {
          data: url.searchParams.has("user_id")
            ? posts.filter(
                (post) =>
                  post.author.id === Number(url.searchParams.get("user_id")),
              )
            : posts,
          meta: {
            next_cursor: null,
            has_more: false,
            feed: url.searchParams.get("feed"),
          },
        },
      });
    if (url.pathname.includes("/relationships/"))
      return route.fulfill({
        json: {
          data: {
            followers_count: 12,
            following_count: 24,
            follow_state: null,
            muted: false,
          },
        },
      });
    return route.fulfill({
      status: 404,
      json: { message: "Unconfigured presentation fixture" },
    });
  });
}

test("text drafts survive reload, retain audience and are removed on discard or successful submission", async ({ page }) => {
  await fixtures(page);
  let unloadPrompts = 0;
  page.on("dialog", (dialog) => { if (dialog.type() === "beforeunload") unloadPrompts++; return dialog.accept(); });
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  let composer = page.getByRole("dialog", { name: "Cerita baru", exact: true });
  await composer.getByLabel("Tulis cerita", { exact: true }).fill("Tulisan yang akan saya lanjutkan nanti.");
  await composer.getByRole("button", { name: "Visibilitas cerita" }).click();
  await page.getByRole("menuitemradio", { name: "Hanya pengikut", exact: true }).click();
  await expect(composer.getByRole("status")).toContainText("Draf teks tersimpan");
  await page.reload();
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  composer = page.getByRole("dialog", { name: "Cerita baru", exact: true });
  await expect(composer.getByLabel("Tulis cerita", { exact: true })).toHaveValue("Tulisan yang akan saya lanjutkan nanti.");
  await expect(composer.getByRole("button", { name: "Visibilitas cerita" })).toContainText("Pengikut");
  await expect(composer.getByRole("status")).toContainText("dipulihkan");
  expect(unloadPrompts).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.resolve("../../docs/testing/screenshots/draft-recovery-mobile.png"), animations: "disabled" });
  await waitForAnimations(page);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await composer.getByRole("button", { name: "Batal", exact: true }).click();
  await page.getByRole("button", { name: "Simpan teks dan tutup", exact: true }).click();
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  await expect(composer.getByLabel("Tulis cerita", { exact: true })).toHaveValue("Tulisan yang akan saya lanjutkan nanti.");
  await composer.getByRole("button", { name: "Batal", exact: true }).click();
  await page.getByRole("button", { name: "Buang draf", exact: true }).click();
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  await expect(composer.getByLabel("Tulis cerita", { exact: true })).toHaveValue("");
  await composer.getByLabel("Tulis cerita", { exact: true }).fill("Sekarang siap dikirim.");
  await page.route("**/api/v1/posts", (route) => route.fulfill({ status: 201, json: { data: post } }));
  await composer.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(composer).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("simeyo:draft:901:new"))).toBeNull();
});

test("drafts isolate accounts and reply contexts, ignore expired data and tolerate blocked storage", async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => {
    localStorage.setItem("simeyo:draft:902:new", JSON.stringify({ body: "Draf akun lain", visibility: "campus", savedAt: Date.now() }));
    localStorage.setItem("simeyo:draft:901:reply:901", JSON.stringify({ body: "Draf balasan", visibility: "followers", savedAt: Date.now() }));
    localStorage.setItem("simeyo:draft:901:new", JSON.stringify({ body: "Draf kedaluwarsa", visibility: "campus", savedAt: Date.now() - 8 * 86400000 }));
  });
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const composer = page.getByRole("dialog", { name: "Cerita baru", exact: true });
  await expect(composer.getByLabel("Tulis cerita", { exact: true })).toHaveValue("");
  await composer.getByRole("button", { name: "Batal", exact: true }).click();
  await page.route("**/api/v1/posts/901", (route) => route.fulfill({ json: { data: post } }));
  await page.goto("/thread/901");
  await expect(page.getByLabel("Tulis balasan", { exact: true })).toHaveValue("Draf balasan");
  await page.getByRole("link", { name: "Kembali ke beranda", exact: true }).click();
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  await expect(composer.getByLabel("Tulis cerita", { exact: true })).toHaveValue("");
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); }; });
  await composer.getByLabel("Tulis cerita", { exact: true }).fill("Tetap bisa menulis.");
  await expect(composer.getByRole("status")).toContainText("belum tersimpan");
  await expect(composer.getByRole("button", { name: "Bagikan", exact: true })).toBeEnabled();
  await composer.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Simpan teks dan tutup", exact: true })).toBeDisabled();
});

test("feed announces new stories without replacing reading content until requested", async ({ page }) => {
  await fixtures(page);
  await page.clock.install();
  let newer = false;
  await page.route("**/api/v1/feed?**", (route) => route.fulfill({ json: { data: newer ? [{ ...post, id: 999, body: "Cerita baru dari kampus" }, ...posts] : posts, meta: { next_cursor: null, has_more: false, feed: "for-you" } } }));
  await page.goto("/home");
  await expect(page.locator("article[data-post-id]")).toHaveCount(3);
  await page.clock.runFor(1000);
  newer = true;
  await page.clock.fastForward(61000);
  const refresh = page.getByRole("button", { name: "Lihat cerita baru", exact: true });
  await expect(refresh).toBeVisible();
  await expect(page.locator('article[data-post-id="999"]')).toHaveCount(0);
  await page.screenshot({ path: path.resolve("../../docs/testing/screenshots/feed-new-stories.png"), animations: "disabled" });
  await refresh.click();
  await expect(page.locator('article[data-post-id="999"]')).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(navigator, "onLine", { configurable: true, value: false }); window.dispatchEvent(new Event("offline")); });
  await expect(page.getByText("Koneksi terputus.", { exact: false })).toBeVisible();
  await expect(page.locator("article[data-post-id]")).toHaveCount(4);
});

test("restored text-only sends retain retry identity and logout clears local drafts", async ({ page }) => {
  await fixtures(page);
  page.on("dialog", (dialog) => dialog.accept());
  const identities: string[] = [];
  await page.route("**/api/v1/posts", (route) => {
    identities.push(route.request().postDataJSON().client_id);
    return route.fulfill({ status: identities.length === 1 ? 503 : 201, json: identities.length === 1 ? { message: "Response unavailable" } : { data: post } });
  });
  await page.goto("/compose");
  await page.getByLabel("Tulis cerita", { exact: true }).fill("Jangan kirim dua kali.");
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Response unavailable" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Tulis cerita", { exact: true })).toHaveValue("Jangan kirim dua kali.");
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(page.getByLabel("Tulis cerita", { exact: true })).toHaveValue("");
  expect(identities).toHaveLength(2);
  expect(identities[0]).toBe(identities[1]);
  await page.getByLabel("Tulis cerita", { exact: true }).fill("Draf sebelum logout.");
  await page.route("**/api/v1/auth/logout", (route) => route.fulfill({ status: 204 }));
  await page.getByRole("button", { name: "Menu akun", exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("menuitem", { name: "Keluar", exact: true }).click();
  await page.getByRole("dialog", { name: "Keluar dari Simeyo?", exact: true }).getByRole("button", { name: "Keluar", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("simeyo:draft:")))).toEqual([]);
});

test("returning from a thread keeps the selected feed, cached stories and reading position", async ({ page }) => {
  await fixtures(page);
  await page.clock.install();
  const many = Array.from({ length: 20 }, (_, index) => ({ ...post, id: 1000 + index }));
  let requests = 0;
  await page.route("**/api/v1/feed?**", (route) => { requests++; return route.fulfill({ json: { data: many, meta: { next_cursor: null, has_more: false, feed: "following" } } }); });
  await page.route("**/api/v1/posts/1010", (route) => route.fulfill({ json: { data: many[10] } }));
  await page.goto("/home");
  await page.getByRole("tab", { name: "Mengikuti", exact: true }).click();
  const reply = page.locator('article[data-post-id="1010"]').getByRole("link", { name: "Balas cerita", exact: true });
  await reply.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await reply.click();
  await expect(page).toHaveURL(/\/thread\/1010$/);
  await expect(page.getByLabel("Tulis balasan", { exact: true })).toBeVisible();
  await page.clock.fastForward(16000);
  const requestsBeforeBack = requests;
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Mengikuti", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before - 100);
  await expect(page.locator("article[data-post-id]")).toHaveCount(20);
  await page.clock.runFor(250);
  expect(requests).toBe(requestsBeforeBack);
});

test("cached campus update checks never become a new-story notice inside replies", async ({ page }) => {
  await fixtures(page);
  let campusRequests = 0;
  await page.route("**/api/v1/feed?**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("feed") === "campus" && !params.has("parent_id")) campusRequests++;
    return route.fulfill({ json: { data: params.has("parent_id") ? [] : posts, meta: { next_cursor: null, has_more: false, feed: params.get("feed") } } });
  });
  await page.route("**/api/v1/posts/901", (route) => route.fulfill({ json: { data: post } }));
  await page.goto("/home");
  await page.getByRole("tab", { name: "Kampus", exact: true }).click();
  await expect.poll(() => campusRequests).toBeGreaterThanOrEqual(2);
  await page.locator('article[data-post-id="901"]').getByRole("link", { name: "Balas cerita", exact: true }).click();
  await expect(page.getByText("Percakapan masih terbuka.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lihat cerita baru", exact: true })).toHaveCount(0);
});

test("install offer appears only when available, supports postponing and invokes the native prompt", async ({ page }) => {
  await fixtures(page);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Beranda", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const offer = page.getByRole("dialog", { name: "Pasang Simeyo", exact: true });
  await expect(offer).toHaveCount(0);
  async function available() {
    await page.evaluate(() => {
      const event = new Event("beforeinstallprompt");
      Object.defineProperties(event, {
        prompt: { value: async () => { document.documentElement.dataset.installPrompted = "yes"; } },
        userChoice: { value: Promise.resolve({ outcome: "accepted" }) },
      });
      window.dispatchEvent(event);
    });
  }
  await available();
  await expect(offer).toBeVisible();
  await expect(offer).toHaveCSS("animation-name", "none");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: path.resolve("../../docs/testing/screenshots/pwa-install-offer.png"), animations: "disabled" });
  await offer.getByRole("button", { name: "Nanti saja", exact: true }).click();
  await page.reload();
  await available();
  await expect(offer).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem("simeyo-install-dismissed"));
  await available();
  await offer.getByRole("button", { name: "Pasang", exact: true }).click();
  await expect(offer).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.installPrompted)).toBe("yes");
});

test("messages show sent and read ticks and only acknowledge the visible incoming cursor", async ({ page }) => {
  await fixtures(page);
  await page.route("**/api/v1/conversations", (route) => route.fulfill({ json: { data: [{ id: 42, user: { id: 902, name: "Raka Pratama", username: "raka_pengujian" }, unread_count: 0 }], next_cursor: null } }));
  await page.addInitScript(() => Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }));
  let recipientRead = 0;
  const acknowledged: number[] = [];
  await page.route("**/api/v1/conversations/42/read", (route) => { acknowledged.push(route.request().postDataJSON().message_id); return route.fulfill({ status: 204 }); });
  await page.route("**/api/v1/conversations/42/messages*", (route) => route.fulfill({ json: { data: [{ id: 1, conversation_id: 42, sender_id: user.id, client_id: "11111111-1111-4111-8111-111111111111", body: "Pesanku", created_at: "2026-10-16T00:00:00Z" }, { id: 2, conversation_id: 42, sender_id: 902, client_id: "22222222-2222-4222-8222-222222222222", body: "Balasan teman", created_at: "2026-10-16T00:01:00Z" }], user: { id: 902, name: "Raka Pratama", username: "raka_pengujian" }, next_cursor: null, can_send: true, recipient_read_message_id: recipientRead } }));
  await page.goto("/messages/42");
  await expect(page.getByLabel("Terkirim", { exact: true })).toBeVisible();
  expect(acknowledged).toEqual([]);
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => acknowledged.includes(2)).toBe(true);
  recipientRead = 1;
  await page.reload();
  await expect(page.getByLabel("Dibaca", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Terkirim", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: path.resolve("../../docs/testing/screenshots/message-read-receipt.png"), animations: "disabled" });
});

test("gallery uploads accept six attachments including a file above the previous size quota", async ({ page }) => {
  await fixtures(page);
  let uploads = 0;
  await page.route("**/api/v1/media/posts", (route) => route.fulfill({ status: 201, json: { data: { id: ++uploads, url: "/gallery-test.png", width: 1, height: 1 } } }));
  await page.route("**/gallery-test.png", (route) => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") }));
  let attachments: number[] = [];
  await page.route("**/api/v1/posts", (route) => { attachments = route.request().postDataJSON().media_ids; return route.fulfill({ status: 201, json: { data: post } }); });
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cerita baru", exact: true });
  await dialog.getByLabel("Lampirkan gambar").setInputFiles(Array.from({ length: 6 }, (_, index) => ({ name: `foto-${index}.png`, mimeType: "image/png", buffer: Buffer.alloc(index === 0 ? 5 * 1024 * 1024 : 1) })));
  await expect(dialog.getByAltText("Pratinjau lampiran")).toHaveCount(6);
  await dialog.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(attachments).toHaveLength(6);
  await page.route("**/api/v1/feed?**", (route) => route.fulfill({ json: { data: [{ ...post, media: Array.from({ length: 6 }, (_, index) => ({ id: index + 1, url: "/gallery-test.png", width: 600, height: 400 })) }], meta: { next_cursor: null, has_more: false, feed: "campus" } } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const gallery = page.getByRole("region", { name: "Galeri gambar cerita", exact: true });
  await expect(gallery.getByRole("button", { name: "Lihat gambar cerita", exact: true })).toHaveCount(6);
  expect(await gallery.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await gallery.getByRole("button").first().click();
  const viewer = page.getByRole("dialog", { name: "Gambar cerita · 1 dari 6", exact: true });
  await expect(viewer.getByRole("button", { name: "Gambar sebelumnya" })).toBeDisabled();
  await viewer.getByRole("button", { name: "Gambar berikutnya" }).click();
  await expect(page.getByRole("status").filter({ hasText: "2 / 6" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByAltText("Gambar cerita diperbesar 3 dari 6")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByAltText("Gambar cerita diperbesar 2 dari 6")).toBeVisible();
  await page.screenshot({ path: path.resolve("../../docs/testing/screenshots/gallery-viewer-mobile.png"), animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(gallery.getByRole("button").first()).toBeFocused();
  await page.setViewportSize({ width: 320, height: 780 });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await gallery.getByRole("button").last().click();
  await expect(page.getByRole("button", { name: "Gambar berikutnya" })).toBeDisabled();
  await waitForAnimations(page);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  expect(await page.getByRole("dialog").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.keyboard.press("Escape");
});

test("settings groups account and campus, hides completed verification steps and keeps device controls usable", async ({ page }) => {
  await fixtures(page);
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: { data: { ...user, email: "alya_pengujian@students.uin-suska.ac.id" } } }));
  let revoked = false;
  await page.route("**/api/v1/auth/sessions", (route) => route.fulfill({ json: { data: revoked ? [] : [{ id: "fixture-device", user_agent: "Browser pengujian", last_activity: 1792108800, current: false }] } }));
  await page.route("**/api/v1/auth/sessions/fixture-device", (route) => { revoked = true; return route.fulfill({ status: 204 }); });
  await page.goto("/verification");
  await expect(page).toHaveURL(/\/settings#account-campus$/);
  await expect(page.getByText("Kampus terverifikasi", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Periksa status", exact: true })).toHaveCount(0);
  await page.goto("/settings");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("link", { name: "Ubah kata sandi", exact: true })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.resolve(`../../docs/testing/screenshots/settings-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
    }
  }
  await page.locator("summary").filter({ hasText: "Sesi aktif" }).click();
  await page.getByRole("button", { name: "Akhiri sesi", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Akhiri sesi", exact: true }).click();
  await expect(page.getByText("Tidak ada sesi web tersimpan.", { exact: true })).toBeVisible();
  expect(revoked).toBe(true);
  await page.locator("summary").filter({ hasText: "Pasang aplikasi" }).click();
  await expect(page.getByRole("heading", { name: "Aplikasi web", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Menu akun" }).filter({ visible: true }).click();
  await expect(page.getByRole("menuitem", { name: "Status verifikasi", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.evaluate(() => document.documentElement.dataset.theme = "light");
  await page.getByRole("button", { name: "Menu akun" }).filter({ visible: true }).click();
  await page.getByRole("menuitem", { name: "Keluar", exact: true }).click();
  await waitForAnimations(page);
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
});

test("pending campus requests remain available in settings and retry failed status loading", async ({ page }) => {
  await fixtures(page);
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: { data: { ...user, verified: false, verification_state: "pending", email: "alya_pengujian@students.uin-suska.ac.id" } } }));
  let fail = true;
  let sent = false;
  await page.route("**/api/v1/verification", (route) => {
    if (route.request().method() === "POST") { sent = true; return route.fulfill({ status: 201, json: { data: { state: "pending" } } }); }
    return fail ? route.fulfill({ status: 503, json: { message: "Simulated failure" } }) : route.fulfill({ json: { data: sent ? { state: "pending" } : null } });
  });
  await page.goto("/settings#account-campus");
  await expect(page.getByRole("alert").filter({ hasText: "Status pengajuan belum dapat dimuat" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirim pengajuan", exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole("alert").getByRole("button", { name: "Coba lagi", exact: true }).click();
  await page.getByLabel("Jelaskan afiliasimu").fill("Saya anggota kampus pengujian fiktif untuk uji alur pengaturan.");
  await page.getByRole("button", { name: "Kirim pengajuan", exact: true }).click();
  await expect(page.getByText("Pengajuan sedang ditinjau. Periksa kembali nanti.", { exact: true })).toBeVisible();
  expect(sent).toBe(true);
});

test("messaging supports a split inbox, recipient selection and safe send retry on mobile", async ({ page }) => {
  await fixtures(page);
  const recipient = { ...user, id: 902, name: "Raka Pratama", username: "raka_pengujian" };
  await page.route("**/api/v1/people?*", (route) => route.fulfill({ json: { data: [recipient], meta: { next_cursor: null, has_more: false } } }));
  await page.route("**/api/v1/conversations", (route) => route.fulfill({ json: route.request().method() === "POST" ? { data: { id: 42 } } : { data: [{ id: 42, user: recipient, unread_count: 2, last_message: { sender_id: recipient.id, body: "Boleh, kita lanjutkan di sini.", created_at: "2026-10-15T10:00:00Z" } }], next_cursor: null } }));
  let failSend = true;
  let sent = false;
  await page.route("**/api/v1/conversations/42/messages", async (route) => {
    if (route.request().method() === "POST") {
      if (failSend) { failSend = false; return route.fulfill({ status: 503, json: { message: "Pengiriman gagal." } }); }
      sent = true;
      return route.fulfill({ status: 201, json: { data: {} } });
    }
    return route.fulfill({ json: { data: sent ? [{ id: 1, conversation_id: 42, sender_id: user.id, client_id: "11111111-1111-4111-8111-111111111111", body: "Halo Raka!", created_at: "2026-10-15T10:00:00Z" }] : [], user: recipient, can_send: true, next_cursor: null } });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/messages");
  await expect(page.getByRole("heading", { name: "Percakapan dimulai dari sini" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Raka Pratama/ })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
    await page.screenshot({ path: path.resolve(process.cwd(), `../../docs/testing/screenshots/messages-desktop-${theme}.png`), animations: "disabled" });
  }
  await page.getByLabel("Cari percakapan", { exact: true }).fill("tidak-cocok");
  await expect(page.getByText("Tidak ada percakapan yang cocok.")).toBeVisible();
  await page.getByLabel("Cari percakapan", { exact: true }).fill("");
  await page.getByRole("button", { name: "Pesan baru", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Raka Pratama/ }).click();
  await expect(page).toHaveURL(/messages\/42$/);
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.getByRole("region", { name: "Daftar percakapan" })).not.toBeVisible();
  await page.getByLabel("Tulis pesan", { exact: true }).fill("Halo Raka!");
  await page.getByRole("button", { name: "Kirim pesan", exact: true }).click();
  await expect(page.getByText("Pengiriman gagal.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Tulis pesan", { exact: true })).toHaveValue("Halo Raka!");
  await page.getByRole("button", { name: "Kirim pesan", exact: true }).click();
  await expect(page.getByLabel("Tulis pesan", { exact: true })).toHaveValue("");
  await expect(page.getByRole("log").getByText("Halo Raka!")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.resolve(process.cwd(), "../../docs/testing/screenshots/messages-mobile-dark.png"), animations: "disabled" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: "Semua pesan", exact: true }).click();
  await expect(page.getByLabel("Cari percakapan", { exact: true })).toBeVisible();
});

test("incoming messages respect reading position and inbox shows the latest preview", async ({ page }) => {
  await fixtures(page);
  await page.clock.install();
  const recipient = { id: 902, name: "Raka Pratama", username: "raka_pengujian" };
  let incoming = false;
  await page.route("**/api/v1/conversations", (route) => route.fulfill({ json: { data: [{ id: 42, user: recipient, unread_count: 1, last_message: { sender_id: recipient.id, body: "Pesan terakhir untuk pratinjau", created_at: "2026-10-15T10:00:00Z" } }], next_cursor: null } }));
  await page.route("**/api/v1/conversations/42/messages", (route) => route.fulfill({ json: {
    data: Array.from({ length: incoming ? 26 : 25 }, (_, index) => ({ id: index + 1, conversation_id: 42, sender_id: recipient.id, client_id: "11111111-1111-4111-8111-111111111111", body: `Pesan ${index + 1}: percakapan kampus untuk pengujian posisi baca.`, created_at: "2026-10-15T10:00:00Z" })),
    user: recipient, can_send: true, next_cursor: null,
  } }));
  await page.goto("/messages/42");
  const log = page.getByRole("log", { name: "Riwayat pesan" });
  await expect(log.locator('[data-message-id="25"]')).toBeInViewport();
  await expect(page.getByText("Pesan terakhir untuk pratinjau", { exact: true })).toBeVisible();
  await log.evaluate((element) => { element.scrollTop = 0; element.dispatchEvent(new Event("scroll")); });
  incoming = true;
  await page.clock.fastForward(15_001);
  await expect(page.getByRole("button", { name: "Pesan baru ↓", exact: true })).toBeVisible();
  expect(await log.evaluate((element) => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Pesan baru ↓", exact: true }).click();
  await expect(log.locator('[data-message-id="26"]')).toBeInViewport();
});

test("secondary pages fit mobile and community failures can be retried", async ({ page }) => {
  await fixtures(page);
  let unavailable = true;
  await page.route("**/api/v1/communities", (route) => route.fulfill(unavailable ? { status: 503, json: { message: "Temporary outage" } } : { json: { data: [], next_cursor: null } }));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/communities");
  await expect(page.getByRole("alert").filter({ hasText: "Komunitas belum dapat dimuat" })).toBeVisible();
  unavailable = false;
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(page.getByText("Belum ada komunitas. Mulai lingkaran pertamamu.")).toBeVisible();
  for (const route of ["communities", "events", "notifications", "settings", "profile"]) {
    await page.goto(`/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => document.documentElement.dataset.theme = "dark");
    await page.screenshot({ path: path.resolve(process.cwd(), `../../docs/testing/screenshots/${route}-polish-320.png`), fullPage: true, animations: "disabled" });
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  }
});

test("revoked messaging access hides cached history and composer", async ({ page }) => {
  await fixtures(page);
  await page.clock.install();
  let revoked = false;
  await page.route("**/api/v1/conversations", route => route.fulfill({ json: { data: [], next_cursor: null } }));
  await page.route("**/api/v1/conversations/42/messages", route => route.fulfill(revoked ? { status: 404, json: { message: "Not found" } } : { json: { data: [{ id: 1, conversation_id: 42, sender_id: 902, client_id: "11111111-1111-4111-8111-111111111111", body: "Pesan pribadi tersimpan", created_at: "2026-10-15T10:00:00Z" }], user: { id: 902, name: "Raka Pratama", username: "raka_pengujian" }, can_send: true, next_cursor: null } }));
  await page.goto("/messages/42");
  await expect(page.getByText("Pesan pribadi tersimpan", { exact: true })).toBeVisible();
  revoked = true;
  await page.clock.fastForward(15_001);
  await expect(page.getByRole("alert").filter({ hasText: "Percakapan tidak tersedia" })).toBeVisible();
  await expect(page.getByText("Pesan pribadi tersimpan", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Tulis pesan", { exact: true })).toHaveCount(0);
});

test("mobile chat fits above navigation and campus form controls have consistent styling", async ({ page }) => {
  await fixtures(page);
  await page.route("**/api/v1/conversations", route => route.fulfill({ json: { data: [], next_cursor: null } }));
  await page.route("**/api/v1/conversations/42/messages", route => route.fulfill({ json: { data: [], user: { id: 902, name: "Raka Pratama", username: "raka_pengujian" }, can_send: true, next_cursor: null } }));
  for (const viewport of [{ width: 320, height: 667 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/messages/42");
    await expect(page.getByLabel("Tulis pesan", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tandai dibaca", exact: true })).toHaveCount(0);
    await expect(page.getByText("Belum ada pesan. Mulai percakapan dengan sapaan pertama.")).toBeVisible();
    const send = await page.getByRole("button", { name: "Kirim pesan", exact: true }).boundingBox();
    const navigation = await page.getByRole("navigation", { name: "Navigasi seluler" }).isVisible()
      ? await page.getByRole("navigation", { name: "Navigasi seluler" }).boundingBox() : null;
    expect(send!.y + send!.height).toBeLessThanOrEqual(navigation?.y ?? viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
    if (viewport.width >= 768) await expect(page.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", { name: "Pesan", exact: true })).toHaveAttribute("aria-current", "page");
    await page.screenshot({ path: path.resolve(process.cwd(), `../../docs/testing/screenshots/chat-fit-${viewport.width}.png`), animations: "disabled" });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/communities");
  await page.getByRole("button", { name: "Komunitas baru", exact: true }).click();
  const input = page.getByLabel("Nama komunitas");
  await expect(input).toBeVisible();
  const style = await input.evaluate(element => { const style = getComputedStyle(element); return { border: style.borderTopWidth, radius: style.borderRadius, font: style.fontSize }; });
  expect(style).toEqual({ border: "1px", radius: "12px", font: "16px" });
  await page.screenshot({ path: path.resolve(process.cwd(), "../../docs/testing/screenshots/community-form-mobile.png"), animations: "disabled" });
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cerita baru", exact: true });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBe(0);
  expect(Math.round(bounds!.y + bounds!.height)).toBe(844);
  await expect(dialog.getByRole("button", { name: "Bagikan", exact: true })).toBeVisible();
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 667 }]) {
    await page.setViewportSize(viewport);
    const attach = await dialog.getByRole("button", { name: "Tambah gambar", exact: true }).boundingBox();
    const submit = await dialog.getByRole("button", { name: "Bagikan", exact: true }).boundingBox();
    expect(Math.abs((attach!.y + attach!.height / 2) - (submit!.y + submit!.height / 2))).toBeLessThan(3);
    expect(submit!.x + submit!.width).toBeLessThanOrEqual(viewport.width - 16);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.resolve(process.cwd(), "../../docs/testing/screenshots/composer-mobile-sheet.png"), animations: "disabled" });
});

test("explore stays readable across sizes and supports topic search and people", async ({ page }) => {
  await fixtures(page);
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: "Jelajahi", exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(3);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.getByRole("button", { name: "Komunitas Segera hadir", exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Acara Segera hadir", exact: true })).toBeDisabled();
      await expect(page.getByRole("link", { name: "Permintaan", exact: true })).toBeVisible();
      await page.screenshot({ path: path.resolve(process.cwd(), `../../docs/testing/screenshots/explore-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
    }
  }
  await page.getByRole("button", { name: "#proyekakhir" }).click();
  await expect(page.getByLabel("Cari cerita atau hashtag")).toHaveValue("#proyekakhir");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Hapus pencarian" }).click();
  await expect(page.locator("article")).toHaveCount(3);
  await page.getByRole("button", { name: "Temukan teman", exact: true }).click();
  await expect(page.getByLabel("Cari teman kampus")).toBeVisible();
  await page.getByRole("button", { name: "Cerita kampus", exact: true }).click();
  await expect(page.getByLabel("Cari cerita atau hashtag")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});

test("centered feed, compact composer, keyboard tabs and menus work across sizes and themes", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/home");
  await expect(page.locator("article")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Tulis cerita", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bagikan", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Untukmu", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Mengikuti", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("tabpanel", { name: "Mengikuti" })).toBeVisible();
  await page.getByRole("tab", { name: "Untukmu", exact: true }).click();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 620 : 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      await expect(
        page.getByRole("heading", { name: "Beranda", exact: true }),
      ).toBeVisible();
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: path.resolve(
            `../../docs/testing/screenshots/feed-redesign-${width}-${theme}.png`,
          ),
          fullPage: true,
          animations: "disabled",
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 620 });
  const accountMenu = page
    .getByRole("button", { name: "Menu akun" })
    .filter({ visible: true });
  const box = await accountMenu.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(620);
  expect(box!.y).toBeGreaterThan(540);
  await page
    .getByRole("button", { name: "Menu akun" })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Tersimpan", exact: true }),
  ).toBeVisible();
  const menuBox = await page.getByRole("menu", { name: "Menu akun" }).boundingBox();
  expect(menuBox!.y).toBeGreaterThanOrEqual(0);
  expect(menuBox!.y + menuBox!.height).toBeLessThan(box!.y);
  await page.screenshot({ path: "../../docs/testing/screenshots/sidebar-bottom-menu.png", animations: "disabled" });
  await page.getByRole("menuitem", { name: "Ringkas navigasi", exact: true }).click();
  const sidebar = page.getByRole("complementary", { name: "Navigasi akun", exact: true });
  expect((await sidebar.boundingBox())!.width).toBe(96);
  await accountMenu.click();
  await page.getByRole("menuitem", { name: "Perluas navigasi", exact: true }).click();
  expect((await sidebar.boundingBox())!.width).toBe(240);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test("posting locks the draft while saving and collapses only after success", async ({
  page,
}) => {
  await fixtures(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/posts", async (route) => {
    await pending;
    await route.fulfill({ status: 201, json: { data: post } });
  });
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const composer = page
    .getByRole("dialog")
    .getByLabel("Tulis cerita", { exact: true });
  await composer.fill("Draft yang harus tetap aman saat dikirim.");
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(composer).toBeDisabled();
  await expect(composer).toHaveValue(
    "Draft yang harus tetap aman saat dikirim.",
  );
  release();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tulis cerita", exact: true }),
  ).toBeVisible();
});

test("pagination pauses after a failed page and deduplicates overlapping results on manual retry", async ({
  page,
}) => {
  await fixtures(page);
  let attempts = 0;
  await page.route("**/api/v1/feed?**", (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    if (cursor && ++attempts === 1)
      return route.fulfill({
        status: 503,
        json: { message: "Simulated page failure" },
      });
    return route.fulfill({
      json: {
        data: cursor ? [posts[0], posts[1]] : [posts[0]],
        meta: {
          next_cursor: cursor ? null : "page-two",
          has_more: !cursor,
          feed: "for-you",
        },
      },
    });
  });
  await page.goto("/home");
  const retry = page.getByRole("button", {
    name: "Coba muat berikutnya",
    exact: true,
  });
  await expect(retry).toBeVisible();
  await page.waitForTimeout(750);
  expect(attempts).toBe(1);
  await retry.click();
  await expect(page.locator("article[data-post-id]")).toHaveCount(2);
  expect(attempts).toBe(2);
});

test("a failed post preserves the draft and permits retry", async ({
  page,
}) => {
  await fixtures(page);
  const submissions: { client_id: string; body: string }[] = [];
  await page.route("**/api/v1/posts", (route) => {
    submissions.push(route.request().postDataJSON());
    return route.fulfill({
      status: 503,
      json: { message: "Posting sementara gagal" },
    });
  });
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const composer = page
    .getByRole("dialog")
    .getByLabel("Tulis cerita", { exact: true });
  await composer.fill("Draft ini tidak boleh hilang.");
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Posting sementara gagal" }),
  ).toContainText("Posting sementara gagal");
  await expect(composer).toHaveValue("Draft ini tidak boleh hilang.");
  await expect(composer).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Bagikan", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect.poll(() => submissions.length).toBe(2);
  expect(submissions[0].client_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(submissions[1].client_id).toBe(submissions[0].client_id);
  await expect(composer).toBeEnabled();
  await composer.fill("Draft diubah setelah percobaan gagal.");
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect.poll(() => submissions.length).toBe(3);
  expect(submissions[2].client_id).not.toBe(submissions[0].client_id);
});

test("partial uploads retain successful previews and retry only the remaining image", async ({
  page,
}) => {
  await fixtures(page);
  let attempts = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  await page.route("**/api/v1/media/posts/*", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
  await page.route("**/api/v1/media/posts", async (route) => {
    attempts++;
    if (attempts === 1) await pending;
    if (attempts === 2)
      return route.fulfill({
        status: 503,
        json: { message: "Koneksi upload terputus" },
      });
    return route.fulfill({
      status: 201,
      json: {
        data: {
          id: attempts,
          url: `/api/v1/media/posts/${attempts}`,
          width: 1,
          height: 1,
        },
      },
    });
  });
  let posted: { media_ids: number[]; client_id: string } | null = null;
  await page.route("**/api/v1/posts", (route) => {
    posted = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { data: post } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cerita baru", exact: true });
  await dialog
    .getByLabel("Tulis cerita", { exact: true })
    .fill("Dua foto kampus.");
  await dialog.getByLabel("Lampirkan gambar").setInputFiles([
    { name: "kampus-1.png", mimeType: "image/png", buffer: png },
    { name: "kampus-2.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(dialog.getByRole("status")).toContainText(
    "Mengunggah gambar 1 dari 2",
  );
  await expect(
    dialog.getByLabel("Tulis cerita", { exact: true }),
  ).toBeDisabled();
  release();
  await expect(dialog.getByRole("alert")).toContainText(
    "Koneksi upload terputus",
  );
  await expect(dialog.getByAltText("Pratinjau lampiran")).toHaveCount(1);
  await expect(
    dialog.getByRole("button", { name: "Bagikan", exact: true }),
  ).toBeDisabled();
  await expect(dialog).toContainText("Belum terunggah: kampus-2.png");
  expect(
    await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(true);
  await page.screenshot({
    path: path.resolve(
      "../../docs/testing/screenshots/composer-upload-retry.png",
    ),
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Coba unggah lagi" }).click();
  await expect(dialog.getByAltText("Pratinjau lampiran")).toHaveCount(2);
  expect(attempts).toBe(3);
  await dialog.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(posted!.media_ids).toEqual([1, 3]);
});

test("invalid uploads are rejected locally without losing text and can be replaced", async ({
  page,
}) => {
  await fixtures(page);
  let uploads = 0;
  await page.route("**/api/v1/media/posts", (route) => {
    uploads++;
    return route.fulfill({ status: 500 });
  });
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cerita baru", exact: true });
  await dialog
    .getByLabel("Tulis cerita", { exact: true })
    .fill("Tulisan tetap ada.");
  await dialog
    .getByLabel("Lampirkan gambar")
    .setInputFiles({
      name: "invalid.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg />"),
    });
  await expect(dialog.getByRole("alert")).toContainText("JPG, PNG, atau WebP");
  expect(uploads).toBe(0);
  await expect(dialog.getByLabel("Tulis cerita", { exact: true })).toHaveValue(
    "Tulisan tetap ada.",
  );
  await dialog.getByLabel("Lampirkan gambar").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from("fixture") });
  await expect(dialog.getByRole("button", { name: "Coba unggah lagi" })).toBeVisible();
  expect(uploads).toBe(1);
  await dialog.getByRole("button", { name: "Batalkan lampiran gagal" }).click();
  await expect(dialog.getByRole("button", { name: "Coba unggah lagi" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Bagikan", exact: true })).toBeEnabled();
  await expect(dialog.getByLabel("Tulis cerita", { exact: true })).toHaveValue("Tulisan tetap ada.");
});

test("reply notifications open their thread, mark read and refresh the replies after posting", async ({
  page,
}) => {
  await fixtures(page);
  const notificationId = "11111111-1111-4111-8111-111111111111";
  let read = false;
  let reply: { body: string; parent_id: number; client_id: string } | null =
    null;
  await page.route(
    "**/api/v1/notifications/read",
    (route) => {
      read = true;
      return route.fulfill({ status: 204 });
    },
  );
  await page.route("**/api/v1/notifications", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: notificationId,
            kind: "replies",
            actor: {
              id: 902,
              name: "Raka Pratama",
              username: "raka_pengujian",
            },
            post_id: 901,
            conversation_id: null,
            read_at: read ? "2026-10-16T00:00:00Z" : null,
            created_at: "2026-10-16T00:00:00Z",
          },
        ],
        next_cursor: null,
        unread_count: read ? 0 : 1,
      },
    }),
  );
  await page.route("**/api/v1/posts/901", (route) =>
    route.fulfill({ json: { data: post } }),
  );
  await page.route("**/api/v1/feed?**", (route) =>
    route.fulfill({
      json: {
        data: reply
          ? [{ ...post, id: 904, parent_id: 901, body: reply.body }]
          : [],
        meta: { next_cursor: null, has_more: false, feed: "campus" },
      },
    }),
  );
  await page.route("**/api/v1/posts", (route) => {
    reply = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: { data: { ...post, id: 904, parent_id: 901, body: reply!.body } },
    });
  });
  await page.goto("/notifications");
  await expect.poll(() => read).toBe(true);
  await expect(page.getByText("Belum dibaca", { exact: true })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Raka Pratama membalas ceritamu." })
    .click();
  await expect(page).toHaveURL(/\/thread\/901$/);
  await expect.poll(() => read).toBe(true);
  await page
    .getByLabel("Tulis balasan", { exact: true })
    .fill("Terima kasih, kita bahas di sini.");
  await page.getByRole("button", { name: "Balas", exact: true }).click();
  await expect(page.locator('article[data-post-id="904"]')).toContainText(
    "Terima kasih, kita bahas di sini.",
  );
  expect(reply!.parent_id).toBe(901);
  expect(reply!.client_id).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Tulis balasan", { exact: true })).toHaveValue(
    "",
  );
  await page.goto("/notifications");
  await expect(page.getByText("Belum dibaca", { exact: true })).toHaveCount(0);
});

test("modal keeps a draft until discard is confirmed and profile uses the same composer", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cerita baru", exact: true });
  const input = dialog.getByLabel("Tulis cerita", { exact: true });
  await input.fill("Draf yang sedang dikerjakan.");
  await dialog.getByRole("button", { name: "Batal", exact: true }).click();
  const discard = page.getByRole("dialog", {
    name: "Buang draf?",
    exact: true,
  });
  await discard
    .getByRole("button", { name: "Lanjut menulis", exact: true })
    .click();
  await expect(input).toHaveValue("Draf yang sedang dikerjakan.");
  await page.screenshot({
    path: path.resolve(
      "../../docs/testing/screenshots/feed-composer-modal.png",
    ),
    fullPage: true,
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "Batal", exact: true }).click();
  await discard
    .getByRole("button", { name: "Buang draf", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Profil", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL("/profile");
  await expect(
    page.getByRole("link", { name: "Edit profil", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bagikan profil", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.resolve(
      "../../docs/testing/screenshots/profile-redesign-desktop.png",
    ),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  await expect(dialog).toBeVisible();
});

test("dark focused editor has no native frame and audience menu follows the theme", async ({
  page,
}) => {
  await fixtures(page);
  await page.addInitScript(() => localStorage.setItem("ruang-theme", "dark"));
  await page.goto("/home");
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cerita baru", exact: true });
  const editor = dialog.getByLabel("Tulis cerita", { exact: true });
  await editor.focus();
  expect(
    await editor.evaluate((node) => getComputedStyle(node).outlineStyle),
  ).toBe("none");
  expect(
    await editor.evaluate((node) => getComputedStyle(node).borderTopWidth),
  ).toBe("0px");
  await expect(dialog.locator("select")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Visibilitas cerita", exact: true })
    .click();
  await expect(
    page.getByRole("menuitemradio", { name: "Kampus", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.screenshot({
    path: path.resolve(
      "../../docs/testing/screenshots/composer-dark-audience.png",
    ),
    animations: "disabled",
  });
  await page
    .getByRole("menuitemradio", { name: "Hanya pengikut", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Visibilitas cerita", exact: true }),
  ).toContainText("Pengikut");
  await expect(
    dialog.getByText("Hanya pengikutmu yang dapat melihat cerita ini."),
  ).toBeVisible();
  await editor.focus();
  await page.screenshot({
    path: path.resolve(
      "../../docs/testing/screenshots/composer-dark-focused.png",
    ),
    animations: "disabled",
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
