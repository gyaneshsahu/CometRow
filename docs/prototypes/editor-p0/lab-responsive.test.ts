import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  createNode,
  placement,
  normalizeDocument,
  primaryScreen,
  geometryState,
  devices,
  validate,
  type LabDocument,
  type Device,
  type Height,
} from './lab-model.js';
import { History, type Command } from './lab-commands.js';
const id = 'node-first',
  other = 'node-other';
function setup(device: Device = 'desktop') {
  const h = new History(seed());
  for (const name of [id, other])
    h.commit({
      type: 'AddNode',
      node: createNode('heading', name),
      placement: placement('heading', 60, 80),
      device,
    });
  return h;
}
const p = (d: LabDocument, b: Device, name = id) =>
  d.sections[0]!.layouts[b].placements[name]!;
function move(h: History, b: Device, x: number, name = id) {
  h.commit({
    type: 'MoveNode',
    id: name,
    device: b,
    placement: { ...p(h.document, b, name), x },
  });
}
function roundTrip(h: History, c: Command) {
  const before = structuredClone(h.document),
    count = h.past.length;
  h.commit(c);
  const after = structuredClone(h.document);
  assert.equal(h.past.length, count + 1);
  h.undo();
  assert.deepEqual(h.document, before);
  h.redo();
  assert.deepEqual(h.document, after);
}
test('new documents default Desktop Primary; additions create Auto target placements', () => {
  const h = setup();
  assert.equal(primaryScreen(h.document), 'desktop');
  for (const b of ['mobile', 'tablet'] as const) {
    assert.equal(p(h.document, b).geometryMode, 'auto');
    assert.ok(p(h.document, b).x > 0);
    assert.ok(p(h.document, b).x + p(h.document, b).w < 480);
    assert.equal(p(h.document, b).height.mode, 'auto');
  }
});
test('Primary move regenerates Auto flow as one undo action and preserves unrelated Primary geometry', () => {
  const h = setup(),
    before = structuredClone(p(h.document, 'desktop', other));
  roundTrip(h, {
    type: 'MoveNode',
    id,
    device: 'desktop',
    placement: { ...p(h.document, 'desktop'), x: 99, yPx: 128 },
  });
  assert.equal(p(h.document, 'desktop').x, 99);
  assert.ok(p(h.document, 'tablet').x > p(h.document, 'tablet', other).x);
  assert.deepEqual(p(h.document, 'desktop', other), before);
  assert.ok(p(h.document, 'mobile').yPx > p(h.document, 'mobile', other).yPx);
});
for (const height of [
  { mode: 'auto', minPx: 60 },
  { mode: 'fixed', px: 120 },
  { mode: 'aspect', ratio: 2 },
] satisfies Height[])
  test(
    'Primary resize preserves ' +
      height.mode +
      ' authored height mode while Auto text reflows',
    () => {
      const h = setup();
      roundTrip(h, {
        type: 'ResizeNode',
        id,
        device: 'desktop',
        placement: { ...p(h.document, 'desktop'), w: 160, yPx: 72, height },
      });
      assert.equal(p(h.document, 'desktop').w, 160);
      assert.equal(p(h.document, 'desktop').yPx, 72);
      assert.deepEqual(p(h.document, 'desktop').height, height);
      for (const b of ['mobile', 'tablet'] as const) {
        assert.equal(p(h.document, b).height.mode, 'auto');
        assert.equal(p(h.document, b).geometryMode, 'auto');
      }
    },
  );
