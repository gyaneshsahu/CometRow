import {
  type LabDocument,
  type LabNode,
  type Style,
  primaryScreen,
  resolved,
  nodeHeight,
} from './lab-model.js';

export type Rect = { x: number; y: number; w: number; h: number };
export type LayoutGraph = {
  id: string;
  mode: 'leaf' | 'row' | 'stack' | 'overlay';
  box: Rect;
  children: LayoutGraph[];
  explicit: boolean;
};
export const graphLeaves = (g: LayoutGraph): string[] =>
  g.mode === 'leaf' ? [g.id] : g.children.flatMap(graphLeaves);
export function contentRole(d: LabDocument, id: string) {
  const s = d.sections[0]!,
    p = s.layouts[primaryScreen(d)].placements[id]!;
  if (p.sectionBackground) return false;
  const role = s.responsive?.roles[id];
  return role
    ? role === 'content'
    : p.layerBand === 'content' || p.layerBand === 'interactive';
}
export const union = (items: LayoutGraph[]): Rect => {
  if (!items.length) return { x: 0, y: 0, w: 1, h: 0 };
  const x = Math.min(...items.map((g) => g.box.x)),
    y = Math.min(...items.map((g) => g.box.y));
  return {
    x,
    y,
    w: Math.max(...items.map((g) => g.box.x + g.box.w)) - x,
    h: Math.max(...items.map((g) => g.box.y + g.box.h)) - y,
  };
};

// Recursive whitespace partitioning proposes structure, but cannot infer intent
// for overlapping art. Explicit groups always win and are never re-inferred.
export function layoutGraph(
  d: LabDocument,
  measure: (n: LabNode, width: number, style: Style) => number,
  include: (id: string) => boolean = (id) => contentRole(d, id),
) {
  const s = d.sections[0]!,
    b = primaryScreen(d),
    width = d.breakpoints[b].previewWidthPx;
  const groups = new Map(s.responsive?.groups.map((g) => [g.id, g]) ?? []);
  const owned = new Set([...groups.values()].flatMap((g) => g.children));
  const ambiguities: string[] = [];
  const build = (id: string): LayoutGraph | undefined => {
    const group = groups.get(id);
    if (group) {
      const children = group.children
        .map(build)
        .filter((g): g is LayoutGraph => !!g);
      if (!children.length) return undefined;
      return {
        id,
        mode: group.layout,
        children,
        box: union(children),
        explicit: true,
      };
    }
    if (!include(id)) return undefined;
    const p = s.layouts[b].placements[id]!,
      n = d.nodes[id]!,
      w = (p.w / 480) * width;
    const h =
      p.height.mode === 'auto' &&
      ['heading', 'paragraph', 'button'].includes(n.type)
        ? Math.max(p.height.minPx, measure(n, w, resolved(n, b)))
        : nodeHeight(p, width);
    return {
      id,
      mode: 'leaf',
      box: { x: (p.x / 480) * width, y: p.yPx, w, h },
      children: [],
      explicit: false,
    };
  };
  const visual = (a: LayoutGraph, b: LayoutGraph) =>
    a.box.y - b.box.y || a.box.x - b.box.x || a.id.localeCompare(b.id);
  let serial = 0;
  const infer = (items: LayoutGraph[]): LayoutGraph => {
    if (items.length === 1) return items[0]!;
    const box = union(items);
    for (const axis of ['y', 'x'] as const) {
      const size = axis === 'y' ? 'h' : 'w';
      const sorted = [...items].sort(
        (a, b) => a.box[axis] - b.box[axis] || visual(a, b),
      );
      const runs: LayoutGraph[][] = [];
      let end = -Infinity;
      for (const item of sorted) {
        if (!runs.length || item.box[axis] >= end + 4) runs.push([]);
        runs[runs.length - 1]!.push(item);
        end = Math.max(end, item.box[axis] + item.box[size]);
      }
      if (runs.length > 1)
        return {
          id: 'inferred-' + serial++,
          mode: axis === 'y' ? 'stack' : 'row',
          box,
          children: runs.map(infer),
          explicit: false,
        };
    }
    if (items.length > 1)
      ambiguities.push(
        'Overlapping content has ambiguous relationships. Use a Row, Stack or Overlay group to specify intent.',
      );
    return {
      id: 'inferred-' + serial++,
      mode: 'stack',
      box,
      children: [...items].sort(visual),
      explicit: false,
    };
  };
  const items = [...s.childIds, ...groups.keys()]
    .filter((id) => !owned.has(id))
    .map(build)
    .filter((g): g is LayoutGraph => !!g);
  return { root: infer(items), ambiguities: [...new Set(ambiguities)] };
}

export function intentionalOverlap(d: LabDocument, a: string, b: string) {
  const groups = d.sections[0]!.responsive?.groups ?? [];
  const leaves = (id: string): string[] => {
    const g = groups.find((g) => g.id === id);
    return g ? g.children.flatMap(leaves) : [id];
  };
  return groups.some(
    (g) =>
      g.layout === 'overlay' &&
      leaves(g.id).includes(a) &&
      leaves(g.id).includes(b),
  );
}
