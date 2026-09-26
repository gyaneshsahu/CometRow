import {
  type LabDocument,
  type LabNode,
  type Device,
  type Placement,
  type Style,
  type Layout,
  primaryScreen,
  resolved,
  nodeHeight,
  sectionHeight,
} from './lab-model.js';

import {
  layoutGraph,
  contentRole,
  inferredRole,
  graphLeaves,
  type LayoutGraph,
} from './lab-layout-graph.js';

export type TextMeasure = (
  node: LabNode,
  width: number,
  style: Style,
) => number;
export const textContent = (n: LabNode) =>
  n.type === 'heading' || n.type === 'paragraph'
    ? n.content.text
    : n.type === 'button'
      ? n.content.label
      : '';
// Deterministic non-DOM fallback. The browser supplies exact DOM measurements.
export const estimateText: TextMeasure = (n, width, style) => {
  const font = style.fontSizePx ?? 18,
    inset = 2 * ((style.paddingPx ?? 0) + (style.borderWidthPx ?? 0));
  const columns = Math.max(
    1,
    Math.floor((width - inset) / (font * 0.62 + (style.letterSpacingPx ?? 0))),
  );
  const lines = textContent(n)
    .split('\n')
    .reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / columns)),
      0,
    );
  return Math.ceil(lines * font * (style.lineHeight ?? 1.3) + inset);
};
const isText = (n: LabNode) =>
  ['heading', 'paragraph', 'button'].includes(n.type);
export const ordinary = (p: Placement) =>
  !p.sectionBackground &&
  (p.layerBand === 'content' || p.layerBand === 'interactive');
const intersectsX = (a: Placement, b: Placement) =>
  a.x < b.x + b.w && a.x + a.w > b.x;
export type AutoLayout = {
  layout: Layout;
  styles: Record<string, Style>;
  height: number;
  warnings: string[];
  notes?: string[];
};

