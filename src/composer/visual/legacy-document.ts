import { z } from 'zod';
import {
  devices,
  sectionSchema,
  nodeSchema,
  styleSchema,
} from './legacy-model.js';

export const ENGINE_VERSION = 'visual/1' as const;
const snapshotSchema = z.strictObject({
  height: z.number().positive().max(4000),
  styles: z.record(z.uuid(), styleSchema),
  heights: z.record(z.uuid(), z.number().positive().max(4000)),
});
export const visualShape = z.strictObject({
  layoutEngineVersion: z.literal(ENGINE_VERSION),
  primaryScreen: z.enum(devices),
  section: sectionSchema,
  nodes: z.record(z.uuid(), nodeSchema),
  resolved: z.strictObject({
    mobile: snapshotSchema,
    tablet: snapshotSchema,
    desktop: snapshotSchema,
  }),
});
export type VisualData = z.infer<typeof visualShape>;
export const legacySchema = visualShape.superRefine((v, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  const ids = Object.keys(v.nodes),
    s = v.section;
  const same = (a: string[], b: string[]) =>
    new Set(a).size === a.length &&
    a.length === b.length &&
    a.every((k) => b.includes(k));
  if (!same(ids, s.childIds) || !same(ids, s.readingOrder))
    fail('Visual membership and reading order must match.');
  for (const [key, n] of Object.entries(v.nodes)) {
    if (key !== n.id) fail('Visual identity mismatch.');
    if (n.type === 'image' && !n.content.decorative && !n.content.alt.trim())
      fail('Image placeholders need alt text.');
  }
  const groups = new Map(s.responsive?.groups.map((g) => [g.id, g]) ?? []);
  if (groups.size !== (s.responsive?.groups.length ?? 0))
    fail('Duplicate group.');
  const owned = new Set<string>();
  for (const g of groups.values()) {
    if (v.nodes[g.id]) fail('Group identity conflicts with element.');
    for (const key of g.children) {
      if (!v.nodes[key] && !groups.has(key)) fail('Unknown group member.');
      if (owned.has(key)) fail('Element belongs to multiple groups.');
      owned.add(key);
    }
  }
  const visited = new Set<string>(),
    visiting = new Set<string>();
  const visit = (key: string): void => {
    if (visiting.has(key)) {
      fail('Responsive group cycle.');
      return;
    }
    if (visited.has(key)) return;
    visiting.add(key);
    for (const child of groups.get(key)?.children ?? []) visit(child);
    visiting.delete(key);
    visited.add(key);
  };
  for (const key of groups.keys()) visit(key);
  for (const [key, role] of Object.entries(s.responsive?.roles ?? {}))
    if (
      !v.nodes[key] ||
      (v.nodes[key]?.type === 'button' && role === 'decoration')
    )
      fail('Invalid responsive role.');
  for (const b of devices) {
    const l = s.layouts[b],
      r = v.resolved[b];
    if (
      !same(ids, Object.keys(l.placements)) ||
      !same(ids, Object.keys(r.styles)) ||
      !same(ids, Object.keys(r.heights))
    )
      fail('Incomplete resolved layout.');
    for (const [key, p] of Object.entries(l.placements)) {
      if (p.x + p.w > 480) fail('Element is outside horizontal bounds.');
      if (p.sectionBackground && v.nodes[key]?.type !== 'image')
        fail('Only images can be backgrounds.');
      if (v.nodes[key]?.type === 'button' && p.layerBand !== 'interactive')
        fail('Buttons require the interactive band.');
      if (
        !p.hidden &&
        !p.sectionBackground &&
        p.yPx + (r.heights[key] ?? 0) > r.height + 1
      )
        fail('Element exceeds the resolved section height.');
    }
  }
});
