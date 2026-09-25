import {
  seed,
  createNode,
  placement,
  type Kind,
  type Style,
  type ResponsiveGroup,
} from './lab-model.js';
import {
  regenerateAuto,
  type TextMeasure,
  estimateText,
} from './lab-auto-layout.js';

export const relationshipNames = [
  'founder',
  'spanning',
  'cards',
  'overlap',
  'offsets',
] as const;
export type RelationshipFixture = (typeof relationshipNames)[number];
export function relationshipFixture(
  name: RelationshipFixture,
  measure: TextMeasure = estimateText,
) {
  const d = seed(),
    s = d.sections[0]!;
  d.documentId = 'relationships-' + name;
  const groups: ResponsiveGroup[] = [];
  const roles: Record<string, 'content' | 'decoration'> = {};
  const add = (
    id: string,
    kind: Kind,
    x: number,
    y: number,
    w: number,
    text = '',
    style: Style = {},
    ratio = 1.6,
  ) => {
    const n = createNode(kind, id);
    n.name = id;
    if (n.type === 'heading' || n.type === 'paragraph') n.content.text = text;
    if (n.type === 'button') n.content.label = text;
    Object.assign(n.baseStyle, style);
    d.nodes[id] = n;
    s.childIds.push(id);
    s.readingOrder.push(id);
    const p = { ...placement(kind, x, y), w };
    if (kind === 'image') p.height = { mode: 'aspect', ratio };
    for (const b of ['desktop', 'tablet', 'mobile'] as const)
      s.layouts[b].placements[id] = {
        ...structuredClone(p),
        geometryMode: b === 'desktop' ? 'custom' : 'auto',
      };
  };
  const group = (
    id: string,
    layout: ResponsiveGroup['layout'],
    children: string[],
  ) => groups.push({ id, name: id, layout, children });
  if (name === 'founder') {
    add('background', 'image', 0, 0, 480, '', {
      opacity: 0.3,
      objectFit: 'cover',
    });
    const bg = s.layouts.desktop.placements.background!;
    Object.assign(bg, {
      sectionBackground: true,
      layerBand: 'background',
      locked: true,
    });
    add('headline', 'heading', 108, 296, 300, 'Make room for possibility.', {
      fontSizePx: 56,
    });
    add(
      'intro',
      'paragraph',
      108,
      208,
      270,
      'An open studio for curious people. Explore new ideas, meet your community, and create something worth sharing.',
      { fontSizePx: 24 },
    );
    add('first-cta', 'button', 115, 385, 120, 'Explore the studio');
    add('second-cta', 'button', 243, 386, 120, 'Discover more');
    add('foreground', 'image', 192, 448, 111, '', {}, 277.5 / 165);
    add('small-art', 'image', 14, 32, 42, '', {}, 105 / 76);
    roles['small-art'] = 'decoration';
    group('cta-pair', 'row', ['first-cta', 'second-cta']);
    group('hero-story', 'stack', [
      'intro',
      'headline',
      'cta-pair',
      'foreground',
    ]);
  } else if (name === 'spanning' || name === 'cards') {
    add(
      'spanning-title',
      'heading',
      24,
      40,
      432,
      'A wide introduction above related ideas',
      { fontSizePx: 44 },
    );
    const count = name === 'cards' ? 3 : 2;
    const cards = [];
    for (let i = 0; i < count; i++) {
      const x = 24 + i * (432 / count),
        w = Math.floor(400 / count);
      add('title-' + i, 'heading', x, 230, w, 'Idea ' + (i + 1), {
        fontSizePx: 32,
      });
      add(
        'copy-' + i,
        'paragraph',
        x,
        330,
        w,
        'Thoughtful details belong with their own heading, image and action. Discover the possibilities together.',
      );
      add('photo-' + i, 'image', x, 570, w, '', { objectFit: 'contain' });
      group('card-' + i, 'stack', ['title-' + i, 'copy-' + i, 'photo-' + i]);
      cards.push('card-' + i);
    }
    group('feature-row', 'row', cards);
    group('page-story', 'stack', ['spanning-title', 'feature-row']);
  } else if (name === 'overlap') {
    add(
      'intro',
      'paragraph',
      40,
      40,
      360,
      'An intentional composition stays together when the viewport changes.',
    );
    add('photo', 'image', 40, 180, 280, '', {}, 1.8);
    add('caption', 'heading', 150, 330, 160, 'Made for you', {
      fontSizePx: 36,
      backgroundColor: '#ffffff',
      paddingPx: 12,
    });
    add('cta', 'button', 40, 700, 150, 'Explore this collection');
    add('ornament', 'image', 360, 70, 70, '', { opacity: 0.25 });
    roles.ornament = 'decoration';
    group('artwork', 'overlay', ['photo', 'caption']);
    group('story', 'stack', ['intro', 'artwork', 'cta']);
  } else {
    add(
      'intro',
      'paragraph',
      80,
      70,
      280,
      'Entdecke außergewöhnliche Möglichkeiten für gemeinschaftliche Zukunftsgestaltung. Thoughtful design connects people and ideas across languages and cultures.',
      { fontSizePx: 24 },
    );
    add(
      'headline',
      'heading',
      24,
      280,
      420,
      'New ideas deserve room to grow together',
      { fontSizePx: 48 },
    );
    add('first-cta', 'button', 110, 490, 125, 'Explore every possibility');
    add(
      'second-cta',
      'button',
      250,
      490,
      125,
      'Discover your next favourite collection',
    );
    add('foreground', 'image', 175, 660, 130, '', {}, 0.75);
    group('actions', 'row', ['first-cta', 'second-cta']);
    group('story', 'stack', ['intro', 'headline', 'actions', 'foreground']);
  }
  s.responsive = { groups, roles };
  regenerateAuto(d, measure);
  return d;
}