test('manual non-primary geometry customizes only one element and is protected', () => {
  const h = setup(),
    before = structuredClone(h.document);
  move(h, 'mobile', 17);
  assert.equal(p(h.document, 'mobile').geometryMode, 'custom');
  assert.deepEqual(p(h.document, 'mobile', other), p(before, 'mobile', other));
  assert.deepEqual(
    h.document.sections[0]!.layouts.desktop,
    before.sections[0]!.layouts.desktop,
  );
  assert.deepEqual(
    h.document.sections[0]!.layouts.tablet,
    before.sections[0]!.layouts.tablet,
  );
  move(h, 'desktop', 101);
  assert.equal(p(h.document, 'mobile').x, 17);
  assert.ok(p(h.document, 'tablet').x > p(h.document, 'tablet', other).x);
});
test('Reset to Auto reconnects only selected geometry and preserves local metadata', () => {
  const h = setup();
  move(h, 'mobile', 20);
  move(h, 'mobile', 30, other);
  h.commit({ type: 'SetNodeVisibility', id, device: 'mobile', value: true });
  h.commit({ type: 'LockNode', id, device: 'mobile', value: true });
  h.commit({
    type: 'SetLayer',
    id,
    device: 'mobile',
    band: 'decorative',
    order: 9,
  });
  const unrelated = structuredClone(p(h.document, 'mobile', other));
  roundTrip(h, { type: 'ResetNodeToAuto', id, device: 'mobile' });
  assert.equal(p(h.document, 'mobile').geometryMode, 'auto');
  assert.ok(p(h.document, 'mobile').x > 0);
  assert.equal(p(h.document, 'mobile').hidden, true);
  assert.equal(p(h.document, 'mobile').locked, true);
  assert.equal(p(h.document, 'mobile').layerOrder, 9);
  assert.deepEqual(p(h.document, 'mobile', other), unrelated);
  move(h, 'desktop', 80);
  assert.equal(p(h.document, 'mobile').geometryMode, 'auto');
});
test('Primary change confirms, preserves new source exactly, previous source becomes Custom', () => {
  const h = setup();
  move(h, 'mobile', 22);
  const source = structuredClone(h.document.sections[0]!.layouts.mobile),
    old = structuredClone(p(h.document, 'desktop'));
  assert.throws(() =>
    h.commit({ type: 'SetPrimaryScreen', device: 'mobile', confirmed: false }),
  );
  roundTrip(h, { type: 'SetPrimaryScreen', device: 'mobile', confirmed: true });
  assert.deepEqual(h.document.sections[0]!.layouts.mobile, source);
  assert.deepEqual(p(h.document, 'desktop'), {
    ...old,
    geometryMode: 'custom',
  });
  assert.equal(p(h.document, 'tablet').geometryMode, 'auto');
  assert.ok(p(h.document, 'tablet').x + p(h.document, 'tablet').w <= 480);
  move(h, 'mobile', 33);
  assert.equal(p(h.document, 'desktop').x, 60);
  assert.ok(p(h.document, 'tablet').x >= 15);
  assert.equal(p(h.document, 'tablet').geometryMode, 'auto');
});
test('Primary change preserves every Custom layout and Reset uses the new Primary', () => {
  const h = setup();
  move(h, 'mobile', 20);
  move(h, 'tablet', 30);
  const tablet = structuredClone(p(h.document, 'tablet'));
  h.commit({ type: 'SetPrimaryScreen', device: 'mobile', confirmed: true });
  assert.deepEqual(p(h.document, 'tablet'), tablet);
  h.commit({ type: 'ResetNodeToAuto', id, device: 'desktop' });
  assert.ok(p(h.document, 'desktop').x >= 10);
  assert.equal(p(h.document, 'desktop').geometryMode, 'auto');
  assert.throws(() =>
    h.commit({ type: 'ResetNodeToAuto', id, device: 'mobile' }),
  );
});
test('non-primary Add preserves authored Custom, creates safe Primary and remaining Auto', () => {
  const h = setup('mobile');
  assert.equal(p(h.document, 'mobile').geometryMode, 'custom');
  assert.equal(p(h.document, 'mobile').x, 60);
  assert.equal(p(h.document, 'tablet').geometryMode, 'auto');
  assert.equal(p(h.document, 'desktop').geometryMode, 'custom');
  move(h, 'desktop', 99);
  assert.equal(p(h.document, 'mobile').x, 60);
  assert.ok(p(h.document, 'tablet').x > p(h.document, 'tablet', other).x);
});
test('Hide/Show only affects active breakpoint; hidden Auto geometry still synchronizes', () => {
  const h = setup();
  roundTrip(h, {
    type: 'SetNodeVisibility',
    id,
    device: 'mobile',
    value: true,
  });
  assert.equal(geometryState(h.document, id, 'mobile'), 'Hidden');
  move(h, 'desktop', 90);
  assert.equal(p(h.document, 'mobile').geometryMode, 'auto');
  assert.ok(p(h.document, 'mobile').x > 0);
  assert.equal(p(h.document, 'mobile').hidden, true);
  roundTrip(h, {
    type: 'SetNodeVisibility',
    id,
    device: 'mobile',
    value: false,
  });
  assert.equal(geometryState(h.document, id, 'mobile'), 'Auto');
  h.commit({ type: 'SetNodeVisibility', id, device: 'desktop', value: true });
  assert.equal(p(h.document, 'mobile').hidden, false);
  assert.equal(p(h.document, 'tablet').hidden, false);
});
test('Delete everywhere rejects unconfirmed commands and removes globally with undo', () => {
  const h = setup(),
    before = structuredClone(h.document);
  assert.throws(() => h.commit({ type: 'DeleteNode', id, confirmed: false }));
  assert.deepEqual(h.document, before);
  roundTrip(h, { type: 'DeleteNode', id, confirmed: true });
  assert.equal(h.document.nodes[id], undefined);
  for (const b of devices) assert.equal(p(h.document, b), undefined);
});
test('legacy load and import preserve all layouts without mutating the original', () => {
  const original = setup().document;
  delete original.primaryScreen;
  for (const b of devices)
    for (const q of Object.values(original.sections[0]!.layouts[b].placements))
      delete q.geometryMode;
  const originalJSON = JSON.stringify(original),
    normalized = normalizeDocument(original);
  assert.equal(normalized.primaryScreen, 'desktop');
  for (const b of devices)
    for (const name of [id, other])
      assert.deepEqual(p(normalized, b, name), {
        ...p(original, b, name),
        geometryMode: 'custom',
      });
  assert.equal(JSON.stringify(original), originalJSON);
  const h = new History(original);
  move(h, 'desktop', 91);
  assert.deepEqual(p(h.document, 'mobile'), p(normalized, 'mobile'));
  h.commit({ type: 'ImportDocument', document: original });
  assert.deepEqual(h.document, normalized);
});
test('JSON round trip preserves Primary, hidden Auto and Custom metadata', () => {
  const h = setup();
  move(h, 'tablet', 44);
  h.commit({ type: 'SetNodeVisibility', id, device: 'mobile', value: true });
  h.commit({ type: 'SetPrimaryScreen', device: 'tablet', confirmed: true });
  const exported = JSON.parse(JSON.stringify(h.document)) as unknown;
  validate(exported);
  assert.deepEqual(normalizeDocument(exported), h.document);
  const imported = setup();
  roundTrip(imported, { type: 'ImportDocument', document: exported });
  assert.deepEqual(imported.document, h.document);
});
test('propagation never copies content, style, visibility, layers or reading order', () => {
  const h = setup();
  h.commit({ type: 'SetNodeVisibility', id, device: 'desktop', value: true });
  h.commit({
    type: 'UpdateNodeStyle',
    id,
    device: 'mobile',
    style: { fontSizePx: 23 },
  });
  h.commit({
    type: 'SetLayer',
    id,
    device: 'mobile',
    band: 'decorative',
    order: 7,
  });
  const nodes = structuredClone(h.document.nodes),
    reading = [...h.document.sections[0]!.readingOrder];
  move(h, 'desktop', 77);
  assert.deepEqual(h.document.nodes, nodes);
  assert.deepEqual(h.document.sections[0]!.readingOrder, reading);
  assert.equal(p(h.document, 'mobile').hidden, false);
  assert.equal(p(h.document, 'mobile').layerBand, 'decorative');
  assert.equal(p(h.document, 'mobile').layerOrder, 7);
});
test('invalid metadata rejected; missing metadata defaults conservatively', () => {
  const d = setup().document;
  for (const bad of ['phone', 'unknown', null])
    assert.throws(() => normalizeDocument({ ...d, primaryScreen: bad }));
  const copy = structuredClone(d);
  Reflect.set(p(copy, 'mobile'), 'geometryMode', 'inherited');
  assert.throws(() => validate(copy));
  delete p(d, 'mobile').geometryMode;
  assert.equal(p(normalizeDocument(d), 'mobile').geometryMode, 'custom');
});
