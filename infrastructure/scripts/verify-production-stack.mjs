import assert from 'node:assert/strict';
assert.equal(process.env.CI, 'true', 'Production smoke check is restricted to disposable CI.');
const origin = 'https://localhost:8443';
const jar = new Map();
async function request(path, init = {}) {
  const headers = { Accept: 'application/json', Origin: origin, Referer: `${origin}/`, Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...init.headers };
  const response = await fetch(`${origin}${path}`, { redirect: 'error', signal: AbortSignal.timeout(15000), ...init, headers });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0]; const at = pair.indexOf('='); jar.set(pair.slice(0, at), pair.slice(at + 1));
  }
  return response;
}
const entry = await request('/', { redirect: 'manual', headers: { Accept: 'text/html' } });
assert.equal(entry.status, 307); assert.equal(entry.headers.get('location'), '/home');
const home = await request('/home', { headers: { Accept: 'text/html' } });
assert.equal(home.status, 200); assert.match(await home.text(), /simeyo/i);
const manifest = await request('/manifest.webmanifest');
assert.equal(manifest.status, 200); assert.equal((await manifest.json()).name, 'Simeyo');
const health = await request('/api/v1/health');
assert.equal(health.status, 200); assert.equal((await health.json()).status, 'ok');
assert.equal((await request('/api/v1/me')).status, 401);
assert.equal((await request('/.env')).status, 404);
assert.equal((await request('/index.php')).status, 404);
const csrf = await request('/sanctum/csrf-cookie'); assert.equal(csrf.status, 204);
assert.ok(jar.get('XSRF-TOKEN'));
const body = JSON.stringify({ email: 'nadia@example.test', password: process.env.BENCH_PASSWORD });
const withoutCsrf = await request('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
assert.equal(withoutCsrf.status, 419);
const login = await request('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(jar.get('XSRF-TOKEN')) }, body });
assert.equal(login.status, 200);
assert.ok(login.headers.getSetCookie().some(cookie => /simeyo_session=/.test(cookie) && /; secure/i.test(cookie) && /; httponly/i.test(cookie)));
const me = await request('/api/v1/me');
assert.equal(me.status, 200); assert.match(me.headers.get('cache-control'), /no-store/); assert.equal((await me.json()).data.email, 'nadia@example.test');
const feed = await request('/api/v1/feed?feed=campus'); assert.equal(feed.status, 200); assert.ok(Array.isArray((await feed.json()).data));
const activity = await request('/api/v1/realtime'); const realtime = (await activity.json()).data;
assert.equal(activity.status, 200); assert.equal(realtime.enabled, true); assert.equal(realtime.scheme, 'https'); assert.equal(realtime.host, 'localhost'); assert.equal(realtime.port, 8443);
const logout = await request('/api/v1/auth/logout', { method: 'POST', headers: { 'X-XSRF-TOKEN': decodeURIComponent(jar.get('XSRF-TOKEN')) } });
assert.equal(logout.status, 204); assert.equal((await request('/api/v1/me')).status, 401);
console.log('TLS, standalone web/manifest, PHP-FPM/PostgreSQL health, CSRF, secure session login/logout, private headers, feed and public realtime config passed.');
