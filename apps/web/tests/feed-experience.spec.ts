import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

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
  await page.route("**/sanctum/csrf-cookie", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/me"))
      return route.fulfill({ json: { data: user } });
    if (url.pathname.endsWith("/realtime"))
      return route.fulfill({ json: { data: { enabled: false } } });
    if (url.pathname.endsWith("/feed"))
      return route.fulfill({
        json: {
          data: posts,
          meta: {
            next_cursor: null,
            has_more: false,
            feed: url.searchParams.get("feed"),
          },
        },
      });
    return route.fulfill({
      status: 404,
      json: { message: "Unconfigured presentation fixture" },
    });
  });
}

test("centered feed, compact composer, keyboard tabs and menus work across sizes and themes", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/home");
  await expect(page.locator("article")).toHaveCount(3);
  await expect(
    page.getByLabel("Tulis cerita", { exact: true }),
  ).toHaveAttribute("rows", "1");
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
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 620 });
  const accountMenu = page
    .getByRole("button", { name: "Menu akun" })
    .filter({ visible: true });
  const box = await accountMenu.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(620);
  await page
    .getByRole("button", { name: "Menu akun" })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Tersimpan", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
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
  const composer = page.getByLabel("Tulis cerita", { exact: true });
  await composer.fill("Draft yang harus tetap aman saat dikirim.");
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(composer).toBeDisabled();
  await expect(composer).toHaveValue(
    "Draft yang harus tetap aman saat dikirim.",
  );
  release();
  await expect(composer).toBeEnabled();
  await expect(composer).toHaveValue("");
  await expect(composer).toHaveAttribute("rows", "1");
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
  await page.route("**/api/v1/posts", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Posting sementara gagal" },
    }),
  );
  await page.goto("/home");
  const composer = page.getByLabel("Tulis cerita", { exact: true });
  await composer.fill("Draft ini tidak boleh hilang.");
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Posting sementara gagal" })).toContainText(
    "Posting sementara gagal",
  );
  await expect(composer).toHaveValue("Draft ini tidak boleh hilang.");
  await expect(composer).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Bagikan", exact: true }),
  ).toBeEnabled();
});
