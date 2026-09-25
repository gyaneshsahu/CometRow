import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  createNode,
  placement,
  validate,
  devices,
  sectionHeight,
  snap,
  validateFile,
} from './lab-model.js';
import { History, execute } from './lab-commands.js';
function populated() {
  let d = seed();
  for (const type of [
    'heading',
    'paragraph',
    'image',
    'video',
    'button',
    'shape',
  ] as const)
    d = execute(d, {
      type: 'AddNode',
      node: createNode(type, 'node-' + type),
      placement: placement(type),
      device: 'desktop',
    });
  return d;
}
const corruptions: Record<string, (d: ReturnType<typeof seed>) => void> = {
  'unknown version': (d) => {
    Reflect.set(d, 'schemaVersion', 'future');
  },
  'missing child': (d) => {
    delete d.nodes['node-heading'];
  },
  'node key mismatch': (d) => {
    d.nodes['node-heading']!.id = 'other-id';
  },
  'asset key mismatch': (d) => {
    d.assets['sample-image']!.id = 'other-id';
  },
  'missing asset': (d) => {
    delete d.assets['sample-image'];
  },
  'duplicate reading order': (d) => {
    d.sections[0]!.readingOrder.push('node-heading');
  },
  'missing reading order': (d) => {
    d.sections[0]!.readingOrder.pop();
  },
  'missing placement': (d) => {
    delete d.sections[0]!.layouts.tablet.placements['node-heading'];
  },
  'unknown placement': (d) => {
    d.sections[0]!.layouts.desktop.placements['other-node'] =
      placement('heading');
  },
  'negative y': (d) => {
    d.sections[0]!.layouts.desktop.placements['node-heading']!.yPx = -1;
  },
  'fractional geometry': (d) => {
    d.sections[0]!.layouts.desktop.placements['node-heading']!.x = 1.5;
  },
  'horizontal bounds': (d) => {
    d.sections[0]!.layouts.desktop.placements['node-heading']!.x = 470;
  },
  'invalid height': (d) => {
    d.sections[0]!.layouts.desktop.placements['node-heading']!.height = {
      mode: 'fixed',
      px: -4,
    };
  },
  'fixed section overflow': (d) => {
    d.sections[0]!.layouts.desktop.height = { mode: 'fixed', px: 240 };
  },
  'non-image background': (d) => {
    d.sections[0]!.layouts.desktop.placements[
      'node-heading'
    ]!.sectionBackground = true;
  },
  'button in decorative band': (d) => {
    d.sections[0]!.layouts.desktop.placements['node-button']!.layerBand =
      'decorative';
  },
  'decorative alt conflict': (d) => {
    const n = d.nodes['node-image']!;
    if (n.type === 'image') n.content.decorative = true;
  },
  'missing alt': (d) => {
    const n = d.nodes['node-image']!;
    if (n.type === 'image') n.content.alt = '';
  },
  'unmuted autoplay': (d) => {
    const n = d.nodes['node-video']!;
    if (n.type === 'video') {
      n.content.autoplay = true;
      n.content.muted = false;
    }
  },
  'unsafe link': (d) => {
    const n = d.nodes['node-button']!;
    if (n.type === 'button') n.content.action.value = 'javascript:alert(1)';
  },
  'unsafe media': (d) => {
    d.assets['sample-video']!.source = {
      kind: 'url',
      url: 'data:text/html,<script>alert(1)</script>',
    };
  },
  'unsafe sample path': (d) => {
    d.assets['sample-image']!.source = {
      kind: 'sample',
      path: '//example.com/evil.svg',
    };
  },
  'unknown HTML payload': (d) => {
    Reflect.set(d.nodes['node-heading']!, 'html', '<script>alert(1)</script>');
  },
  'embedded data URL': (d) => {
    d.assets['sample-image']!.source = {
      kind: 'local',
      blobKey: 'blob-local',
      embeddedDataUrl: 'data:text/html,evil',
    };
  },
};
for (const [name, mutate] of Object.entries(corruptions))
  test('reject ' + name, () => {
    const d = populated();
    mutate(d);
    assert.throws(() => validate(d));
  });
