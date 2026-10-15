import { test } from 'node:test';
import assert from 'node:assert/strict';
import { benchmark, validateOptions } from '../scripts/benchmark-local-api.mjs';

const options = { email: 'synthetic@example.invalid', password: 'synthetic-not-a-secret', requests: 10, concurrency: 2 };
test('local sampler rejects remote origins, URL credentials and excessive load before authentication', () => {
  for (const origin of ['https://campus.example', 'http://u:p@localhost', 'http://localhost/api', 'http://localhost?token=x']) assert.throws(() => validateOptions({ ...options, origin }));
  for (const bad of [{ requests: 201 }, { requests: 2 }, { concurrency: 9 }, { concurrency: 1.5 }]) assert.throws(() => validateOptions({ ...options, ...bad }));
});
test('read failures are counted and only the newly minted benchmark token is revoked', async () => {
  const reads = []; let revoked = false;
  const report = await benchmark(options, async (address, init) => {
    if (address.endsWith('/auth/native/login')) return Response.json({ data: { token: 'synthetic-owned-token' } });
    assert.equal(init.headers.Authorization, 'Bearer synthetic-owned-token');
    assert.equal(init.redirect, 'error');
    if (address.endsWith('/auth/native/logout')) { revoked = true; assert.equal(init.method, 'POST'); return new Response(null, { status: 204 }); }
    assert.equal(init.method, undefined); reads.push(address);
    return Response.json({}, { status: address.endsWith('/pulse') ? 503 : 200 });
  });
  assert.equal(reads.length, 10); assert.equal(report.failed, 2); assert.equal(report.token_revoked, true); assert.equal(revoked, true);
  assert.equal(JSON.stringify(report).includes('synthetic-owned-token'), false);
});
