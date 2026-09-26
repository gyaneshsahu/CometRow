import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  seed,
  createNode,
  placement,
  devices,
  nodeHeight,
  validate,
  type Kind,
} from './lab-model.js';
import { autoLayout, estimateText, regenerateAuto } from './lab-auto-layout.js';
import {
  layoutGraph,
  graphLeaves,
  inferredRole,
  type LayoutGraph,
} from './lab-layout-graph.js';
import { History } from './lab-commands.js';

function draft() {
  const d = seed();
  const add = (
    type: Kind,
    x: number,
    y: number,
    w: number,
    height?: number,
  ) => {
    const n = createNode(type);
    if (n.type === 'heading') n.content.text = 'A new way to create';
    if (n.type === 'paragraph')
      n.content.text =
        'Discover practical skills and meet people who share your curiosity.';
    if (n.type === 'button') n.content.label = 'Explore';
    d.nodes[n.id] = n;
    d.sections[0]!.childIds.push(n.id);
    d.sections[0]!.readingOrder.unshift(n.id); // Creation/DOM order is not visual order.
    for (const b of devices)
      d.sections[0]!.layouts[b].placements[n.id] = {
        ...placement(type, x, y),
        w,
        ...(height ? { height: { mode: 'fixed' as const, px: height } } : {}),
        geometryMode: b === 'desktop' ? 'custom' : 'auto',
      };
    return n.id;
  };
  return { d, add };
}
const allGroups = (g: LayoutGraph): LayoutGraph[] => [
  g,
  ...g.children.flatMap(allGroups),
];

test('a single side image stays associated with the complete copy column including its CTA row', () => {
  for (const offset of [18, 28, 42]) {
    const { d, add } = draft();
    const heading = add('heading', offset, 76, 200),
      para = add('paragraph', offset, 240, 200);
    const a = add('button', offset, 376, 90),
      b = add('button', offset + 100, 378, 90);
    const photo = add('image', 280, 100, 160);
    const p = autoLayout(d, 'mobile').layout.placements;
    assert.ok(p[heading]!.yPx < p[para]!.yPx);
    assert.ok(p[para]!.yPx < p[a]!.yPx);
    assert.ok(p[photo]!.yPx >= p[b]!.yPx + nodeHeight(p[b]!, 390));
  }
});

test('ordinary hero infers semantic roles and CTA adjacency without predefined relationships', () => {
  const { d, add } = draft();
  const para = add('paragraph', 80, 160, 320),
    heading = add('heading', 80, 240, 320);
  const a = add('button', 105, 340, 110),
    b = add('button', 225, 343, 140);
  const media = add('image', 180, 430, 120),
    art = add('image', 12, 20, 30);
  const background = add('image', 0, 0, 480, 680);
  for (const id of [para, heading, media])
    d.sections[0]!.layouts.desktop.placements[id]!.layerOrder = 1;
  const original = structuredClone(d.sections[0]!.layouts.desktop);
  assert.equal(d.sections[0]!.responsive, undefined);
  assert.equal(inferredRole(d, art).role, 'decoration');
  assert.equal(inferredRole(d, media).role, 'content');
  assert.equal(inferredRole(d, background).role, 'background');
  const graph = layoutGraph(d, estimateText).root;
  assert.ok(
    allGroups(graph).some(
      (g) => g.mode === 'row' && graphLeaves(g).join() === [a, b].join(),
    ),
  );
  for (const width of [320, 390, 640, 768, 1024, 1440]) {
    const result = autoLayout(
      d,
      width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
      width,
    );
    const p = result.layout.placements;
    assert.ok(p[para]!.yPx + nodeHeight(p[para]!, width) <= p[heading]!.yPx);
    assert.ok(p[heading]!.yPx + nodeHeight(p[heading]!, width) <= p[a]!.yPx);
    assert.ok(
      p[media]!.yPx >=
        Math.max(
          p[a]!.yPx + nodeHeight(p[a]!, width),
          p[b]!.yPx + nodeHeight(p[b]!, width),
        ),
    );
    assert.ok((p[media]!.w / 480) * width <= 300);
    assert.equal(p[background]!.sectionBackground, true);
    if (width >= 768) assert.equal(p[a]!.yPx, p[b]!.yPx);
    else assert.ok(p[b]!.yPx > p[a]!.yPx);
  }
  regenerateAuto(d);
  validate(d);
  assert.deepEqual(d.sections[0]!.layouts.desktop, original);
  const restored = JSON.parse(JSON.stringify(d));
  validate(restored);
  assert.deepEqual(autoLayout(restored, 'mobile'), autoLayout(d, 'mobile'));
});

