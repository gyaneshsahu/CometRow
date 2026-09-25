import {
  contentRole,
  intentionalOverlap,
  layoutGraph,
  graphLeaves,
  type LayoutGraph,
} from './lab-layout-graph.js';
import {
  relationshipFixture,
  relationshipNames,
  type RelationshipFixture,
} from './lab-relationship-fixtures.js';
import {
  responsiveFixture,
  fixtureNames,
  responsiveWidths,
  type FixtureName,
} from './lab-responsive-fixtures.js';
import { breakpoint, type LabDocument } from './lab-model.js';
import { autoLayout, ordinary } from './lab-auto-layout.js';
import {
  assetUrls,
  renderSection,
  measureSection,
  measureText,
  element,
} from './lab-render.js';

// Test-only intrinsic portrait/landscape images. No upload or production asset path.
for (const [name, w, h] of [
  ['portrait', 900, 1200],
  ['landscape', 1600, 900],
] as const) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#edf2ff"/><rect x="${w * 0.1}" y="${h * 0.1}" width="${w * 0.8}" height="${h * 0.8}" rx="${w * 0.06}" fill="white"/><circle cx="${w * 0.5}" cy="${h * 0.5}" r="${Math.min(w, h) * 0.3}" fill="#315ad8"/><path d="M ${w * 0.5} ${h * 0.25} V ${h * 0.75} M ${w * 0.25} ${h * 0.5} H ${w * 0.75}" stroke="white" stroke-width="${w * 0.035}"/><circle cx="${w * 0.8}" cy="${h * 0.2}" r="${Math.min(w, h) * 0.08}" fill="#172338"/></svg>`;
  assetUrls.set(
    'fixture-' + name,
    URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })),
  );
}
const allFixtures = [...fixtureNames, ...relationshipNames];
const fixture = (name: string) =>
  relationshipNames.includes(name as RelationshipFixture)
    ? relationshipFixture(name as RelationshipFixture, measureText)
    : responsiveFixture(name as FixtureName, measureText);
const decodeImages = (root: HTMLElement) =>
  Promise.all([...root.querySelectorAll('img')].map((img) => img.decode()));
