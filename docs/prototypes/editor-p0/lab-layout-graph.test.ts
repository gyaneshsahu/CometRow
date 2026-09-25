import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  relationshipFixture,
  relationshipNames,
} from './lab-relationship-fixtures.js';
import { autoLayout, estimateText } from './lab-auto-layout.js';
import { layoutGraph, graphLeaves } from './lab-layout-graph.js';
import { breakpoint, nodeHeight, validate } from './lab-model.js';
import { History } from './lab-commands.js';
import { responsiveWidths } from './lab-responsive-fixtures.js';

for (const name of relationshipNames)
  test(
    name + ': graph order and group membership survive every responsive width',
    () => {
      const d = relationshipFixture(name),
        original = structuredClone(d);
      validate(d);
      const graph = layoutGraph(d, estimateText).root;
      assert.deepEqual(
        new Set(graphLeaves(graph)),
        new Set(
          d.sections[0]!.childIds.filter(
            (id) =>
              !d.sections[0]!.layouts.desktop.placements[id]!
                .sectionBackground &&
              d.sections[0]!.responsive!.roles[id] !== 'decoration',
          ),
        ),
      );
      for (const width of responsiveWidths) {
        const b = breakpoint(width),
          a = autoLayout(d, b, width);
        assert.deepEqual(a, autoLayout(d, b, width));
        for (const p of Object.values(a.layout.placements))
          assert.ok(p.x >= 0 && p.x + p.w <= 480);
        if (b === 'desktop') continue;
        const p = a.layout.placements;
        if (name === 'founder' || name === 'offsets') {
          assert.ok(
            p.intro!.yPx + nodeHeight(p.intro!, width) <= p.headline!.yPx,
          );
          assert.ok(
            p.headline!.yPx + nodeHeight(p.headline!, width) <=
              p['first-cta']!.yPx,
          );
          assert.ok(
            p.foreground!.yPx >=
              Math.max(
                ...['first-cta', 'second-cta'].map(
                  (id) => p[id]!.yPx + nodeHeight(p[id]!, width),
                ),
              ),
          );
          assert.ok(
            (p.foreground!.w / 480) * width <=
              (d.sections[0]!.layouts.desktop.placements.foreground!.w / 480) *
                1200 +
                1,
          );
          if (width >= 768)
            assert.equal(
              p['first-cta']!.yPx,
              p['second-cta']!.yPx,
              'CTA row preserved',
            );
          else {
            assert.ok(
              p['second-cta']!.yPx >=
                p['first-cta']!.yPx + nodeHeight(p['first-cta']!, width),
            );
            assert.ok(
              p['second-cta']!.yPx -
                p['first-cta']!.yPx -
                nodeHeight(p['first-cta']!, width) <=
                49,
              'CTA siblings adjacent',
            );
          }
        }
        if (name === 'cards' || name === 'spanning') {
          const count = name === 'cards' ? 3 : 2;
          for (let i = 0; i < count; i++) {
            assert.ok(
              p['spanning-title']!.yPx +
                nodeHeight(p['spanning-title']!, width) <=
                p['title-' + i]!.yPx,
            );
            assert.ok(
              p['title-' + i]!.yPx < p['copy-' + i]!.yPx &&
                p['copy-' + i]!.yPx < p['photo-' + i]!.yPx,
              'card content remains associated',
            );
            if (width <= 390 && i > 0)
              assert.ok(
                p['title-' + i]!.yPx > p['photo-' + (i - 1)]!.yPx,
                'entire card stacks together',
              );
          }
        }
        if (name === 'overlap') {
          assert.ok(
            p.caption!.yPx < p.photo!.yPx + nodeHeight(p.photo!, width),
            'intentional overlap retained',
          );
          assert.ok(
            p.cta!.yPx >=
              Math.max(
                p.caption!.yPx + nodeHeight(p.caption!, width),
                p.photo!.yPx + nodeHeight(p.photo!, width),
              ),
            'following content clears entire overlay',
          );
        }
      }
      assert.deepEqual(d, original);
    },
  );

