import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newVisualDocument } from '../src/composer/schema.js';
import {
  Autosave,
  type SaveResult,
  type SaveRequest,
} from '../src/composer/autosave.js';
const emptyDocument = () =>
  newVisualDocument('12345678-1234-4123-8123-123456789abc');
test('autosave serializes in-flight requests and preserves edits made while saving', async () => {
  let complete!: (result: SaveResult) => void;
  const sent: SaveRequest[] = [];
  const saver = new Autosave(
    { document: emptyDocument(), revision: 1 },
    (request) => {
      sent.push(request);
      return new Promise((resolve) => {
        complete = resolve;
      });
    },
    () => {},
    randomUUID,
  );
  const first = emptyDocument();
  first.theme.preset = 'paper';
  saver.edit(first);
  const saving = saver.flush();
  const second = structuredClone(first);
  second.theme.corners = 'square';
  saver.edit(second);
  await saver.flush();
  assert.equal(sent.length, 1);
  complete({ kind: 'saved', snapshot: { document: first, revision: 2 } });
  await saving;
  assert.equal(saver.document.theme.corners, 'square');
  assert.equal(saver.state, 'dirty');
  const next = saver.flush();
  assert.equal(sent[1]!.revision, 2);
  complete({ kind: 'saved', snapshot: { document: second, revision: 3 } });
  await next;
  assert.equal(saver.state, 'saved');
  assert.equal(saver.unsaved, false);
});
test('lost-response retries reuse the exact mutation and do not include newer edits', async () => {
  const sent: SaveRequest[] = [];
  const saver = new Autosave(
    { document: emptyDocument(), revision: 1 },
    async (request) => {
      sent.push(structuredClone(request));
      if (sent.length === 1) throw new Error('offline');
      return {
        kind: 'saved',
        snapshot: { document: request.document, revision: 2 },
      };
    },
    () => {},
    randomUUID,
  );
  const first = emptyDocument();
  first.theme.preset = 'paper';
  saver.edit(first);
  await saver.flush();
  assert.equal(saver.state, 'retry');
  const second = structuredClone(first);
  second.theme.corners = 'square';
  saver.edit(second);
  await saver.flush();
  assert.deepEqual(sent[0], sent[1]);
  assert.equal(saver.document.theme.corners, 'square');
  assert.equal(saver.state, 'dirty');
});
test('conflicts stop autosave until an explicit choice and use the latest revision', async () => {
  const remote = emptyDocument();
  remote.theme.preset = 'midnight';
  let calls = 0;
  const saver = new Autosave(
    { document: emptyDocument(), revision: 1 },
    async () => {
      calls++;
      return { kind: 'conflict', latest: { document: remote, revision: 3 } };
    },
    () => {},
    randomUUID,
  );
  const local = emptyDocument();
  local.theme.preset = 'paper';
  saver.edit(local);
  await saver.flush();
  await saver.flush();
  assert.equal(calls, 1);
  assert.equal(saver.document.theme.preset, 'paper');
  saver.resolve('local');
  assert.equal(saver.revision, 3);
  assert.equal(saver.state, 'dirty');
  await saver.flush();
  saver.resolve('saved');
  assert.equal(saver.document.theme.preset, 'midnight');
  assert.equal(saver.unsaved, false);
});
test('invalid and blocked drafts are retained without sending more requests', async () => {
  let calls = 0;
  const saver = new Autosave(
    { document: emptyDocument(), revision: 1 },
    async () => {
      calls++;
      return { kind: 'blocked', message: 'Session expired' };
    },
    () => {},
    randomUUID,
  );
  const doc = emptyDocument();
  doc.theme.accent = 'bad';
  saver.edit(doc);
  await saver.flush();
  assert.equal(calls, 0);
  assert.equal(saver.state, 'invalid');
  doc.theme.accent = '#ffffff';
  saver.edit(doc);
  await saver.flush();
  await saver.flush();
  assert.equal(calls, 1);
  assert.equal(saver.state, 'blocked');
  assert.equal(saver.unsaved, true);
});
