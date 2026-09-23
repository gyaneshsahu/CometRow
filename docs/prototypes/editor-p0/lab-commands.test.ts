import { test } from 'node:test';
import assert from 'node:assert/strict';
import { History } from './lab-commands.js';
import { seed, createNode, placement } from './lab-model.js';
test('independent commands, history, protected generation, background and semantics', () => {
  const h = new History(seed()),
    n = createNode('image', 'node-image');
  h.commit({
    type: 'AddNode',
    node: n,
    placement: placement('image'),
    device: 'desktop',
  });
  const mobile = structuredClone(h.document.sections[0]!.layouts.mobile);
  h.commit({ type: 'SetImageAsBackground', id: n.id, device: 'desktop' });
  assert.deepEqual(h.document.sections[0]!.layouts.mobile, mobile);
  const p = h.document.sections[0]!.layouts.desktop.placements[n.id]!;
  assert.equal(p.w, 480);
  assert.equal(p.locked, true);
  h.commit({ type: 'DetachImageFromBackground', id: n.id, device: 'desktop' });
  h.undo();
  assert.equal(
    h.document.sections[0]!.layouts.desktop.placements[n.id]!.locked,
    true,
  );
  h.redo();
  assert.equal(
    h.document.sections[0]!.layouts.desktop.placements[n.id]!.locked,
    false,
  );
  h.undo();
  assert.throws(() =>
    h.commit({
      type: 'ApplyGeneratedBreakpointLayout',
      device: 'desktop',
      from: 'mobile',
    }),
  );
  const reading = structuredClone(h.document.sections[0]!.readingOrder);
  h.commit({
    type: 'SetLayer',
    id: n.id,
    device: 'mobile',
    band: 'decorative',
    order: 3,
  });
  assert.deepEqual(h.document.sections[0]!.readingOrder, reading);
  h.commit({
    type: 'UpdateNodeStyle',
    id: n.id,
    device: 'mobile',
    style: { opacity: 0.5 },
  });
  h.commit({
    type: 'UpdateNodeStyle',
    id: n.id,
    device: 'all',
    style: { opacity: 0.8 },
  });
  assert.equal(
    h.document.nodes[n.id]!.styleOverrides.mobile?.opacity,
    undefined,
  );
  h.commit({
    type: 'ResetBreakpointLayout',
    device: 'desktop',
    from: 'mobile',
    confirmed: true,
  });
  assert.equal(h.document.sections[0]!.layouts.desktop.origin, 'generated');
});
