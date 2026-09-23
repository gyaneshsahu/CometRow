import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LocalEmail } from '../src/notifications/local-email.js';

test('local email adapter persists separate messages without using recipient text as a path', async () => {
  await mkdir('.local/tests', { recursive: true });
  const directory = await mkdtemp(resolve('.local/tests/mail-'));
  const adapter = new LocalEmail(directory);
  const message = {
    to: 'review@example.test',
    subject: 'Verify your account',
    text: 'A synthetic verification message.',
  };
  await Promise.all([adapter.send(message), adapter.send(message)]);
  const files = await readdir(directory);
  assert.equal(files.length, 2);
  for (const file of files) {
    assert.match(file, /^\d+-[a-f0-9-]+\.json$/);
    const saved = JSON.parse(await readFile(resolve(directory, file), 'utf8'));
    assert.equal(saved.to, message.to);
    assert.equal(saved.text, message.text);
    assert.ok(saved.createdAt);
  }
});
