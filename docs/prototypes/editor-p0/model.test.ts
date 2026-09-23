import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blank,
  template,
  sections,
  elements,
  sectionBundle,
  elementBundle,
  execute,
  assertStructure,
  errors,
  descendants,
  History,
  resolved,
  actionError,
  migrateV1,
  zonedTime,
} from './model.js';
import { canvasHtml } from './render.js';
import { starter, sampleBlock } from '../campaign-editor/model.js';
import { blockLibrary } from '../../../src/composer/library.js';

test('every section and starter is a valid, editable graph with unique IDs', () => {
  for (const [type] of sections) {
    let p = blank();
    p = execute(p, {
      type: 'add',
      parent: p.root,
      bundle: sectionBundle(type),
    });
    assertStructure(p);
    assert.deepEqual(errors(p), [], type);
    assert.equal(
      new Set(descendants(p, p.root)).size,
      Object.keys(p.nodes).length,
    );
  }
  for (const kind of ['blank', 'event', 'launch'] as const) {
    const p = template(kind);
    assertStructure(p);
    assert.deepEqual(errors(p), []);
  }
  const empty = template('blank');
  assert.equal(empty.nodes[empty.root]!.children.length, 0);
  assert.equal(Object.keys(empty.nodes).length, 1);
});
test('all library elements add to compatible containers, form fields stay inside forms', () => {
  for (const [type] of elements) {
    let p = template('blank');
    const s = sectionBundle('blank');
    p = execute(p, { type: 'add', parent: p.root, bundle: s });
    const parent = p.nodes[s.root]!.children[0]!;
    p = execute(p, { type: 'add', parent, bundle: elementBundle(type) });
    assertStructure(p);
    assert.deepEqual(errors(p), [], type);
  }
  const p = blank();
  assert.throws(
    () =>
      execute(p, {
        type: 'add',
        parent: p.root,
        bundle: elementBundle('text'),
      }),
    /compatible/,
  );
});
test('command boundary rejects Viewer, cyclic moves, bad bounds and section limit without mutation', () => {
  let p = template('event');
  const before = structuredClone(p);
  const id = p.nodes[p.root]!.children[0]!;
  assert.throws(
    () => execute(p, { type: 'delete', id }, 'viewer'),
    /Read only/,
  );
  assert.throws(
    () =>
      execute(p, {
        type: 'move',
        id,
        parent: p.nodes[id]!.children[0]!,
        index: 0,
      }),
    /Cannot move/,
  );
  assert.throws(
    () => execute(p, { type: 'layout', id, patch: { padding: -1 } }),
    /bounds/,
  );
  assert.deepEqual(p, before);
  p = blank();
  for (let i = 0; i < 20; i++)
    p = execute(p, {
      type: 'add',
      parent: p.root,
      bundle: sectionBundle('blank'),
    });
  assert.throws(
    () =>
      execute(p, {
        type: 'add',
        parent: p.root,
        bundle: sectionBundle('blank'),
      }),
    /20 sections/,
  );
});
test('layout changes preserve every child and phone override leaves desktop untouched', () => {
  let p = template('event');
  const id = Object.values(p.nodes).find(
    (n) => n.name === 'Copy column',
  )!.parent!;
  const children = structuredClone(p.nodes[id]!.children);
  const snapshot = structuredClone(p.nodes[id]!.layout);
  p = execute(p, {
    type: 'layout',
    id,
    device: 'phone',
    patch: { reverse: true, gap: 12 },
  });
  assert.deepEqual(p.nodes[id]!.layout, snapshot);
  assert.equal(resolved(p.nodes[id]!, 'phone').layout.reverse, true);
  assert.equal(resolved(p.nodes[id]!, 'desktop').layout.reverse, false);
  p = execute(p, { type: 'apply-layout', id, layout: 'wide-left' });
  assert.deepEqual(p.nodes[id]!.children, children);
  p = execute(p, { type: 'reset', id, device: 'phone' });
  assert.equal(p.nodes[id]!.overrides.phone, undefined);
});
test('duplicate subtree gets new IDs and remaps internal links; delete is exactly undoable', () => {
  let p = template('event');
  const id = p.nodes[p.root]!.children[1]!;
  const ids = descendants(p, id);
  const button = ids.find((i) => p.nodes[i]!.type === 'button')!;
  p = execute(p, {
    type: 'action',
    id: button,
    action: { kind: 'section', value: id, newTab: false, label: '' },
  });
  const original = structuredClone(p);
  const h = new History();
  h.push(p);
  p = execute(p, { type: 'duplicate', id });
  const copy = p.nodes[p.root]!.children[2]!;
  const copyIds = descendants(p, copy);
  assert.ok(copyIds.every((i) => !ids.includes(i)));
  assert.equal(
    p.nodes[copyIds.find((i) => p.nodes[i]!.type === 'button')!]!.action.value,
    copy,
  );
  p = h.undo(p);
  assert.deepEqual(p, original);
  h.push(p);
  p = execute(p, { type: 'delete', id });
  assert.ok(ids.every((i) => !p.nodes[i]));
  assert.deepEqual(h.undo(p), original);
});
test('safe actions allow nonexistent HTTPS and reject unsafe/malformed destinations', () => {
  const a = {
    kind: 'url' as const,
    value: 'https://does-not-exist.invalid/product',
    newTab: true,
    label: '',
  };
  assert.equal(actionError(a), undefined);
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'https://a b.test',
    'https://user:password@example.com',
    'nope',
  ])
    assert.ok(actionError({ ...a, value }));
});
test('all twelve v1 block types migrate losslessly, deterministically and without writing original', () => {
  for (const { type } of blockLibrary) {
    const document = starter('blank', 'Migration').document;
    const block = sampleBlock(type);
    block.enabled = false;
    document.blocks = [block];
    const original = structuredClone(document);
    const migrated = migrateV1(document);
    assert.deepEqual(migrated.sourceV1, original);
    assert.deepEqual(document, original);
    assert.deepEqual(migrateV1(document), migrated);
    assert.equal(migrated.nodes[block.id]!.visible, false);
    assert.deepEqual(migrated.theme, document.theme);
    const values = Object.values(migrated.nodes).filter(
      (n) => n.type === 'legacy-value',
    );
    const visit = (v: unknown, path: string) => {
      if (v && typeof v === 'object')
        Object.entries(v).forEach(([k, x]) => visit(x, `${path}.${k}`));
      else
        assert.equal(
          values.find((n) => n.content.sourcePath === path)!.content.value,
          v,
        );
    };
    visit(block.data, 'data');
  }
});
test('renderer escapes text, omits hidden subtrees and shares content in editor/preview', () => {
  let p = template('event');
  const heading = Object.values(p.nodes).find((n) => n.type === 'heading')!;
  p = execute(p, {
    type: 'content',
    id: heading.id,
    patch: { text: '<script>alert(1)</script>' },
  });
  const html = canvasHtml(p, 'phone');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  const preview = canvasHtml(p, 'phone', true);
  assert.ok(!preview.includes('tabindex="0"'));
  assert.ok(preview.includes('&lt;script&gt;'));
  p = execute(p, { type: 'visibility', id: heading.id });
  assert.ok(!canvasHtml(p, 'phone', true).includes(heading.id));
});
test('history retains 80 steps and branching invalidates redo', () => {
  const h = new History();
  let p = blank();
  for (let i = 0; i < 90; i++) {
    h.push(p);
    p = execute(p, { type: 'name', id: p.root, value: `Campaign ${i}` });
  }
  assert.equal(h.past.length, 80);
  p = h.undo(p);
  assert.equal(h.future.length, 1);
  h.push(p);
  assert.equal(h.future.length, 0);
});
test('countdown interprets campaign timezone rather than browser timezone', () => {
  assert.equal(
    new Date(zonedTime('2026-10-17T14:00', 'Europe/Berlin')).toISOString(),
    '2026-10-17T12:00:00.000Z',
  );
  assert.equal(
    new Date(zonedTime('2026-12-17T14:00', 'Europe/Berlin')).toISOString(),
    '2026-12-17T13:00:00.000Z',
  );
});
