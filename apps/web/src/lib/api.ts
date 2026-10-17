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
async function requestHeaders(options: RequestInit) {
  const method = options.method ?? "GET";
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await fetch("/sanctum/csrf-cookie", {
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
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
  return headers;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await requestHeaders(options);
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

export async function uploadWithProgress<T>(
  path: string,
  data: FormData,
  progress: (percent: number) => void,
  signal: AbortSignal,
): Promise<T> {
  const headers = await requestHeaders({ method: "POST", body: data, signal });
  if (signal.aborted) throw new DOMException("Upload cancelled", "AbortError");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.open("POST", `/api/v1/${path}`);
    xhr.withCredentials = true;
    xhr.timeout = 300000;
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300)
          reject(
            new ApiError(
              xhr.status,
              body.message ?? "Upload gagal.",
              body.errors ?? {},
            ),
          );
        else resolve(body as T);
      } catch {
        reject(new ApiError(502, "Respons unggahan tidak valid. Coba lagi."));
      }
    };
    xhr.onerror = () =>
      reject(new ApiError(0, "Koneksi upload terputus. Coba lagi."));
    xhr.ontimeout = () =>
      reject(
        new ApiError(0, "Upload terlalu lama. Periksa koneksi dan coba lagi."),
      );
    xhr.onabort = () =>
      reject(new DOMException("Upload cancelled", "AbortError"));
    xhr.onloadend = () => signal.removeEventListener("abort", abort);
    xhr.send(data);
  });
}
