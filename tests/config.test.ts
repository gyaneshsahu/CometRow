import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig } from '../src/config.js';

const valid = {
  APP_ORIGIN: 'http://127.0.0.1:3000',
  DATABASE_URL: 'postgresql://localhost/cometrow',
};
test('configuration accepts local PostgreSQL and applies defaults', () => {
  assert.equal(parseConfig(valid).PORT, 3000);
  assert.equal(
    parseConfig({ ...valid, APP_ORIGIN: 'http://127.0.0.1:3000/' }).APP_ORIGIN,
    'http://127.0.0.1:3000',
  );
});
test('configuration rejects missing, malformed and unsafe values without exposing secrets', () => {
  for (const env of [
    {},
    { ...valid, PORT: '0' },
    { ...valid, DATABASE_URL: 'https://private-secret' },
    { ...valid, APP_ORIGIN: 'https://example.test/path' },
    { ...valid, DATABASE_URL: 'postgresql://user:CHANGE_ME@localhost/test' },
  ]) {
    assert.throws(
      () => parseConfig(env),
      (error: Error) => !error.message.includes('private-secret'),
    );
  }
});
test('production requires an HTTPS application origin', () => {
  assert.throws(
    () => parseConfig({ ...valid, NODE_ENV: 'production' }),
    /HTTPS/,
  );
  assert.equal(
    parseConfig({
      ...valid,
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://example.test',
    }).NODE_ENV,
    'production',
  );
});
