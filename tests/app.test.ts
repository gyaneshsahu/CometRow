import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { parseConfig } from '../src/config.js';

const config = parseConfig({
  NODE_ENV: 'test',
  APP_ORIGIN: 'http://127.0.0.1:3000',
  DATABASE_URL: 'postgresql://localhost/test',
  LOG_LEVEL: 'silent',
});
test('homepage is accessible without scripts and sends restrictive security headers', async (t) => {
  const app = await buildApp(config, { ready: async () => {} });
  t.after(() => app.close());
  const response = await app.inject('/');
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /CometRow/);
  assert.match(response.body, /Skip to content/);
  assert.doesNotMatch(response.body, /<script/);
  assert.match(
    String(response.headers['content-security-policy']),
    /frame-ancestors 'none'/,
  );
  assert.match(
    String(response.headers['content-security-policy']),
    /default-src 'none'/,
  );
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal((await app.inject('/styles.css')).statusCode, 200);
});
test('liveness survives database failure while readiness fails safely', async (t) => {
  const app = await buildApp(config, {
    ready: async () => {
      throw new Error('postgresql://secret@example.test');
    },
  });
  t.after(() => app.close());
  assert.equal((await app.inject('/health/live')).statusCode, 200);
  const readiness = await app.inject('/health/ready');
  assert.equal(readiness.statusCode, 503);
  assert.equal(readiness.headers['cache-control'], 'no-store');
  assert.deepEqual(readiness.json(), { status: 'unavailable' });
});
test('readiness succeeds when dependency is ready and private routes are unavailable', async (t) => {
  const app = await buildApp(config, { ready: async () => {} });
  t.after(() => app.close());
  assert.equal((await app.inject('/health/ready')).statusCode, 200);
  assert.equal((await app.inject('/api/campaigns')).statusCode, 404);
});
