import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
assert.equal(process.env.CI, 'true');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.ok(process.env.BENCH_PASSWORD);
const origin = 'https://localhost:8443/api/v1/';
const paths = ['feed?feed=campus&limit=20', 'feed?feed=following&limit=20', 'feed?feed=for-you&limit=20', 'pulse', 'search/posts?q=campus', 'notifications'];
const tokens = [];
const samples = [];
let revoked = 0;
const duration = 120000;
const concurrency = 8;
const targetRate = 8;
const request = (path, init = {}) => fetch(`${origin}${path}`, { signal: AbortSignal.timeout(15000), redirect: 'error', ...init });
try {
  for (let user = 0; user < 4; user++) {
    const response = await request('auth/native/login', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `load${user}@example.invalid`, password: process.env.BENCH_PASSWORD, device_name: 'Isolated CI sustained reader' }) });
    assert.equal(response.status, 200, 'Load fixture login failed.');
    const token = (await response.json()).data?.token;
    assert.equal(typeof token, 'string'); assert.ok(token);
    tokens.push(token);
  }
  let next = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = next++;
      const scheduled = started + index * 1000 / targetRate;
      if (scheduled >= started + duration) break;
      await sleep(Math.max(0, scheduled - performance.now()));
      if (performance.now() >= started + duration) break;
      const path = paths[index % paths.length];
      const began = performance.now();
      let status = 0;
      try {
        const response = await request(path, { headers: { Accept: 'application/json', Authorization: `Bearer ${tokens[index % tokens.length]}` } });
        status = response.status;
        const body = await response.json();
        if (!body || !('data' in body)) status = -1;
      } catch { status = 0; }
      samples.push({ path, status, ms: performance.now() - began });
    }
  }));
  const seconds = (performance.now() - started) / 1000;
  const endpoints = paths.map(path => {
    const rows = samples.filter(sample => sample.path === path);
    const times = rows.map(row => row.ms).sort((a, b) => a - b);
    return { path, requests: rows.length, failed: rows.filter(row => row.status !== 200).length, statuses: [...new Set(rows.map(row => row.status))], p50_ms: Math.round(times[Math.ceil(times.length * .5) - 1] ?? 0), p95_ms: Math.round(times[Math.ceil(times.length * .95) - 1] ?? 0), max_ms: Math.round(times.at(-1) ?? 0) };
  });
  const failed = samples.filter(sample => sample.status !== 200).length;
  const minimumRequests = Math.floor(duration / 1000 * targetRate * .9);
  const accepted = failed === 0 && samples.length >= minimumRequests && endpoints.every(endpoint => endpoint.requests >= 10 && endpoint.p95_ms <= 2000);
  console.log(JSON.stringify({ scope: '120-second isolated HTTPS/FPM CI read load, four fictional accounts; not public campus capacity certification', dataset: { users: 100, root_posts: 5000, replies: 500 }, duration_seconds: +seconds.toFixed(2), target_requests_per_second: targetRate, concurrency_limit: concurrency, minimum_completed_requests: minimumRequests, requests: samples.length, actual_requests_per_second: +(samples.length / seconds).toFixed(2), failed, endpoint_p95_budget_ms: 2000, accepted, endpoints }, null, 2));
  assert.ok(accepted, 'Sustained CI read workload failed its explicit error/latency budget.');
} finally {
  for (const token of tokens) {
    try {
      const response = await request('auth/native/logout', { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      if (response.status === 204) revoked++;
    } catch { /* Report only cleanup confirmation, never tokens or response bodies. */ }
  }
  console.error(`CI load-token cleanup confirmed: ${revoked}/${tokens.length}.`);
  if (revoked !== tokens.length) process.exitCode = 1;
}
