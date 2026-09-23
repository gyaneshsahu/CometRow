import test from 'node:test';
import assert from 'node:assert/strict';
import { blockLibrary } from '../../../src/composer/library.js';
import { documentSchema } from '../../../src/composer/schema.js';
import { History, moveBlock, sampleBlock, starter } from './model.js';
import { canvasHtml } from './visuals.js';

test('every library sample and starter stays valid under the existing strict schema', () => {
  for (const kind of ['studio', 'launch', 'blank'] as const) {
    const project = starter(kind, 'Review');
    assert.equal(documentSchema.safeParse(project.document).success, true);
    assert.ok(!('appearance' in project.document));
  }
  for (const entry of blockLibrary) {
    const project = starter('blank', 'Review');
    project.document.blocks.push(sampleBlock(entry.type));
    assert.equal(
      documentSchema.safeParse(project.document).success,
      true,
      entry.type,
    );
  }
});
test('drag ordering preserves content and identity without mutating the original', () => {
  const original = starter('studio', 'Review');
  const ids = original.document.blocks.map((b) => b.id);
  const last = ids.at(-1)!;
  const moved = moveBlock(original, last, ids[0]!);
  assert.deepEqual(
    moved.document.blocks.map((b) => b.id),
    [last, ...ids.slice(0, -1)],
  );
  assert.deepEqual(
    original.document.blocks.map((b) => b.id),
    ids,
  );
  assert.deepEqual(moveBlock(moved, last, null).document, original.document);
  assert.deepEqual(moveBlock(original, 'missing', null), original);
  assert.deepEqual(moveBlock(original, ids[0]!, ids[0]!), original);
});
test('undo and redo restore compound changes, including presentation, and clear a stale redo branch', () => {
  const history = new History();
  const first = starter('studio', 'Review');
  const second = structuredClone(first);
  history.push(first);
  second.document.blocks.reverse();
  second.name = 'Changed';
  second.appearance[second.document.blocks[0]!.id]!.tone = 'dark';
  const undone = history.undo(second);
  assert.deepEqual(undone, first);
  assert.deepEqual(history.redo(undone), second);
  history.undo(second);
  history.push(first);
  assert.equal(history.canRedo, false);
});
test('preview removes editing controls and hidden blocks, and escapes injected text', () => {
  const project = starter('studio', 'Review');
  const hero = project.document.blocks.find((b) => b.type === 'hero')!;
  hero.data.headline = '<img src=x onerror=alert(1)>';
  const editable = canvasHtml(project, hero.id, false);
  assert.ok(editable.includes('&lt;img'));
  assert.ok(!editable.includes('<img src=x'));
  assert.ok(editable.includes('contenteditable="plaintext-only"'));
  hero.enabled = false;
  const preview = canvasHtml(project, hero.id, true);
  assert.ok(!preview.includes('contenteditable'));
  assert.ok(!preview.includes('data-action="delete"'));
  assert.ok(!preview.includes('data-type="hero"'));
});
