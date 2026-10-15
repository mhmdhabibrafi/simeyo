export class ApiError extends Error {
  status:number;
  errors:Record<string,string[]>;
  constructor(
    status: number,
    message: string,
    errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.status=status;
    this.errors=errors;
  }
}
export function normalizeOrigin(value: string, development: boolean): string {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Alamat layanan tidak valid.");
  if (url.protocol !== "https:" && !development)
    throw new Error("Build produksi memerlukan layanan HTTPS.");
  return url.origin;
}
export function createApiClient(
  origin: string,
  getToken: () => string | null,
  onExpired: (token: string) => void,
) {
  return async function api<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = getToken();
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    const controller = new AbortController();
    const target=new URL(`${origin}/api/v1/${path}`);
    if(target.origin!==origin||!target.pathname.startsWith('/api/v1/'))throw new ApiError(400,'Alamat permintaan tidak valid.');
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(target.href, {
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
        credentials: "omit",
        redirect:'error',
      });
      if (response.status === 401 && token) onExpired(token);
      if (response.status === 204) return undefined as T;
      const data = await response.json().catch(() => {
        throw new ApiError(502, "Respons layanan tidak valid. Coba kembali.");
      });
      if (!response.ok)
        throw new ApiError(
          response.status,
          data.message ?? "Permintaan belum berhasil.",
          data.errors ?? {},
        );
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        0,
        "Koneksi terputus atau layanan belum dapat dijangkau. Draf tetap tersimpan di layar ini.",
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
export function createSessionTransport(origin:string,onExpired:()=>void){
 let token:string|null=null;
 return {getToken:()=>token,setToken:(value:string|null)=>{token=value;},api:createApiClient(origin,()=>token,expired=>{if(expired===token){token=null;onExpired();}})};
}
