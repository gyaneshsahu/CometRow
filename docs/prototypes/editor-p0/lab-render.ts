import { contentRole, intentionalOverlap } from './lab-layout-graph.js';
import {
  type LabDocument,
  type LabNode,
  type Device,
  type Style,
  resolved,
  percent,
  sectionHeight,
  zOrder,
} from './lab-model.js';
import {
  autoLayout,
  textContent,
  type TextMeasure,
} from './lab-auto-layout.js';
export const assetUrls = new Map<string, string>();
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return e;
}
const cssKeys: Record<keyof Style, string> = {
  fontFamily: 'fontFamily',
  fontSizePx: 'fontSize',
  fontWeight: 'fontWeight',
  lineHeight: 'lineHeight',
  letterSpacingPx: 'letterSpacing',
  textAlign: 'textAlign',
  color: 'color',
  backgroundColor: 'backgroundColor',
  borderColor: 'borderColor',
  borderWidthPx: 'borderWidth',
  borderRadiusPx: 'borderRadius',
  paddingPx: 'padding',
  opacity: 'opacity',
  objectFit: 'objectFit',
  objectPositionX: '',
  objectPositionY: '',
};
export function applyStyle(el: HTMLElement, style: Style) {
  for (const [key, value] of Object.entries(style)) {
    const css = cssKeys[key as keyof Style];
    if (css)
      Reflect.set(
        el.style,
        css,
        String(value) + (key.endsWith('Px') ? 'px' : ''),
      );
  }
  el.style.borderStyle = 'solid';
  el.style.borderWidth = `${style.borderWidthPx ?? 0}px`;
  el.style.objectPosition = `${style.objectPositionX ?? 50}% ${style.objectPositionY ?? 50}%`;
}
export function source(d: LabDocument, id: string) {
  const a = d.assets[id];
  if (!a) return '';
  return a.source.kind === 'sample'
    ? a.source.path
    : a.source.kind === 'url'
      ? a.source.url
      : (assetUrls.get(a.source.blobKey) ?? '');
}
export function renderNode(
  d: LabDocument,
  n: LabNode,
  b: Device,
  generatedStyle?: Style,
): HTMLElement {
  let e: HTMLElement;
  switch (n.type) {
    case 'heading':
      e = document.createElement(`h${n.content.level}`);
      e.textContent = n.content.text;
      break;
    case 'paragraph':
      e = element('p', n.content.text);
      break;
    case 'button': {
      const a = element('a', n.content.label);
      a.href =
        n.content.action.kind === 'section'
          ? '#' + n.content.action.value
          : n.content.action.value;
      if (n.content.action.newTab) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      e = a;
      break;
    }
    case 'image': {
      const img = element('img');
      const url = source(d, n.content.assetId);
      if (url) img.src = url;
      img.alt = n.content.alt;
      if (n.content.decorative) img.setAttribute('aria-hidden', 'true');
      e = img;
      break;
    }
    case 'video': {
      const v = element('video');
      const url = source(d, n.content.assetId);
      if (url) v.src = url;
      v.controls = n.content.controls;
      v.autoplay = n.content.autoplay;
      v.muted = n.content.muted;
      v.loop = n.content.loop;
      v.playsInline = true;
      v.preload = 'metadata';
      v.setAttribute('aria-label', n.name);
      if (n.content.posterAssetId)
        v.poster = source(d, n.content.posterAssetId);
      e = v;
      break;
    }
    case 'shape':
      e = element('div');
      if (n.content.decorative) e.setAttribute('aria-hidden', 'true');
      else {
        e.setAttribute('role', 'img');
        e.setAttribute('aria-label', n.name);
      }
      break;
  }
  e.className = 'lab-node';
  e.dataset.node = n.id;
  const p = d.sections[0]!.layouts[b].placements[n.id]!,
    style = generatedStyle ?? resolved(n, b);
  applyStyle(e, style);
  e.style.left = percent(p.x) + '%';
  e.style.width = percent(p.w) + '%';
  e.style.top = p.yPx + 'px';
  e.style.zIndex = String(zOrder(p));
  if (p.height.mode === 'auto') {
    e.style.minHeight = p.height.minPx + 'px';
    e.style.height = 'auto';
  } else if (p.height.mode === 'fixed') e.style.height = p.height.px + 'px';
  else e.style.aspectRatio = String(p.height.ratio);
  if (n.type === 'shape') {
    if (n.content.shape === 'ellipse') e.style.borderRadius = '50%';
    if (n.content.shape === 'line') {
      e.style.background = 'transparent';
      e.style.borderTop = `${style.borderWidthPx || 2}px solid ${style.borderColor || style.backgroundColor || '#172338'}`;
    }
  }
  if (p.layerBand === 'decorative' || p.layerBand === 'background') {
    e.style.pointerEvents = 'none';
    e.setAttribute('aria-hidden', 'true');
  }
  return e;
}
// Measure with the same CSS/font/box model as the rendered text. Cache by content,
// style and pixel width so three thumbnails do not repeatedly force layout.
const textMeasurements = new Map<string, number>();
export const measureText: TextMeasure = (n, width, style) => {
  const key = JSON.stringify([
    n.type,
    n.type === 'heading' ? n.content.level : null,
    textContent(n),
    width,
    style,
  ]);
  const cached = textMeasurements.get(key);
  if (cached !== undefined) return cached;
  const probe =
    n.type === 'heading'
      ? document.createElement(`h${n.content.level}`)
      : element(
          n.type === 'button' ? 'a' : n.type === 'paragraph' ? 'p' : 'div',
        );
  probe.textContent = textContent(n);
  probe.className = 'lab-node';
  applyStyle(probe, style);
  Object.assign(probe.style, {
    width: width + 'px',
    height: 'auto',
    minHeight: '0',
    position: 'absolute',
    left: '-100000px',
    top: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
  });
  document.body.append(probe);
  const height = Math.ceil(
    Math.max(probe.scrollHeight, probe.getBoundingClientRect().height),
  );
  probe.remove();
  if (textMeasurements.size > 1024) textMeasurements.clear();
  textMeasurements.set(key, height);
  return height;
};
const renderedLayouts = new WeakMap<
  HTMLElement,
  {
    document: LabDocument;
    height: number;
    warnings: string[];
    generated: boolean;
  }
