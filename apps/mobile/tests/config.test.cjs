const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
function config(profile, api, web) {
  return spawnSync(process.execPath, [path.resolve(__dirname, '../app.config.ts')], { encoding: 'utf8', timeout: 5000, env: { ...process.env, EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_API_URL: api, EXPO_PUBLIC_WEB_URL: web } });
}
test('preview and production reject unsafe API/web origins before native build', () => {
  for (const profile of ['preview', 'production']) {
    assert.equal(config(profile, 'https://api.example', 'https://campus.example').status, 0);
    for (const url of ['', 'http://10.0.2.2:8000', 'https://user:password@api.example', 'https://api.example/path', 'https://api.example?key=test', 'https://api.example/#fragment']) {
      assert.notEqual(config(profile, url, 'https://campus.example').status, 0);
      assert.notEqual(config(profile, 'https://api.example', url).status, 0);
    }
  }
  assert.equal(config('development', 'http://10.0.2.2:8000', 'http://10.0.2.2:3000').status, 0);
});
