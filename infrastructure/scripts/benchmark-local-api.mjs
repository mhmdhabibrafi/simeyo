import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateOptions({ origin = 'http://localhost:8000', requests = 80, concurrency = 4, email, password }) {
  const url = new URL(origin);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('Benchmark is restricted to an explicit loopback API origin.');
  requests = Number(requests); concurrency = Number(concurrency);
  if (!Number.isInteger(requests) || requests < 5 || requests > 200 || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8 || concurrency > requests)
    throw new Error('Use 5–200 requests and 1–8 concurrent workers.');
  if (!email || !password) throw new Error('Set BENCH_EMAIL and BENCH_PASSWORD to an existing local test account.');
  return { origin: url.origin, requests, concurrency, email, password };
}

export async function benchmark(options, request = fetch) {
  const config = validateOptions(options);
  const send = (path, init) => request(`${config.origin}/api/v1/${path}`, { redirect: 'error', signal: AbortSignal.timeout(10000), ...init });
  const login = await send('auth/native/login', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: config.email, password: config.password, device_name: 'Simeyo bounded local benchmark' }) });
  if (!login.ok) throw new Error(`Benchmark login failed (HTTP ${login.status}).`);
  const token = (await login.json()).data?.token;
  if (typeof token !== 'string' || !token) throw new Error('Login did not return a native token.');
  const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
  const paths = ['health', 'feed?feed=campus&limit=20', 'feed?feed=following&limit=20', 'pulse', 'notifications'];
  const samples = []; let next = 0; let tokenRevoked = false;
  const started = performance.now();
  try {
    await Promise.all(Array.from({ length: config.concurrency }, async () => {
      while (next < config.requests) {
        const index = next++; const path = paths[index % paths.length]; const start = performance.now();
        let status = 0;
        try { const response = await send(path, { headers }); status = response.status; await response.arrayBuffer(); }
        catch { status = 0; }
        samples.push({ path, status, ms: performance.now() - start });
      }
    }));
  } finally {
    try { const logout = await send('auth/native/logout', { method: 'POST', headers }); tokenRevoked = logout.status === 204; }
    catch { tokenRevoked = false; }
  }
  const seconds = (performance.now() - started) / 1000;
  const results = paths.map(path => {
    const rows = samples.filter(s => s.path === path); const times = rows.map(s => s.ms).sort((a, b) => a - b);
    const percentile = n => Math.round(times[Math.max(0, Math.ceil(times.length * n) - 1)]);
    return { path, requests: rows.length, failed: rows.filter(s => s.status !== 200).length, statuses: [...new Set(rows.map(s => s.status))], p50_ms: percentile(.5), p95_ms: percentile(.95), max_ms: Math.round(times.at(-1)) };
  });
  return { scope: 'Bounded loopback read sample; not production capacity certification', requests: samples.length, concurrency: config.concurrency, seconds: +seconds.toFixed(2), requests_per_second: +(samples.length / seconds).toFixed(2), token_revoked: tokenRevoked, failed: samples.filter(s => s.status !== 200).length, results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await benchmark({ origin: process.env.BENCH_ORIGIN, requests: process.env.BENCH_REQUESTS ?? 80, concurrency: process.env.BENCH_CONCURRENCY ?? 4, email: process.env.BENCH_EMAIL, password: process.env.BENCH_PASSWORD });
    console.log(JSON.stringify(report, null, 2));
    if (report.failed || !report.token_revoked) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