export function inspectResponsive(
  root: HTMLElement,
  d: LabDocument,
  width: number,
) {
  const b = breakpoint(width),
    plan = autoLayout(d, b, width, measureText),
    errors: string[] = [];
  const boxes = [...root.querySelectorAll<HTMLElement>('[data-node]')];
  const normal = boxes.filter(
    (el) =>
      ordinary(plan.layout.placements[el.dataset.node!]!) &&
      contentRole(d, el.dataset.node!),
  );
  const check = (ok: boolean, message: string) => {
    if (!ok) errors.push(message);
  };
  check(root.scrollWidth <= width + 1, 'horizontal overflow');
  for (const el of boxes) {
    const id = el.dataset.node!,
      p = plan.layout.placements[id]!,
      n = d.nodes[id]!;
    check(
      el.offsetLeft >= -1 && el.offsetLeft + el.offsetWidth <= width + 1,
      id + ': horizontal bounds',
    );
    check(
      el.offsetTop >= 0 &&
        el.offsetTop + el.offsetHeight <= root.offsetHeight + 1,
      id + ': section bounds',
    );
    if (n.type === 'heading' || n.type === 'paragraph' || n.type === 'button') {
      check(
        el.scrollHeight <= el.clientHeight + 1 &&
          el.scrollWidth <= el.clientWidth + 1,
        id + ': clipped copy',
      );
      const text = n.type === 'button' ? n.content.label : n.content.text;
      check(el.textContent === text, id + ': lost copy');
    }
    if (n.type === 'button')
      check(el.offsetHeight >= 44, id + ': small target');
    if (
      (n.type === 'image' || n.type === 'video') &&
      !p.sectionBackground &&
      p.height.mode === 'aspect'
    )
      check(
        Math.abs(el.offsetHeight - el.offsetWidth / p.height.ratio) <= 1.1,
        id + ': aspect ratio',
      );
    if (p.sectionBackground)
      check(
        el.offsetTop === 0 &&
          el.offsetLeft === 0 &&
          el.offsetWidth === width &&
          el.offsetHeight === root.offsetHeight &&
          el.style.objectFit === 'cover',
        id + ': background coverage',
      );
  }
  for (let i = 0; i < normal.length; i++)
    for (const other of normal.slice(i + 1)) {
      const el = normal[i]!;
      if (intentionalOverlap(d, el.dataset.node!, other.dataset.node!))
        continue;
      check(
        !(
          el.offsetLeft < other.offsetLeft + other.offsetWidth - 1 &&
          el.offsetLeft + el.offsetWidth > other.offsetLeft + 1 &&
          el.offsetTop < other.offsetTop + other.offsetHeight - 1 &&
          el.offsetTop + el.offsetHeight > other.offsetTop + 1
        ),
        el.dataset.node + '/' + other.dataset.node + ': collision',
      );
    }
  // Verify relationships independently from the placement algorithm using real DOM boxes.
  const source = d.sections[0]!.layouts[d.primaryScreen ?? 'desktop'];
  const box = (g: LayoutGraph) => {
    const els = graphLeaves(g)
      .map((id) => boxes.find((el) => el.dataset.node === id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return undefined;
    return {
      x: Math.min(...els.map((el) => el.offsetLeft)),
      y: Math.min(...els.map((el) => el.offsetTop)),
      right: Math.max(...els.map((el) => el.offsetLeft + el.offsetWidth)),
      bottom: Math.max(...els.map((el) => el.offsetTop + el.offsetHeight)),
    };
  };
  const verify = (g: LayoutGraph) => {
    for (const child of g.children) verify(child);
    if (g.mode === 'leaf' || g.mode === 'overlay') return;
    if (
      b !== (d.primaryScreen ?? 'desktop') &&
      graphLeaves(g).some(
        (id) => plan.layout.placements[id]!.geometryMode !== 'auto',
      )
    )
      return;
    const children = g.children
      .map(box)
      .filter((v): v is NonNullable<typeof v> => !!v);
    const isRow =
      g.mode === 'row' &&
      children.length > 1 &&
      children.every((c) => Math.abs(c.y - children[0]!.y) <= 2);
    for (let i = 1; i < children.length; i++) {
      const previous = children[i - 1]!,
        next = children[i]!;
      check(
        isRow ? next.x >= previous.right - 1 : next.y >= previous.bottom - 1,
        g.id + ': related members out of order or interleaved',
      );
    }
  };
  verify(layoutGraph(d, measureText).root);
  for (const el of boxes) {
    const id = el.dataset.node!,
      n = d.nodes[id]!;
    if (
      b !== (d.primaryScreen ?? 'desktop') &&
      plan.layout.placements[id]!.geometryMode === 'auto' &&
      contentRole(d, id) &&
      (n.type === 'image' || n.type === 'video')
    )
      check(
        el.offsetWidth <=
          (source.placements[id]!.w / 480) *
            d.breakpoints[d.primaryScreen ?? 'desktop'].previewWidthPx +
            1,
        id + ': media enlarged beyond authored size',
      );
  }
  return errors;
}
export async function responsiveChecks() {
  await document.fonts.ready;
  const results: string[] = [];
  for (const name of allFixtures) {
    const d = fixture(name);
    for (const width of responsiveWidths) {
      const root = renderSection(d, breakpoint(width), width);
      document.body.append(root);
      measureSection(root, d, breakpoint(width));
      await decodeImages(root);
      const errors = inspectResponsive(root, d, width);
      root.remove();
      if (errors.length)
        throw Error(name + ' ' + width + 'px: ' + errors.join('; '));
      results.push(
        'PASS ' + name + ' ' + width + 'px: content, collisions, media, bounds',
      );
    }
  }
  return results;
}
export async function showResponsiveDemo() {
  await document.fonts.ready;
  const params = new URLSearchParams(location.search),
    requested = params.get('demo');
  const names =
    requested === 'all'
      ? allFixtures
      : [
          allFixtures.includes(requested as (typeof allFixtures)[number])
            ? (requested as (typeof allFixtures)[number])
            : ('campaign' as const),
        ];
  const requestedWidth = Number(params.get('width'));
  const widths = responsiveWidths.includes(requestedWidth)
    ? [requestedWidth]
    : responsiveWidths;
  document.body.replaceChildren();
  document.body.style.margin = '0';
  const nav = element('nav');
  nav.style.cssText = 'padding:16px;background:white;font:14px system-ui;';
  nav.append(element('strong', 'Editor Lab · automatic responsive fixtures '));
  for (const name of allFixtures) {
    const a = element('a', name + ' ');
    a.href = '?demo=' + name + '&width=' + (requestedWidth || 390);
    nav.append(a);
  }
  document.body.append(nav);
  const gallery = element('div');
  if (params.has('matrix'))
    gallery.style.cssText =
      'display:grid;grid-template-columns:repeat(3,360px);gap:24px;padding:24px;align-items:start;';
  document.body.append(gallery);
  for (const name of names) {
    const d = fixture(name);
    for (const width of widths) {
      const figure = element('figure');
      figure.style.cssText = 'margin:24px auto;width:' + width + 'px;';
      figure.dataset.fixture = name;
      figure.dataset.width = String(width);
      figure.append(
        element(
          'figcaption',
          name +
            ' · ' +
            width +
            'px · ' +
            (breakpoint(width) === 'desktop'
              ? d.sections[0]!.responsive &&
                width !== d.breakpoints.desktop.previewWidthPx
                ? 'responsive Primary preview'
                : 'authored Primary'
              : 'generated Auto'),
        ),
      );
      const root = renderSection(d, breakpoint(width), width);
      figure.append(root);
      gallery.append(figure);
      measureSection(root, d, breakpoint(width));
      await decodeImages(root);
      const errors = inspectResponsive(root, d, width);
      figure.dataset.result = errors.length ? 'FAIL' : 'PASS';
      if (params.has('matrix')) {
        const scaled = element('div'),
          k = 360 / width;
        figure.style.cssText = 'margin:0;width:360px;';
        scaled.style.cssText =
          'position:relative;width:360px;height:' +
          root.offsetHeight * k +
          'px;';
        root.replaceWith(scaled);
        scaled.append(root);
        root.style.transformOrigin = 'top left';
        root.style.transform = `scale(${k})`;
      }
      figure.append(
        element(
          'p',
          errors.length
            ? errors.join('; ')
            : 'PASS · all content visible, no ordinary collisions, media and bounds verified',
        ),
      );
    }
  }
  document.title = document.querySelector('[data-result="FAIL"]')
    ? 'FAIL — Responsive demo'
    : 'PASS — Responsive demo';
}