// Build relationships first, then measure and lay out the graph. Primary remains
// freeform; explicit graph membership never depends on current target geometry.
export function autoLayout(
  d: LabDocument,
  target: Device,
  width = d.breakpoints[target].previewWidthPx,
  measure: TextMeasure = estimateText,
): AutoLayout {
  const section = d.sections[0]!,
    primary = primaryScreen(d),
    source = section.layouts[primary];
  const layout = structuredClone(section.layouts[target]);
  const styles: Record<string, Style> = {},
    warnings: string[] = [];
  const sourceWidth = d.breakpoints[primary].previewWidthPx;
  const projectingPrimary =
    target === primary && width !== sourceWidth && section.childIds.length > 0;
  if (projectingPrimary)
    for (const p of Object.values(layout.placements)) p.geometryMode = 'auto';
  const active =
    projectingPrimary ||
    (target !== primary &&
      section.childIds.some(
        (id) => layout.placements[id]!.geometryMode === 'auto',
      ));
  if (!active)
    return { layout, styles, height: sectionHeight(d, target), warnings };
  const margin = width < 640 ? 16 : 24,
    gap = width < 640 ? 20 : 24,
    safe = width - 2 * margin;
  const scale = Math.min(1, width / sourceWidth);
  const graph = layoutGraph(
      d,
      measure,
      (id) =>
        contentRole(d, id) &&
        (layout.placements[id]!.inferredRole === 'decoration' ||
          layout.placements[id]!.inferredRole === 'background' ||
          section.responsive?.roles[id] === 'content' ||
          layout.placements[id]!.geometryMode !== 'auto' ||
          ordinary(layout.placements[id]!) ||
          layout.placements[id]!.sectionBackground),
    ),
    content = graphLeaves(graph.root);
  const heightOf = (
    id: string,
    p: Placement,
    style = styles[id] ?? resolved(d.nodes[id]!, target),
  ) =>
    isText(d.nodes[id]!) && p.height.mode === 'auto'
      ? Math.max(
          p.height.minPx,
          measure(d.nodes[id]!, (p.w / 480) * width, style),
        )
      : nodeHeight(p, width);
  type Box = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    overlay?: string;
  };
  const plan: Box[] = [];
  const visible = (g: LayoutGraph): boolean =>
    graphLeaves(g).some((id) => !layout.placements[id]!.hidden);
  const minWidth = (g: LayoutGraph): number => {
    if (g.mode === 'leaf') {
      const n = d.nodes[g.id]!;
      return n.type === 'button'
        ? Math.min(
            g.box.w,
            Math.max(
              120,
              measure(n, 240, resolved(n, primary)) > 70 ? 200 : 140,
            ),
          )
        : isText(n)
          ? Math.min(g.box.w, 220)
          : Math.min(g.box.w, 160);
    }
    return Math.max(1, ...g.children.map(minWidth));
  };
  function leaf(
    g: LayoutGraph,
    x: number,
    y: number,
    w: number,
    overlay?: string,
  ) {
    const id = g.id,
      n = d.nodes[id]!,
      src = source.placements[id]!,
      old = layout.placements[id]!;
    const style: Style = {
      ...resolved(n, primary),
      ...n.styleOverrides[target],
    };
    const p: Placement = {
      ...structuredClone(old),
      sectionBackground: false,
      inferredRole: 'content',
    };
    // Explicit content roles do not modify Primary bands or Custom placements.
    if (
      layout.placements[id]!.inferredRole === 'decoration' ||
      layout.placements[id]!.inferredRole === 'background' ||
      section.responsive?.roles[id] === 'content' ||
      old.sectionBackground ||
      old.inferredRole !== undefined
    ) {
      p.layerBand = n.type === 'button' ? 'interactive' : 'content';
      p.locked = src.locked;
    }
    p.x = Math.max(0, Math.round((x / width) * 480));
    p.w = Math.max(1, Math.min(480 - p.x, Math.floor((w / width) * 480)));
    const actual = (p.w / 480) * width;
    if (isText(n)) {
      const font = style.fontSizePx ?? (n.type === 'heading' ? 48 : 18);
      style.fontSizePx =
        n.type === 'heading'
          ? Math.min(
              font,
              Math.max(
                28,
                Math.floor((actual - 2 * (style.paddingPx ?? 0)) / 7),
              ),
            )
          : Math.max(16, font);
      p.height = { mode: 'auto', minPx: n.type === 'button' ? 44 : 1 };
    } else if (n.type === 'image' || n.type === 'video') {
      p.height = {
        mode: 'aspect',
        ratio:
          src.height.mode === 'aspect'
            ? src.height.ratio
            : Math.max(0.051, Math.min(20, g.box.w / Math.max(1, g.box.h))),
      };
    } else p.height = structuredClone(src.height);
    styles[id] = style;
    const h = heightOf(id, p, style);
    if (isText(n))
      p.height = { mode: 'auto', minPx: Math.min(4000, Math.ceil(h)) };
    p.yPx = Math.ceil(y);
    if (old.geometryMode === 'auto') {
      layout.placements[id] = p;
      plan.push({
        id,
        x: (p.x / 480) * width,
        y: p.yPx,
        w: actual,
        h,
        overlay,
      });
    }
    return h;
  }
  function place(
    g: LayoutGraph,
    x: number,
    y: number,
    w: number,
    overlay?: string,
  ): number {
    if (g.mode === 'leaf') return leaf(g, x, y, w, overlay);
    const children = g.children;
    if (!children.length) return 0;
    if (g.mode === 'overlay') {
      // Scale the composition together; text keeps readable typography. The
      // measured extent, rather than the old rectangle, sizes the containing block.
      const k = Math.min(1, w / Math.max(1, g.box.w));
      return Math.max(
        ...children.map((c) => {
          const yy = (c.box.y - g.box.y) * k;
          return (
            yy +
            place(c, x + (c.box.x - g.box.x) * k, y + yy, c.box.w * k, g.id)
          );
        }),
      );
    }
    const rowGap = 16;
    const buttons = children.every(
      (c) => c.mode === 'leaf' && d.nodes[c.id]!.type === 'button',
    );
    const row =
      g.mode === 'row' &&
      (buttons
        ? children.reduce((sum, c) => sum + c.box.w, 0) +
            rowGap * (children.length - 1) <=
          w
        : children.reduce((sum, c) => sum + minWidth(c), 0) +
            rowGap * (children.length - 1) <=
          w);
    if (row) {
      const total = children.reduce((sum, c) => sum + c.box.w, 0),
        available = w - rowGap * (children.length - 1);
      let xx = x,
        bottom = 0;
      for (const c of children) {
        const minimumTotal = children.reduce(
          (sum, child) => sum + minWidth(child),
          0,
        );
        const cw = buttons
          ? c.box.w
          : minWidth(c) +
            ((available - minimumTotal) * c.box.w) / Math.max(1, total);
        const h = place(c, xx, y, cw, overlay);
        if (visible(c)) {
          bottom = Math.max(bottom, h);
          xx += cw + rowGap;
        }
      }
      return bottom;
    }
    let cursor = 0,
      previous: LayoutGraph | undefined;
    for (const c of children) {
      const media =
        c.mode === 'leaf' &&
        ['image', 'video', 'button', 'shape'].includes(d.nodes[c.id]!.type);
      // Widths are capped by their authored pixel size. Stacking does not turn
      // a small icon or foreground image into a full-width hero image.
      const cw = Math.max(
        1,
        Math.min(w, media ? c.box.w : g.mode === 'row' ? w : c.box.w),
      );
      const room = Math.max(0, g.box.w - c.box.w),
        offset = room
          ? Math.max(0, Math.min(1, (c.box.x - g.box.x) / room))
          : 0;
      const xx = x + (w - cw) * (g.mode === 'row' ? 0.5 : offset);
      const separation = previous
        ? Math.max(
            gap,
            Math.min(48, (c.box.y - previous.box.y - previous.box.h) * scale),
          )
        : 0;
      const h = place(c, xx, y + cursor + separation, cw, overlay);
      if (visible(c)) {
        cursor += separation + h;
        previous = c;
      }
    }
    return cursor;
  }
  const rootWidth = Math.min(safe, graph.root.box.w);
  const sourceRoom = Math.max(1, sourceWidth - graph.root.box.w);
  const align = Math.max(0, Math.min(1, graph.root.box.x / sourceRoom));
  place(
    graph.root,
    margin + (safe - rootWidth) * align,
    projectingPrimary
      ? Math.max(24, graph.root.box.y * scale)
      : Math.max(24, Math.min(64, graph.root.box.y * scale)),
    rootWidth,
  );
  // Keep generated relationships intact around immovable Custom content. Shift
  // the Auto composition as one unit rather than splitting rows during repair.
  const custom = section.childIds.filter(
    (id) =>
      layout.placements[id]!.geometryMode !== 'auto' &&
      !layout.placements[id]!.hidden &&
      ordinary(layout.placements[id]!),
  );
  let shift = 0,
    moved = true;
  while (moved) {
    moved = false;
    for (const box of plan) {
      if (
        layout.placements[box.id]!.hidden ||
        !ordinary(layout.placements[box.id]!)
      )
        continue;
      for (const id of custom) {
        const p = layout.placements[id]!,
          h = heightOf(id, p);
        if (
          intersectsX(layout.placements[box.id]!, p) &&
          box.y + shift < p.yPx + h + gap &&
          box.y + shift + box.h + gap > p.yPx
        ) {
          shift = Math.ceil(p.yPx + h + gap - box.y);
          moved = true;
        }
      }
    }
  }
  for (const box of plan) layout.placements[box.id]!.yPx = box.y + shift;
  // Decorative elements are responsive freeform ornaments, not flow obstacles.
  for (const id of section.childIds) {
    const src = source.placements[id]!,
      old = layout.placements[id]!;
    if (old.geometryMode !== 'auto' || content.includes(id)) continue;
    const n = d.nodes[id]!;
    styles[id] = { ...resolved(n, primary), ...n.styleOverrides[target] };
    const p = {
      ...structuredClone(old),
      x: Math.max(0, Math.min(480 - src.w, src.x)),
      w: src.w,
      yPx: Math.round(src.yPx * scale),
      height: structuredClone(src.height),
      sectionBackground: inferredRole(d, id).role === 'background',
      inferredRole: inferredRole(d, id).role,
      layerBand:
        inferredRole(d, id).role === 'decoration'
          ? ('decorative' as const)
          : ordinary(src) && !ordinary(old) && !old.sectionBackground
            ? old.layerBand
            : src.layerBand,
      locked: src.locked || old.locked,
    };
    if (p.height.mode === 'fixed' && !src.sectionBackground)
      p.height.px = Math.max(1, Math.round(p.height.px * scale));
    if (p.sectionBackground) {
      p.x = 0;
      p.w = 480;
      p.yPx = 0;
      p.layerBand = 'background';
      styles[id]!.objectFit = 'cover';
    }
    layout.placements[id] = p;
  }
  const contentBottom = Math.max(
    0,
    ...section.childIds
      .filter(
        (id) =>
          !layout.placements[id]!.hidden && ordinary(layout.placements[id]!),
      )
      .map(
        (id) =>
          layout.placements[id]!.yPx + heightOf(id, layout.placements[id]!),
      ),
  );
  const height =
    layout.height.mode === 'auto'
      ? Math.ceil(
          Math.max(
            layout.height.minPx,
            contentBottom + (section.bottomPaddingPx ?? 32),
          ),
        )
      : layout.height.px;
  if (contentBottom > height)
    warnings.push(
      'Auto content needs more space: increase the fixed section height or use auto height.',
    );
  for (const id of section.childIds) {
    const p = layout.placements[id]!;
    if (p.geometryMode !== 'auto') continue;
    if (p.sectionBackground)
      p.height = { mode: 'fixed', px: Math.min(4000, height) };
    else if (!ordinary(p)) {
      if (p.height.mode === 'fixed')
        p.height.px = Math.min(height, p.height.px);
      if (p.height.mode === 'aspect' && nodeHeight(p, width) > height) {
        p.w = Math.max(
          1,
          Math.floor(((height * p.height.ratio) / width) * 480),
        );
        p.x = Math.min(p.x, 480 - p.w);
      }
      p.yPx = Math.max(
        0,
        Math.min(p.yPx, Math.floor(height - nodeHeight(p, width))),
      );
    }
  }
  if (projectingPrimary)
    for (const id of section.childIds)
      layout.placements[id]!.geometryMode = source.placements[id]!.geometryMode;
  const notes = [...graph.ambiguities];
  if (
    target !== primary &&
    content.some((id) => layout.placements[id]!.geometryMode !== 'auto')
  )
    notes.push(
      'This screen contains protected Custom content. Reset individual members to Auto if they should follow the responsive relationships.',
    );
  return { layout, styles, height, warnings, notes };
}

export function regenerateAuto(
  d: LabDocument,
  measure: TextMeasure = estimateText,
) {
  for (const b of ['mobile', 'tablet', 'desktop'] as const) {
    if (b === primaryScreen(d)) continue;
    const result = autoLayout(d, b, d.breakpoints[b].previewWidthPx, measure);
    if (result.warnings.length) throw Error(result.warnings.join(' '));
    d.sections[0]!.layouts[b] = result.layout;
  }
}
