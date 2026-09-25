import {
  seed,
  createNode,
  placement,
  type Kind,
  type Placement,
  type Style,
  type LabNode,
} from './lab-model.js';
import { History } from './lab-commands.js';
import { estimateText, type TextMeasure } from './lab-auto-layout.js';
export const fixtureNames = ['campaign', 'launch', 'stress'] as const;
export type FixtureName = (typeof fixtureNames)[number];
export const responsiveWidths = [
  320, 360, 390, 430, 639, 640, 768, 1023, 1024, 1200, 1440,
];
// Development-only fixtures: author Desktop only. Every smaller placement is Auto.
export function responsiveFixture(
  name: FixtureName,
  measure: TextMeasure = estimateText,
) {
  const h = new History(seed(), measure);
  if (name === 'stress')
    for (const variant of ['portrait', 'landscape']) {
      h.document.assets['fixture-' + variant] = {
        id: 'fixture-' + variant,
        kind: 'image',
        name: variant + ' test image',
        mimeType: 'image/svg+xml',
        source: { kind: 'local', blobKey: 'fixture-' + variant },
      };
    }
  const add = (
    id: string,
    type: Kind,
    x: number,
    y: number,
    w: number,
    text = '',
    style: Style = {},
    ratio = 16 / 9,
  ) => {
    const n = createNode(type, id);
    if (n.type === 'heading' || n.type === 'paragraph') n.content.text = text;
    if (n.type === 'button') n.content.label = text;
    if (n.type === 'image') {
      n.content.alt = 'Geometric studio composition';
      if (name === 'stress' && (id === 'portrait' || id === 'landscape'))
        n.content.assetId = 'fixture-' + id;
    }
    Object.assign(n.baseStyle, style);
    const p: Placement = { ...placement(type, x, y), w };
    if (type === 'image' || type === 'video')
      p.height = { mode: 'aspect', ratio };
    h.commit({ type: 'AddNode', node: n, placement: p, device: 'desktop' });
    h.commit({ type: 'MoveNode', id, device: 'desktop', placement: p });
  };
  if (name === 'campaign') {
    add('background', 'image', 0, 0, 480, '', {
      opacity: 0.13,
      objectPositionX: 30,
      objectPositionY: 65,
    });
    h.commit({
      type: 'SetImageAsBackground',
      id: 'background',
      device: 'desktop',
    });
    add(
      'intro',
      'paragraph',
      32,
      60,
      240,
      'A considered experience for curious people. Discover a collection designed to make everyday moments feel extraordinary.',
      { lineHeight: 1.5 },
    );
    add(
      'headline',
      'heading',
      32,
      210,
      360,
      'Make space for a brighter beginning.',
      { fontSizePx: 72, fontWeight: 700, lineHeight: 1.3 },
    );
    add('cta', 'button', 32, 500, 150, 'Explore the collection');
    add('product', 'image', 32, 620, 230, '', { objectFit: 'contain' });
    add('circle', 'shape', 320, 90, 110, '', {
      opacity: 0.5,
      backgroundColor: '#cbd8ff',
    });
    (
      h.document.nodes.circle as Extract<LabNode, { type: 'shape' }>
    ).content.shape = 'ellipse';
    add('accent', 'image', 320, 510, 120, '', { opacity: 0.3 });
    h.commit({
      type: 'SetLayer',
      id: 'accent',
      device: 'desktop',
      band: 'decorative',
      order: 2,
    });
  } else if (name === 'launch') {
    add('decoration', 'shape', 245, 45, 210, '', {
      backgroundColor: '#edf2ff',
    });
    add('headline', 'heading', 24, 80, 212, 'Your next idea starts here.', {
      fontSizePx: 54,
      fontWeight: 700,
      lineHeight: 1.3,
    });
    add(
      'intro',
      'paragraph',
      24,
      270,
      212,
      'Meet a thoughtful new collection. Beautifully simple objects, built for the way you live and the work you love.',
      { lineHeight: 1.5 },
    );
    add('cta', 'button', 24, 460, 150, 'Meet the collection');
    add('product', 'image', 268, 80, 184, '', { objectFit: 'contain' }, 4 / 5);
  } else {
    add(
      'headline',
      'heading',
      24,
      80,
      390,
      'Extraordinary possibilities for a more imaginative everyday life, together.',
      { fontSizePx: 64, fontWeight: 700, lineHeight: 1.3 },
    );
    add(
      'intro',
      'paragraph',
      24,
      400,
      270,
      'Entdecke außergewöhnliche Möglichkeiten für gemeinschaftliche Zukunftsgestaltung. Our considered collection brings people and ideas together, with carefully chosen details, generous possibilities and more room for the unexpected. Explore stories from our community and find the inspiration to make something meaningful, memorable and uniquely your own.',
      { lineHeight: 1.5 },
    );
    add(
      'cta',
      'button',
      24,
      800,
      230,
      'Explore every possibility and discover your next favourite collection',
    );
    add(
      'portrait',
      'image',
      24,
      1000,
      240,
      '',
      { objectFit: 'contain' },
      3 / 4,
    );
    add(
      'landscape',
      'image',
      24,
      2050,
      340,
      '',
      { objectFit: 'contain' },
      16 / 9,
    );
  }
  h.document.name = 'Responsive demo: ' + name;
  // A harmless Primary move runs the same final pass as an editor commit.
  const id = 'headline';
  h.commit({
    type: 'MoveNode',
    id,
    device: 'desktop',
    placement: h.document.sections[0]!.layouts.desktop.placements[id]!,
  });
  return h.document;
}