test('auto section ignores hidden nodes and background, measured copy sets height', () => {
  const d = populated(),
    l = d.sections[0]!.layouts.mobile;
  // Isolate height calculation from the separately tested responsive generation.
  for (const p of Object.values(l.placements)) p.hidden = true;
  l.placements['node-heading']!.hidden = false;
  l.placements['node-heading']!.yPx = 800;
  assert.equal(sectionHeight(d, 'mobile', { 'node-heading': 240 }), 1072);
  l.placements['node-heading']!.hidden = true;
  assert.equal(sectionHeight(d, 'mobile'), 640);
});
test('snap centers, bounds, edges and equal gaps on both axes; precision bypass', () => {
  const p = placement('shape', 102, 101);
  p.w = 80;
  p.height = { mode: 'fixed', px: 80 };
  const a = { ...p, x: 0, yPx: 0 },
    b = { ...p, x: 280, yPx: 280 };
  const equal = snap({ ...p, x: 141, yPx: 141 }, [a, b]);
  assert.equal(equal.placement.x, 140);
  assert.equal(equal.placement.yPx, 140);
  assert.ok(equal.guides.includes('Equal horizontal gaps'));
  assert.ok(equal.guides.includes('Equal vertical gaps'));
  assert.equal(snap({ ...p, x: 199 }, []).placement.x, 200);
  assert.equal(snap({ ...p, x: 399 }, []).placement.x, 400);
  assert.equal(
    snap({ ...p, yPx: 279 }, [], false, 1200, 640).placement.yPx,
    280,
  );
  assert.equal(snap(p, [a], true).placement.yPx, 101);
});
test('commands are immutable, one drag entry, redo branches, typing coalesces', () => {
  const base = populated(),
    serialized = JSON.stringify(base),
    h = new History(base);
  const p = {
    ...base.sections[0]!.layouts.desktop.placements['node-heading']!,
    x: 45,
  };
  h.commit({
    type: 'MoveNode',
    id: 'node-heading',
    device: 'desktop',
    placement: p,
  });
  assert.equal(h.past.length, 1);
  assert.equal(JSON.stringify(base), serialized);
  const after = JSON.stringify(h.document);
  h.undo();
  assert.equal(JSON.stringify(h.document), serialized);
  h.redo();
  assert.equal(JSON.stringify(h.document), after);
  for (const text of ['One', 'Two']) {
    const n = structuredClone(h.document.nodes['node-heading']!);
    if (n.type === 'heading') n.content.text = text;
    h.commit({ type: 'UpdateNodeContent', id: n.id, node: n }, 'typing');
  }
  assert.equal(h.past.length, 2);
  h.undo();
  h.commit({
    type: 'LockNode',
    id: 'node-heading',
    device: 'tablet',
    value: true,
  });
  assert.equal(h.future.length, 0);
});
test('duplicate, responsive alternatives, change type, delete and undo', () => {
  const h = new History(populated());
  h.commit({
    type: 'DuplicateNode',
    id: 'node-heading',
    newId: 'heading-mobile',
  });
  for (const device of ['tablet', 'desktop'] as const)
    h.commit({
      type: 'SetNodeVisibility',
      id: 'heading-mobile',
      device,
      value: true,
    });
  h.commit({
    type: 'SetNodeVisibility',
    id: 'node-heading',
    device: 'mobile',
    value: true,
  });
  assert.equal(
    h.document.sections[0]!.layouts.mobile.placements['heading-mobile']!.hidden,
    false,
  );
  h.commit({
    type: 'ChangeNodeType',
    id: 'heading-mobile',
    node: createNode('button', 'heading-mobile'),
  });
  for (const b of devices)
    assert.equal(
      h.document.sections[0]!.layouts[b].placements['heading-mobile']!
        .layerBand,
      'interactive',
    );
  h.commit({ type: 'DeleteNode', id: 'heading-mobile', confirmed: true });
  h.undo();
  validate(h.document);
  assert.ok(h.document.nodes['heading-mobile']);
});
test('supported local files and size boundaries', () => {
  validateFile({ type: 'image/png', size: 5 * 1024 * 1024 });
  for (const f of [
    { type: 'video/mp4', size: 100 },
    { type: 'image/png', size: 0 },
    { type: 'image/png', size: 5 * 1024 * 1024 + 1 },
  ])
    assert.throws(() => validateFile(f));
});
