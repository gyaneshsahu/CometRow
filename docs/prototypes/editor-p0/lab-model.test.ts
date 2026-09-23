import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  validate,
  createNode,
  placement,
  devices,
  clamp,
  snap,
  percent,
  units,
  sectionHeight,
  breakpoint,
  zOrder,
  validateFile,
  safeUrl,
} from './lab-model.js';
test('schema, geometry, breakpoint ranges and safe assets', () => {
  const d = seed();
  validate(d);
  assert.equal(percent(240), 50);
  assert.equal(units(600, 1200), 240);
  assert.deepEqual([639, 640, 1023, 1024].map(breakpoint), [
    'mobile',
    'tablet',
    'tablet',
    'desktop',
  ]);
  const p = placement('button', 470, 900);
  const q = clamp(p, 640, 1200);
  assert.equal(q.x + q.w, 480);
  assert.equal(q.yPx, 596);
  assert.equal(snap({ ...q, yPx: 101 }, []).placement.yPx, 104);
  assert.equal(snap({ ...q, yPx: 101 }, [], true).placement.yPx, 101);
  assert.equal(sectionHeight(d, 'desktop'), 640);
  assert.equal(zOrder(q), 300);
  assert.throws(() => validateFile({ type: 'image/svg+xml', size: 5 }));
  assert.throws(() => validateFile({ type: 'image/png', size: 6e6 }));
  for (const u of ['javascript:alert(1)', 'data:text/html,test', 'file:///x'])
    assert.equal(safeUrl(u), false);
});
test('integrity rejects invalid documents', () => {
  const d = seed(),
    n = createNode('heading', 'node-heading');
  d.nodes[n.id] = n;
  d.sections[0]!.childIds = [n.id];
  d.sections[0]!.readingOrder = [n.id];
  for (const b of devices)
    d.sections[0]!.layouts[b].placements[n.id] = placement('heading');
  validate(d);
  for (const mutate of [
    (v: typeof d) => {
      v.schemaVersion = 'wrong' as typeof v.schemaVersion;
    },
    (v: typeof d) => {
      v.nodes[n.id]!.id = 'wrong-id';
    },
    (v: typeof d) => {
      v.sections[0]!.readingOrder = [];
    },
    (v: typeof d) => {
      delete v.sections[0]!.layouts.mobile.placements[n.id];
    },
    (v: typeof d) => {
      v.sections[0]!.layouts.desktop.placements[n.id]!.x = 470;
    },
    (v: typeof d) => {
      v.sections[0]!.layouts.desktop.placements[n.id]!.sectionBackground = true;
    },
  ]) {
    const copy = structuredClone(d);
    mutate(copy);
    assert.throws(() => validate(copy));
  }
});
