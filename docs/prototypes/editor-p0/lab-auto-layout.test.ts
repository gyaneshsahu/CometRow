import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  responsiveFixture,
  fixtureNames,
  responsiveWidths,
} from './lab-responsive-fixtures.js';
import { autoLayout, ordinary, estimateText } from './lab-auto-layout.js';
import { breakpoint, nodeHeight, resolved, validate } from './lab-model.js';
import { History } from './lab-commands.js';

for (const name of fixtureNames)
  test(
    name +
      ': deterministic Auto generation, bounds and collision freedom at every width',
    () => {
      const d = responsiveFixture(name),
        original = structuredClone(d);
      for (const width of responsiveWidths) {
        const b = breakpoint(width),
          a = autoLayout(d, b, width),
          again = autoLayout(d, b, width);
        assert.deepEqual(a, again);
        if (b === 'desktop') continue;
        const boxes = Object.entries(a.layout.placements);
        for (const [id, p] of boxes) {
          assert.equal(p.geometryMode, 'auto');
          assert.ok(p.x >= 0 && p.x + p.w <= 480);
          const height =
            p.height.mode === 'auto'
              ? Math.max(
                  p.height.minPx,
                  estimateText(
                    d.nodes[id]!,
                    (p.w / 480) * width,
                    a.styles[id]!,
                  ),
                )
              : nodeHeight(p, width);
          assert.ok(p.yPx + height <= a.height + 1, id + ' fits section');
          if (!ordinary(p)) continue;
          for (const [other, q] of boxes) {
            if (other === id || !ordinary(q)) continue;
            const qHeight = nodeHeight(q, width);
            assert.ok(
              !(
                p.x < q.x + q.w &&
                p.x + p.w > q.x &&
                p.yPx < q.yPx + qHeight &&
                p.yPx + height > q.yPx
              ),
              id + '/' + other + ' collision',
            );
          }
        }
      }
      assert.deepEqual(d, original);
    },
  );

test('background fills generated height and retains band, focal point and lock', () => {
  const d = responsiveFixture('campaign');
  for (const b of ['mobile', 'tablet'] as const) {
    const a = autoLayout(d, b),
      p = a.layout.placements.background!;
    assert.equal(p.x, 0);
    assert.equal(p.w, 480);
    assert.equal(p.yPx, 0);
    assert.deepEqual(p.height, { mode: 'fixed', px: a.height });
    assert.equal(p.layerBand, 'background');
    assert.equal(p.locked, true);
    assert.equal(a.styles.background!.objectFit, 'cover');
    assert.equal(a.styles.background!.objectPositionX, 30);
    assert.equal(a.styles.background!.objectPositionY, 65);
  }
});

test('visual paragraph-heading-CTA-media order is preserved independent of reading order', () => {
  const d = responsiveFixture('campaign');
  d.sections[0]!.readingOrder.reverse();
  const a = autoLayout(d, 'mobile');
  const ids = ['intro', 'headline', 'cta', 'product'];
  for (let i = 1; i < ids.length; i++) {
    const prev = a.layout.placements[ids[i - 1]!]!,
      next = a.layout.placements[ids[i]!]!;
    assert.ok(next.yPx >= prev.yPx + nodeHeight(prev, 390) + 20);
  }
});

test('decorative overlap does not push ordinary content or inflate the section', () => {
  const d = responsiveFixture('campaign'),
    a = autoLayout(d, 'mobile');
  d.sections[0]!.layouts.desktop.placements.circle!.yPx = 3000;
  d.sections[0]!.layouts.desktop.placements.circle!.height = {
    mode: 'fixed',
    px: 2000,
  };
  const b = autoLayout(d, 'mobile');
  for (const id of ['intro', 'headline', 'cta', 'product'])
    assert.deepEqual(a.layout.placements[id], b.layout.placements[id]);
  assert.equal(a.height, b.height);
  assert.equal(b.layout.placements.circle!.layerBand, 'decorative');
  assert.equal(b.layout.placements.accent!.layerBand, 'decorative');
  // A breakpoint-local decorative band also stays outside ordinary flow.
  d.sections[0]!.layouts.mobile.placements.headline!.layerBand = 'decorative';
  const local = autoLayout(d, 'mobile');
  const taller = autoLayout(
    d,
    'mobile',
    390,
    (n, w, s) => estimateText(n, w, s) + (n.id === 'headline' ? 500 : 0),
  );
  assert.deepEqual(local.layout.placements.cta, taller.layout.placements.cta);
  assert.equal(local.height, taller.height);
});

test('text measurement changes downstream Auto positions and section height', () => {
  const d = responsiveFixture('campaign'),
    a = autoLayout(d, 'mobile');
  const b = autoLayout(
    d,
    'mobile',
    390,
    (n, w, s) =>
      estimateText(n, w, s) + (n.id === 'headline' && w < 700 ? 200 : 0),
  );
  assert.equal(
    b.layout.placements.cta!.yPx - a.layout.placements.cta!.yPx,
    200,
  );
  assert.equal(
    b.layout.placements.product!.yPx - a.layout.placements.product!.yPx,
    200,
  );
  assert.ok(b.height > a.height);
  assert.equal(b.layout.placements.headline!.height.mode, 'auto');
});

