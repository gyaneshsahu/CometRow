import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test('a syntactically valid nonexistent HTTPS host is allowed without lookup', () => {
  const document = emptyDocument();
  const block = newBlock('cta', randomUUID());
  if (block.type !== 'cta') throw new Error('Wrong block');
  block.data.url = 'https://cometrow-review-does-not-exist.invalid/campaign';
  document.blocks = [block];
  assert.equal(documentSchema.safeParse(document).success, true);
  block.data.url = 'https://';
  assert.equal(documentSchema.safeParse(document).success, false);
});
import {
  emptyDocument,
  documentSchema,
  isSafeUrl,
} from '../src/composer/schema.js';
import { blockLibrary, newBlock } from '../src/composer/library.js';
import {
  renderDocument,
  richText,
  accentText,
} from '../src/composer/render.js';
import {
  Autosave,
  type SaveRequest,
  type SaveResult,
} from '../src/composer/autosave.js';

test('new blocks settle as saved after canonical server field ordering', async () => {
  let calls = 0;
  const saver = new Autosave(
    { document: emptyDocument(), revision: 1 },
    async (request) => {
      calls++;
      return {
        kind: 'saved',
        snapshot: {
          document: documentSchema.parse(request.document),
          revision: 2,
        },
      };
    },
    () => {},
    randomUUID,
  );
  const document = emptyDocument();
  document.blocks = blockLibrary.map((entry) =>
    newBlock(entry.type, randomUUID()),
  );
  saver.edit(document);
  await saver.flush();
  assert.equal(saver.state, 'saved');
  assert.equal(saver.unsaved, false);
  await saver.flush();
  assert.equal(calls, 1);
});

test('every configured core block has valid defaults and renders in one document', () => {
  const doc = emptyDocument();
  doc.blocks = blockLibrary.map((entry) => newBlock(entry.type, randomUUID()));
  assert.equal(doc.blocks.length, 12);
  assert.equal(documentSchema.safeParse(doc).success, true);
  const html = renderDocument(doc, 'test');
  for (const block of doc.blocks)
    assert.ok(html.includes(`id="block-${block.id}"`));
  doc.blocks[0]!.enabled = false;
  assert.ok(
    !renderDocument(doc, 'test').includes(`id="block-${doc.blocks[0]!.id}"`),
  );
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('<iframe'));
});
test('schema rejects future versions, unknown configuration, duplicate IDs and resource excess', () => {
  const doc = emptyDocument();
  assert.equal(
    documentSchema.safeParse({ ...doc, schemaVersion: 3 }).success,
    false,
  );
  assert.equal(
    documentSchema.safeParse({ ...doc, customScript: 'alert(1)' }).success,
    false,
  );
  const entry = newBlock('brand', randomUUID());
  doc.blocks = [entry, entry];
  assert.equal(documentSchema.safeParse(doc).success, false);
  doc.blocks = Array.from({ length: 21 }, () =>
    newBlock('brand', randomUUID()),
  );
  assert.equal(documentSchema.safeParse(doc).success, false);
  doc.blocks = Array.from({ length: 3 }, () => ({
    ...newBlock('hero', randomUUID()),
    type: 'hero' as const,
    data: {
      eyebrow: '',
      headline: '',
      description: '',
      visual: 'video' as const,
      ratio: 'landscape' as const,
      alt: '',
    },
  }));
  assert.equal(documentSchema.safeParse(doc).success, false);
});
test('URLs reject dangerous schemes, credentials, whitespace and controls', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,x',
    '//evil.test',
    'https://user:pass@example.test',
    'https://example.test/\n',
    'https://example.test/\u0000',
    'file:///tmp/test',
  ])
    assert.equal(isSafeUrl(url), false, url);
  assert.equal(isSafeUrl('https://example.test/path?a=1&b=2'), true);
  assert.equal(isSafeUrl('tel:+4930123456', 'call'), true);
  assert.equal(isSafeUrl('mailto:hi@example.test', 'email'), true);
  assert.equal(isSafeUrl('mailto:hi@example.test?body=evil', 'email'), false);
});
test('invalid dates, reversed schedules and unknown timezones cannot save', () => {
  const doc = emptyDocument();
  const entry = newBlock('event', randomUUID());
  assert.equal(entry.type, 'event');
  if (entry.type !== 'event') return;
  doc.blocks = [entry];
  entry.data.startsAt = '2026-02-30T10:00';
  assert.equal(documentSchema.safeParse(doc).success, false);
  entry.data.startsAt = '2026-10-01T10:00';
  entry.data.endsAt = '2026-09-01T10:00';
  assert.equal(documentSchema.safeParse(doc).success, false);
  entry.data.endsAt = '';
  entry.data.timezone = 'wrong';
  assert.equal(documentSchema.safeParse(doc).success, false);
  entry.data.timezone = 'Europe/Berlin';
  assert.equal(documentSchema.safeParse(doc).success, true);
});
test('rich text is escaped before formatting; HTML and style injection are rejected', () => {
  assert.equal(
    richText('**Hello** *friend*'),
    '<p><strong>Hello</strong> <em>friend</em></p>',
  );
  assert.ok(richText('<img src=x onerror=alert(1)>').includes('&lt;img'));
  const doc = emptyDocument();
  const entry = newBlock('information', randomUUID());
  if (entry.type !== 'information') return;
  entry.data.body = '<script>alert(1)</script>';
  doc.blocks = [entry];
  assert.equal(documentSchema.safeParse(doc).success, false);
  assert.equal(
    documentSchema.safeParse({
      ...emptyDocument(),
      theme: { accent: 'red; background:url(https://evil.test)' },
    }).success,
    false,
  );
  assert.equal(accentText('#ffffff'), '#000000');
  assert.equal(accentText('#000000'), '#ffffff');
});
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