test('three cards under a spanning heading infer complete columns, not rows of unrelated titles', () => {
  const { d, add } = draft();
  const title = add('heading', 20, 30, 440);
  const cards = [20, 180, 340].map((x) => [
    add('heading', x, 140, 120),
    add('paragraph', x, 280, 120),
    add('image', x, 410, 120),
  ]);
  const p = autoLayout(d, 'mobile').layout.placements;
  let previous = title;
  for (const card of cards)
    for (const id of card) {
      assert.ok(p[id]!.yPx >= p[previous]!.yPx + nodeHeight(p[previous]!, 390));
      previous = id;
    }
});

test('nearby buttons associated with separate card text do not merge into one CTA pair', () => {
  const { d, add } = draft();
  add('paragraph', 40, 100, 130);
  add('paragraph', 180, 100, 130);
  const a = add('button', 40, 200, 130),
    b = add('button', 180, 200, 130);
  const groups = allGroups(layoutGraph(d, estimateText).root);
  assert.ok(
    !groups.some(
      (g) =>
        g.mode === 'row' &&
        graphLeaves(g).length === 2 &&
        graphLeaves(g).includes(a) &&
        graphLeaves(g).includes(b),
    ),
  );
});

test('contained text over media infers overlay while partial overlap requests clarification', () => {
  const { d, add } = draft();
  const media = add('image', 60, 120, 320, 360),
    label = add('heading', 90, 180, 240);
  d.sections[0]!.layouts.desktop.placements[label]!.layerOrder = 1;
  assert.ok(
    allGroups(layoutGraph(d, estimateText).root).some(
      (g) => g.mode === 'overlay' && graphLeaves(g).includes(media),
    ),
  );
  d.sections[0]!.layouts.desktop.placements[label]!.x = 220;
  assert.ok(layoutGraph(d, estimateText).ambiguities.length > 0);
});

test('automatic decoration becomes content after a Primary move; explicit layer choices stay protected', () => {
  const { d, add } = draft();
  add('paragraph', 100, 180, 300);
  add('heading', 100, 260, 300);
  const art = add('image', 10, 10, 30);
  regenerateAuto(d);
  assert.equal(
    d.sections[0]!.layouts.mobile.placements[art]!.inferredRole,
    'decoration',
  );
  const h = new History(d);
  h.commit({
    type: 'MoveNode',
    id: art,
    device: 'desktop',
    placement: {
      ...h.document.sections[0]!.layouts.desktop.placements[art]!,
      x: 150,
      yPx: 380,
    },
  });
  assert.equal(
    h.document.sections[0]!.layouts.mobile.placements[art]!.inferredRole,
    'content',
  );
  assert.equal(
    h.document.sections[0]!.layouts.mobile.placements[art]!.layerBand,
    'content',
  );
});

test('saved user clarification survives export/import and Phone edits protect Primary and Custom', () => {
  const { d, add } = draft();
  const a = add('button', 40, 140, 100),
    b = add('button', 280, 170, 100);
  const h = new History(d),
    primary = structuredClone(d.sections[0]!.layouts.desktop);
  h.commit({
    type: 'SetResponsiveRelationships',
    relationships: {
      groups: [
        {
          id: 'author-choice',
          name: 'Related elements',
          layout: 'row',
          children: [a, b],
        },
      ],
      roles: {},
    },
  });
  const serialized = JSON.parse(JSON.stringify(h.document));
  validate(serialized);
  const restored = new History(seed());
  restored.commit({ type: 'ImportDocument', document: serialized });
  assert.deepEqual(
    restored.document.sections[0]!.responsive,
    serialized.sections[0]!.responsive,
  );
  restored.commit({
    type: 'MoveNode',
    id: a,
    device: 'mobile',
    placement: {
      ...restored.document.sections[0]!.layouts.mobile.placements[a]!,
      x: 25,
      yPx: 400,
    },
  });
  const custom = structuredClone(
    restored.document.sections[0]!.layouts.mobile.placements[a],
  );
  restored.commit({
    type: 'MoveNode',
    id: b,
    device: 'desktop',
    placement: {
      ...restored.document.sections[0]!.layouts.desktop.placements[b]!,
      x: 260,
      yPx: 180,
    },
  });
  assert.deepEqual(
    restored.document.sections[0]!.layouts.mobile.placements[a],
    custom,
  );
  assert.deepEqual(h.document.sections[0]!.layouts.desktop, primary);
});