>();
export function renderSection(
  d: LabDocument,
  b: Device,
  width = d.breakpoints[b].previewWidthPx,
) {
  const result = autoLayout(d, b, width, measureText);
  const view = {
    ...d,
    breakpoints: {
      ...d.breakpoints,
      [b]: { ...d.breakpoints[b], previewWidthPx: width },
    },
    sections: [
      {
        ...d.sections[0]!,
        layouts: { ...d.sections[0]!.layouts, [b]: result.layout },
      },
    ],
  };
  const s = view.sections[0]!,
    root = element('section');
  renderedLayouts.set(root, {
    document: view,
    height: result.height,
    warnings: [...result.warnings, ...(result.notes ?? [])],
    generated:
      b !== (d.primaryScreen ?? 'desktop') &&
      Object.values(result.layout.placements).some(
        (p) => p.geometryMode === 'auto',
      ),
  });
  root.className = 'lab-section';
  root.id = s.id;
  root.style.width = width + 'px';
  root.style.height = result.height + 'px';
  root.dataset.device = b;
  for (const id of s.readingOrder)
    if (!s.layouts[b].placements[id]!.hidden)
      root.append(renderNode(view, d.nodes[id]!, b, result.styles[id]));
  return root;
}
export function measureSection(root: HTMLElement, d: LabDocument, b: Device) {
  const rendered = renderedLayouts.get(root);
  d = rendered?.document ?? d;
  const measured: Record<string, number> = {};
  for (const el of root.querySelectorAll<HTMLElement>('[data-node]'))
    measured[el.dataset.node!] = el.offsetHeight;
  const height = rendered?.generated
    ? rendered.height
    : sectionHeight(d, b, measured);
  root.style.height = height + 'px';
  for (const el of root.querySelectorAll<HTMLElement>('[data-node]'))
    if (
      d.sections[0]!.layouts[b].placements[el.dataset.node!]!.sectionBackground
    )
      el.style.height = height + 'px';
  const warnings: string[] = [...(rendered?.warnings ?? [])];
  const nodes = [...root.querySelectorAll<HTMLElement>('[data-node]')];
  for (const el of nodes) {
    const p = d.sections[0]!.layouts[b].placements[el.dataset.node!]!;
    if (
      el.scrollHeight > el.clientHeight + 2 ||
      el.offsetTop + el.offsetHeight > height + 1
    )
      warnings.push(
        `${d.nodes[el.dataset.node!]!.name}: overflow; increase height or reposition.`,
      );
    if (d.nodes[el.dataset.node!]!.type === 'button' && el.offsetHeight < 44)
      warnings.push('Button target is below 44 px.');
    if (
      p.sectionBackground ||
      p.layerBand === 'decorative' ||
      !contentRole(d, el.dataset.node!)
    )
      continue;
    for (const other of nodes) {
      if (other === el) break;
      const op = d.sections[0]!.layouts[b].placements[other.dataset.node!]!;
      if (
        op.sectionBackground ||
        op.layerBand === 'decorative' ||
        !contentRole(d, other.dataset.node!) ||
        intentionalOverlap(d, el.dataset.node!, other.dataset.node!)
      )
        continue;
      if (
        el.offsetLeft < other.offsetLeft + other.offsetWidth &&
        el.offsetLeft + el.offsetWidth > other.offsetLeft &&
        el.offsetTop < other.offsetTop + other.offsetHeight &&
        el.offsetTop + el.offsetHeight > other.offsetTop
      )
        warnings.push(
          `${d.nodes[el.dataset.node!]!.name} overlaps ${d.nodes[other.dataset.node!]!.name}.`,
        );
    }
  }
  return { height, warnings };
}
