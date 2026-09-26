import {
  type LabDocument,
  type LabNode,
  type Style,
  primaryScreen,
  resolved,
  nodeHeight,
  sectionHeight,
  zOrder,
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
type Role = 'content' | 'decoration' | 'background';
const rect = (d: LabDocument, id: string): Rect => {
  const b = primaryScreen(d),
    p = d.sections[0]!.layouts[b].placements[id]!;
  const width = d.breakpoints[b].previewWidthPx;
  return {
    x: (p.x / 480) * width,
    y: p.yPx,
    w: (p.w / 480) * width,
    h: nodeHeight(p, width),
  };
};
const contains = (a: Rect, b: Rect) =>
  (Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))) /
    Math.max(1, b.w * b.h) >=
  0.9;

const behind = (d: LabDocument, a: string, b: string) => {
  const s = d.sections[0]!,
    p = s.layouts[primaryScreen(d)].placements;
  return (
    zOrder(p[a]!) < zOrder(p[b]!) ||
    (zOrder(p[a]!) === zOrder(p[b]!) &&
      s.readingOrder.indexOf(a) < s.readingOrder.indexOf(b))
  );
};
export function inferredRole(
  d: LabDocument,
  id: string,
): { role: Role; reason: string } {
  const s = d.sections[0]!,
    b = primaryScreen(d),
    p = s.layouts[b].placements[id]!,
    n = d.nodes[id]!;
  const explicit = s.responsive?.roles[id];
  if (p.sectionBackground)
    return { role: 'background', reason: 'Section background' };
  if (explicit) return { role: explicit, reason: 'Your saved choice' };
  if (p.layerBand === 'background' || p.layerBand === 'decorative')
    return {
      role: 'decoration',
      reason: 'Placed in a visual background/decorative band',
    };
  if ((n.type === 'image' || n.type === 'shape') && n.content.decorative)
    return { role: 'decoration', reason: 'Marked decorative' };
  // Membership is an explicit content relationship; do not silently remove its media.
  if (s.responsive?.groups.some((g) => g.children.includes(id)))
    return { role: 'content', reason: 'Member of your saved group' };
  if (n.type === 'image' || n.type === 'shape') {
    const box = rect(d, id),
      width = d.breakpoints[b].previewWidthPx,
      height = sectionHeight(d, b);
    const text = s.childIds.filter((key) =>
      ['heading', 'paragraph', 'button'].includes(d.nodes[key]!.type),
    );
    const covered = text.filter(
      (key) => behind(d, id, key) && contains(box, rect(d, key)),
    );
    if (
      n.type === 'image' &&
      box.w >= width * 0.8 &&
      box.h >= height * 0.6 &&
      covered.length >= 2
    )
      return {
        role: 'background',
        reason: 'Broad artwork behind multiple content elements',
      };
    if (
      text.length >= 2 &&
      box.w <= width * 0.15 &&
      box.h <= height * 0.18 &&
      text.every((key) => {
        const t = rect(d, key);
        return (
          box.y + box.h + 24 < t.y ||
          box.x + box.w + 24 < t.x ||
          box.x > t.x + t.w + 24
        );
      })
    )
      return {
        role: 'decoration',
        reason:
          'Small artwork separated from the main content; choose Content if meaningful',
      };
  }
  return { role: 'content', reason: 'Foreground content' };
}
export function contentRole(d: LabDocument, id: string) {
  return inferredRole(d, id).role === 'content';
}
// A text label substantially contained by media above it in the visual layers is
// a strong overlay signal. Partial overlaps remain ambiguous and need a choice.
const overlayPair = (d: LabDocument, a: string, b: string) => {
  return (
    ['image', 'video', 'shape'].includes(d.nodes[a]!.type) &&
    ['heading', 'paragraph'].includes(d.nodes[b]!.type) &&
    contentRole(d, a) &&
    contentRole(d, b) &&
    behind(d, a, b) &&
    contains(rect(d, a), rect(d, b))
  );
};
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
  for (const id of s.childIds) {
    const role = inferredRole(d, id);
    if (role.reason.startsWith('Small artwork'))
      ambiguities.push(role.reason + '.');
  }
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
  const group = (
    mode: LayoutGraph['mode'],
    children: LayoutGraph[],
  ): LayoutGraph => ({
    id: 'inferred-' + serial++,
    mode,
    box: union(children),
    children,
    explicit: false,
  });
  const combineSignals = (input: LayoutGraph[]) => {
    const items = [...input];
    // Pair nearby, similarly aligned CTAs before a wider text box can merge them
    // into unrelated columns. Never merge distant buttons across feature cards.
    const context = (g: LayoutGraph) =>
      input
        .filter(
          (c) =>
            c.mode === 'leaf' &&
            ['heading', 'paragraph'].includes(d.nodes[c.id]!.type) &&
            c.box.y + c.box.h <= g.box.y + 8 &&
            c.box.x <= g.box.x + g.box.w / 2 &&
            c.box.x + c.box.w >= g.box.x + g.box.w / 2,
        )
        .sort((a, b) => b.box.y + b.box.h - a.box.y - a.box.h)[0];
    for (let i = 0; i < items.length; i++) {
      const a = items[i]!;
      if (a.mode !== 'leaf' || d.nodes[a.id]!.type !== 'button') continue;
      const siblings = items.filter(
        (c) =>
          c.mode === 'leaf' &&
          d.nodes[c.id]!.type === 'button' &&
          (!context(a) ||
            !context(c) ||
            context(a) === context(c) ||
            Math.abs(context(a)!.box.y - context(c)!.box.y) > 48) &&
          Math.abs(c.box.y - a.box.y) <=
            Math.max(8, Math.min(c.box.h, a.box.h) * 0.25) &&
          Math.max(c.box.x - a.box.x - a.box.w, a.box.x - c.box.x - c.box.w) <=
            Math.min(48, Math.min(c.box.w, a.box.w) * 0.3),
      );
      if (siblings.length > 1) {
        const joined = group(
          'row',
          siblings.sort((a, b) => a.box.x - b.box.x),
        );
        for (const c of siblings) items.splice(items.indexOf(c), 1);
        items.push(joined);
        i = -1;
      }
    }
    for (const media of [...items]) {
      if (media.mode !== 'leaf') continue;
      const labels = items.filter(
        (c) =>
          c.mode === 'leaf' && c !== media && overlayPair(d, media.id, c.id),
      );
      if (!labels.length) continue;
      for (const c of [media, ...labels]) items.splice(items.indexOf(c), 1);
      items.push(group('overlay', [media, ...labels.sort(visual)]));
    }
    return items;
  };
  const infer = (items: LayoutGraph[]): LayoutGraph => {
    if (items.length === 1) return items[0]!;
    const box = union(items);
    const partitions = (axis: 'x' | 'y') => {
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
      return runs;
    };
    const columns = partitions('x');
    // Prefer coherent vertical columns over a row of all titles followed by a
    // row of all descriptions. A spanning heading prevents this split until
    // the surrounding stack has isolated the content below it.
    const columnStructure =
      columns.length > 1 &&
      columns.some((run) => run.length >= 2) &&
      columns.every(
        (run) =>
          run.length >= 2 ||
          (run[0]!.mode === 'leaf' &&
            ['image', 'video'].includes(d.nodes[run[0]!.id]!.type)),
      ) &&
      Math.max(...columns.map((run) => union(run).y)) <
        Math.min(...columns.map((run) => union(run).y + union(run).h));
    for (const axis of columnStructure
      ? (['x', 'y'] as const)
      : (['y', 'x'] as const)) {
      const runs = axis === 'x' ? columns : partitions('y');
      if (runs.length > 1)
        return group(
          axis === 'y' ? 'stack' : 'row',
          (axis === 'y' ? [runs[0]!, runs.slice(1).flat()] : runs).map(infer),
        );
    }
    if (items.length > 1)
      ambiguities.push(
        'Overlapping content has ambiguous relationships. Choose Keep together or Overlay with on the related elements to clarify intent.',
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
  return {
    root: infer(combineSignals(items)),
    ambiguities: [...new Set(ambiguities)],
  };
}

export function intentionalOverlap(d: LabDocument, a: string, b: string) {
  const groups = d.sections[0]!.responsive?.groups ?? [];
  const leaves = (id: string): string[] => {
    const g = groups.find((g) => g.id === id);
    return g ? g.children.flatMap(leaves) : [id];
  };
  return (
    overlayPair(d, a, b) ||
    overlayPair(d, b, a) ||
    groups.some(
      (g) =>
        g.layout === 'overlay' &&
        leaves(g.id).includes(a) &&
        leaves(g.id).includes(b),
    )
  );
}