test('Tablet retains two columns and Phone stacks the entire copy group before media', () => {
  const d = responsiveFixture('launch'),
    tablet = autoLayout(d, 'tablet', 640),
    phone = autoLayout(d, 'mobile', 390);
  assert.ok(
    tablet.layout.placements.headline!.x +
      tablet.layout.placements.headline!.w <
      tablet.layout.placements.product!.x,
  );
  assert.equal(
    tablet.layout.placements.headline!.yPx,
    tablet.layout.placements.product!.yPx,
  );
  assert.equal(
    phone.layout.placements.headline!.x,
    phone.layout.placements.product!.x,
  );
  assert.ok(
    phone.layout.placements.product!.yPx >
      phone.layout.placements.cta!.yPx +
        nodeHeight(phone.layout.placements.cta!, 390),
  );
});

test('portrait and landscape media keep authored ratios; CTA retains pixel width when it fits', () => {
  const d = responsiveFixture('stress');
  for (const b of ['mobile', 'tablet'] as const) {
    const a = autoLayout(d, b);
    assert.deepEqual(a.layout.placements.portrait!.height, {
      mode: 'aspect',
      ratio: 3 / 4,
    });
    assert.deepEqual(a.layout.placements.landscape!.height, {
      mode: 'aspect',
      ratio: 16 / 9,
    });
    assert.ok(
      nodeHeight(a.layout.placements.cta!, d.breakpoints[b].previewWidthPx) >=
        44,
    );
  }
  const launch = responsiveFixture('launch'),
    a = autoLayout(launch, 'tablet');
  assert.ok(Math.abs((a.layout.placements.cta!.w / 480) * 768 - 375) < 2);
});

test('Custom geometry and local styles survive regeneration and act as fixed obstacles', () => {
  const h = new History(responsiveFixture('campaign'));
  const p = h.document.sections[0]!.layouts.mobile.placements.cta!;
  h.commit({
    type: 'MoveNode',
    id: 'cta',
    device: 'mobile',
    placement: { ...p, x: 24, yPx: 100 },
  });
  const custom = structuredClone(
    h.document.sections[0]!.layouts.mobile.placements.cta!,
  );
  const style = structuredClone(h.document.nodes.cta!.styleOverrides.mobile);
  const heading = structuredClone(h.document.nodes.headline!);
  if (heading.type === 'heading')
    heading.content.text += ' A longer new beginning, with more possibilities.';
  h.commit({ type: 'UpdateNodeContent', id: 'headline', node: heading });
  assert.deepEqual(
    h.document.sections[0]!.layouts.mobile.placements.cta,
    custom,
  );
  assert.deepEqual(h.document.nodes.cta!.styleOverrides.mobile, style);
  h.commit({ type: 'ResetNodeToAuto', id: 'cta', device: 'mobile' });
  const after = structuredClone(h.document);
  assert.equal(
    after.sections[0]!.layouts.mobile.placements.cta!.geometryMode,
    'auto',
  );
  assert.ok(
    after.sections[0]!.layouts.mobile.placements.cta!.yPx >
      after.sections[0]!.layouts.mobile.placements.headline!.yPx,
  );
  h.undo();
  assert.deepEqual(
    h.document.sections[0]!.layouts.mobile.placements.cta,
    custom,
  );
  h.redo();
  assert.deepEqual(h.document, after);
});

test('a Primary content edit regenerates downstream flow in one undoable transaction', () => {
  const h = new History(responsiveFixture('campaign')),
    before = structuredClone(h.document),
    past = h.past.length;
  const n = structuredClone(h.document.nodes.intro!);
  if (n.type === 'paragraph') n.content.text = n.content.text.repeat(3);
  h.commit({ type: 'UpdateNodeContent', id: 'intro', node: n });
  assert.equal(h.past.length, past + 1);
  assert.ok(
    h.document.sections[0]!.layouts.mobile.placements.headline!.yPx >
      before.sections[0]!.layouts.mobile.placements.headline!.yPx,
  );
  h.undo();
  assert.deepEqual(h.document, before);
});

test('making generated Phone Primary preserves its generated typography and geometry', () => {
  const h = new History(responsiveFixture('campaign')),
    visible = autoLayout(h.document, 'mobile');
  h.commit({ type: 'SetPrimaryScreen', device: 'mobile', confirmed: true });
  assert.deepEqual(h.document.sections[0]!.layouts.mobile, visible.layout);
  assert.deepEqual(
    resolved(h.document.nodes.headline!, 'mobile'),
    visible.styles.headline,
  );
});

test('background detach on Primary returns Auto media to normal flow', () => {
  const h = new History(responsiveFixture('campaign'));
  h.commit({
    type: 'DetachImageFromBackground',
    id: 'background',
    device: 'desktop',
  });
  const p = h.document.sections[0]!.layouts.mobile.placements.background!;
  assert.equal(p.sectionBackground, false);
  assert.equal(p.layerBand, 'content');
  assert.equal(p.locked, false);
});

test('fixed sections report insufficient space rather than clipping or overwriting Custom', () => {
  const d = responsiveFixture('stress');
  d.sections[0]!.layouts.mobile.height = { mode: 'fixed', px: 240 };
  assert.ok(autoLayout(d, 'mobile').warnings.length);
});

test('generation and states survive JSON reload without changing Primary or Custom', () => {
  const d = responsiveFixture('campaign');
  validate(d);
  const copy = JSON.parse(JSON.stringify(d));
  validate(copy);
  assert.deepEqual(autoLayout(copy, 'mobile'), autoLayout(d, 'mobile'));
});
