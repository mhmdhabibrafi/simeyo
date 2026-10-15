import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.ok(process.env.BENCH_PASSWORD);
const origin = 'https://localhost:8443';
const browser = await chromium.launch({ headless: true });
const contexts = [];
try {
  async function session(email) {
    // The separate Node smoke check verifies TLS trust with the ephemeral CA.
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    contexts.push(context);
    const page = await context.newPage();
    await page.goto(`${origin}/login`);
    async function api(path, method = 'GET', body) {
      return page.evaluate(async ({ path, method, body }) => {
        const csrf = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.slice(11);
        const response = await fetch(path, { method, credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(csrf ? { 'X-XSRF-TOKEN': decodeURIComponent(csrf) } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        return { status: response.status, data: response.status === 204 ? null : await response.json() };
      }, { path, method, body });
    }
    await api('/sanctum/csrf-cookie');
    assert.equal((await api('/api/v1/auth/login', 'POST', { email, password: process.env.BENCH_PASSWORD })).status, 200);
    const me = await api('/api/v1/me'); assert.equal(me.status, 200);
    assert.equal((await api('/api/v1/communication-preferences', 'PATCH', { dm_policy: 'campus', notification_preferences: { messages: true } })).status, 200);
    return { page, api, id: me.data.data.id };
  }
  const sender = await session('nadia@example.test');
  const recipient = await session('rafi@example.test');
  const realtime = await recipient.api('/api/v1/realtime');
  assert.equal(realtime.status, 200);
  await recipient.page.evaluate(async ({ key, userId, otherId }) => {
    const csrf = decodeURIComponent(document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN=')).slice(11));
    window.recoveryRealtime = { events: [], frames: [], error: null };
    const state = window.recoveryRealtime;
    const socket = new WebSocket(`wss://${location.host}/app/${key}?protocol=7&client=simeyo-ci&version=1.0`);
    state.socket = socket;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Private WSS subscription timed out.')), 20000);
      const fail = () => { clearTimeout(timeout); reject(new Error('Private WSS connection failed.')); };
      socket.onerror = fail;
      socket.onmessage = async ({ data }) => {
        try {
          const frame = JSON.parse(data);
          state.frames.push(frame);
          if (frame.event === 'pusher:connection_established') {
            const { socket_id } = JSON.parse(frame.data);
            async function authorize(id) {
              return fetch('/api/v1/broadcasting/auth', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf }, body: JSON.stringify({ socket_id, channel_name: `private-App.Models.User.${id}` }) });
            }
            if ((await authorize(otherId)).status !== 403) throw new Error('Another user channel was authorized.');
            const auth = await authorize(userId);
            if (auth.status !== 200) throw new Error('Own private channel authorization failed.');
            socket.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `private-App.Models.User.${userId}`, ...(await auth.json()) } }));
          } else if (frame.event === 'pusher_internal:subscription_succeeded') {
            clearTimeout(timeout); resolve();
          } else if (frame.event === 'pusher:ping') socket.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
          else if (frame.event === 'activity.changed') state.events.push(frame);
          else if (frame.event === 'pusher:error') throw new Error('Private WSS protocol error.');
        } catch { state.error = 'Private WSS protocol/authorization failed.'; fail(); }
      };
    });
  }, { key: realtime.data.data.key, userId: recipient.id, otherId: sender.id });
  const conversation = await sender.api('/api/v1/conversations', 'POST', { user_id: recipient.id });
  assert.equal(conversation.status, 201);
  const id = conversation.data.data.id;
  const body = `Isolated TLS message ${crypto.randomUUID()}`;
  const sent = await sender.api(`/api/v1/conversations/${id}/messages`, 'POST', { body, client_id: crypto.randomUUID() });
  assert.equal(sent.status, 201);
  await recipient.page.waitForFunction(() => window.recoveryRealtime.events.length > 0 || window.recoveryRealtime.error, null, { timeout: 20000 });
  const frames = await recipient.page.evaluate(() => ({ events: window.recoveryRealtime.events, frames: window.recoveryRealtime.frames, error: window.recoveryRealtime.error }));
  assert.equal(frames.error, null);
  assert.ok(frames.events.length > 0);
  for (const event of frames.events) {
    assert.equal(event.channel, `private-App.Models.User.${recipient.id}`);
    assert.deepEqual(typeof event.data === 'string' ? JSON.parse(event.data) : event.data, { refresh: true });
  }
  assert.equal(JSON.stringify(frames.frames).includes(body), false);
  const messages = await recipient.api(`/api/v1/conversations/${id}/messages`);
  assert.equal(messages.status, 200);
  assert.ok(messages.data.data.some(message => message.id === sent.data.data.id && message.body === body));
  assert.equal((await recipient.api(`/api/v1/conversations/${id}/read`, 'PUT')).status, 204);
  await recipient.page.evaluate(() => window.recoveryRealtime.socket.close());
  for (const user of [sender, recipient]) assert.equal((await user.api('/api/v1/auth/logout', 'POST')).status, 204);
  console.log('TLS gateway private WSS: own subscription, cross-user denial, queued message invalidation-only delivery, persisted authorized HTTP read and logout passed.');
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
}