test('unseen CTA rows and spanning headings infer nested structure without IDs or semantic sorting', () => {
  const d = relationshipFixture('founder');
  d.sections[0]!.responsive!.groups = [];
  // Keep the inference example unambiguous even with conservative non-DOM measurement.
  d.nodes.headline!.baseStyle.fontSizePx = 44;
  d.nodes.intro!.baseStyle.fontSizePx = 18;
  const ids = d.sections[0]!.childIds;
  d.sections[0]!.readingOrder = [...ids].reverse();
  const a = autoLayout(d, 'tablet', 768).layout.placements;
  assert.ok(a.intro!.yPx < a.headline!.yPx);
  assert.equal(a['first-cta']!.yPx, a['second-cta']!.yPx);
  assert.ok(a.foreground!.yPx > a['second-cta']!.yPx);
});
test('renaming all elements and reversing creation order does not change generated geometry', () => {
  const d = relationshipFixture('cards'),
    copy = structuredClone(d);
  const rename = new Map(
    copy.sections[0]!.childIds.map((id, i) => [id, 'unseen-' + i]),
  );
  copy.nodes = Object.fromEntries(
    Object.entries(copy.nodes)
      .reverse()
      .map(([id, n]) => [rename.get(id)!, { ...n, id: rename.get(id)! }]),
  );
  const s = copy.sections[0]!;
  s.childIds = s.childIds.map((id) => rename.get(id)!).reverse();
  s.readingOrder = [...s.childIds];
  for (const g of s.responsive!.groups)
    g.children = g.children.map((id) => rename.get(id) ?? id);
  for (const l of Object.values(s.layouts))
    l.placements = Object.fromEntries(
      Object.entries(l.placements).map(([id, p]) => [rename.get(id)!, p]),
    );
  validate(copy);
  for (const width of [320, 768, 1023]) {
    const a = autoLayout(d, breakpoint(width), width),
      b = autoLayout(copy, breakpoint(width), width);
    for (const [id, renamed] of rename)
      assert.deepEqual(a.layout.placements[id], b.layout.placements[renamed]);
  }
});
test('relationships reject cycles, duplicate ownership, dangling members and malformed roles atomically', () => {
  const h = new History(relationshipFixture('founder')),
    before = structuredClone(h.document);
  const r = before.sections[0]!.responsive!;
  for (const broken of [
    {
      ...r,
      groups: [
        ...r.groups,
        {
          id: 'cycle',
          name: 'cycle',
          layout: 'row' as const,
          children: ['cycle'],
        },
      ],
    },
    {
      ...r,
      groups: [
        ...r.groups,
        {
          id: 'double',
          name: 'double',
          layout: 'row' as const,
          children: ['intro'],
        },
      ],
    },
    {
      ...r,
      groups: [
        ...r.groups,
        {
          id: 'missing',
          name: 'missing',
          layout: 'row' as const,
          children: ['unknown'],
        },
      ],
    },
    { ...r, roles: { unknown: 'decoration' as const } },
  ]) {
    assert.throws(() =>
      h.commit({ type: 'SetResponsiveRelationships', relationships: broken }),
    );
    assert.deepEqual(h.document, before);
  }
});
test('group edits, deletion, duplication and undo preserve membership and Custom geometry', () => {
  const h = new History(relationshipFixture('founder'));
  h.commit({
    type: 'MoveNode',
    id: 'first-cta',
    device: 'mobile',
    placement: {
      ...h.document.sections[0]!.layouts.mobile.placements['first-cta']!,
      x: 30,
      yPx: 200,
    },
  });
  const custom = structuredClone(
    h.document.sections[0]!.layouts.mobile.placements['first-cta'],
  );
  const r = structuredClone(h.document.sections[0]!.responsive!);
  r.groups[0]!.layout = 'stack';
  const before = structuredClone(h.document);
  h.commit({ type: 'SetResponsiveRelationships', relationships: r });
  assert.deepEqual(
    h.document.sections[0]!.layouts.mobile.placements['first-cta'],
    custom,
  );
  h.undo();
  assert.deepEqual(h.document, before);
  h.redo();
  h.commit({ type: 'DuplicateNode', id: 'second-cta', newId: 'third-cta' });
  assert.ok(
    h.document.sections[0]!.responsive!.groups[0]!.children.includes(
      'third-cta',
    ),
  );
  h.commit({ type: 'DeleteNode', id: 'second-cta', confirmed: true });
  validate(h.document);
  assert.ok(
    !h.document.sections[0]!.responsive!.groups[0]!.children.includes(
      'second-cta',
    ),
  );
  h.undo();
  assert.ok(
    h.document.sections[0]!.responsive!.groups[0]!.children.includes(
      'second-cta',
    ),
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(h.document)).sections[0].responsive,
    h.document.sections[0]!.responsive,
  );
});
test('ambiguous overlap is surfaced until the author specifies a relationship', () => {
  const d = relationshipFixture('overlap');
  delete d.sections[0]!.responsive;
  assert.ok(layoutGraph(d, estimateText).ambiguities.length);
  assert.equal(
    layoutGraph(relationshipFixture('overlap'), estimateText).ambiguities
      .length,
    0,
  );
});

test('Primary reference geometry is immutable while declared relationships adapt at other Desktop widths', () => {
  const d = relationshipFixture('founder'),
    before = structuredClone(d);
  assert.deepEqual(
    autoLayout(d, 'desktop', 1200).layout,
    d.sections[0]!.layouts.desktop,
  );
  for (const width of [1024, 1440]) {
    const a = autoLayout(d, 'desktop', width),
      p = a.layout.placements;
    assert.ok(p.intro!.yPx + nodeHeight(p.intro!, width) <= p.headline!.yPx);
    assert.equal(p['first-cta']!.yPx, p['second-cta']!.yPx);
    assert.ok(p.foreground!.yPx > p['second-cta']!.yPx);
  }
  assert.deepEqual(d, before);
});

test('mixed Custom and Auto relationships produce an actionable notice without overwriting Custom', () => {
  const d = relationshipFixture('founder');
  const custom = d.sections[0]!.layouts.mobile.placements['first-cta']!;
  custom.geometryMode = 'custom';
  custom.yPx = 77;
  const before = structuredClone(custom),
    a = autoLayout(d, 'mobile');
  assert.deepEqual(a.layout.placements['first-cta'], before);
  assert.ok(a.notes?.some((note) => note.includes('protected Custom')));
});
