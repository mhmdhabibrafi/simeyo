"use client";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method ?? "GET";
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await fetch("/sanctum/csrf-cookie", {
      credentials: "include",
      cache: "no-store",
    });
    if (!csrf.ok)
      throw new ApiError(
        csrf.status,
        "Tidak dapat memulai sesi aman. Coba kembali.",
      );
  }
  const token = document.cookie
    .split("; ")
    .find((c) => c.startsWith("XSRF-TOKEN="))
    ?.slice("XSRF-TOKEN=".length);
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("X-XSRF-TOKEN", decodeURIComponent(token));
  const response = await fetch(`/api/v1/${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => {
    throw new ApiError(
      502,
      "Respons layanan tidak valid. Periksa API dan coba kembali.",
    );
  });
  if (!response.ok)
    throw new ApiError(
      response.status,
      body.message ?? "Permintaan gagal.",
      body.errors ?? {},
    );
  return body as T;
}
