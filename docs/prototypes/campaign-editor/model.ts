import { blockLibrary, newBlock } from '../../../src/composer/library.js';
import {
  emptyDocument,
  documentSchema,
  type BlockType,
  type CampaignDocument,
  type ContentBlock,
} from '../../../src/composer/schema.js';

export type Appearance = {
  layout: 'split' | 'stacked' | 'centered';
  tone: 'light' | 'soft' | 'dark';
  art: 'orbit' | 'arch' | 'wave';
  spacing: 'compact' | 'comfortable' | 'generous';
};
export type Project = {
  name: string;
  document: CampaignDocument;
  appearance: Record<string, Appearance>;
};
export const defaultAppearance = (): Appearance => ({
  layout: 'split',
  tone: 'light',
  art: 'orbit',
  spacing: 'comfortable',
});
export const names: Partial<Record<BlockType, string>> = {
  cta: 'Call to action',
  information: 'Story',
  benefits: 'Highlights',
  event: 'Date & location',
  media: 'Gallery',
  actions: 'Links',
  footer: 'Footer',
  brand: 'Brand',
  contact: 'Contact',
  testimonials: 'Testimonials',
  offer: 'Offer',
};
export const label = (type: BlockType) =>
  names[type] || blockLibrary.find((b) => b.type === type)!.name;
export function sampleBlock(type: BlockType): ContentBlock {
  const block = newBlock(type, crypto.randomUUID());
  const content: Partial<Record<BlockType, Record<string, unknown>>> = {
    brand: {
      name: 'fieldnotes',
      tagline: 'Good ideas start here.',
      logo: true,
    },
    hero: {
      eyebrow: 'A CREATIVE AFTERNOON · BERLIN',
      headline: 'Make room for\nyour next idea.',
      description:
        'Step away from the everyday. Join a small gathering of curious minds for an afternoon of making, sharing and discovering.',
      visual: 'image',
      ratio: 'square',
      alt: 'Abstract sculptural circles in lavender and warm orange',
    },
    benefits: {
      heading: 'A little space. A lot of possibility.',
      items: [
        {
          title: 'Make something',
          description:
            'Hands-on sessions, fresh materials and room to experiment.',
        },
        {
          title: 'Meet your people',
          description:
            'Good conversations with people who see things differently.',
        },
        {
          title: 'Leave inspired',
          description:
            'Take home a new idea, a new connection and a little momentum.',
        },
      ],
    },
    cta: {
      heading: 'Your next idea is waiting.',
      description:
        'A small gathering. A fresh perspective. Save your place at the table.',
      label: 'Reserve your spot',
      url: 'https://example.com/fieldnotes',
    },
    information: {
      heading: 'An afternoon, just for possibility.',
      body: 'No perfect answers. No polished pitches. Just good materials, open minds and time to make something new.\n\nBring your curiosity. We will bring the rest.',
    },
    event: {
      heading: 'Meet us at the studio.',
      startsAt: '2026-10-17T14:00',
      endsAt: '2026-10-17T18:00',
      timezone: 'Europe/Berlin',
      venue: 'Fieldnotes Studio',
      address: '12 Gartenstraße · Berlin',
      mapUrl: '',
    },
    offer: {
      heading: 'An afternoon well spent.',
      price: '€35',
      description: 'All materials, a seasonal drink and good company included.',
      code: '',
      terms: 'Limited to 24 curious minds.',
    },
    testimonials: {
      heading: 'Leave with more than you came for.',
      items: [
        {
          quote: 'I came for a workshop and left with a whole new perspective.',
          author: 'Alex M.',
          source: 'Previous attendee · illustrative quote',
        },
      ],
    },
    contact: {
      name: 'Say hello.',
      email: 'hello@example.com',
      phone: '',
      address: 'Fieldnotes Studio · Berlin',
      website: 'https://example.com',
    },
    footer: {
      identity: 'fieldnotes · A fictional studio for this design review',
      legalLinks: [],
      note: 'Made for curious minds. © 2026 Fieldnotes.',
    },
    media: {
      heading: 'A glimpse of what is possible.',
      items: [
        {
          kind: 'image',
          ratio: 'landscape',
          caption: 'Bundled sample artwork',
          alt: 'Abstract studio artwork',
        },
      ],
    },
    actions: {
      heading: 'Keep the conversation going.',
      items: [
        {
          label: 'Explore the studio',
          url: 'https://example.com',
          kind: 'website',
        },
      ],
    },
  };
  Object.assign(block.data, content[type]);
  return block;
}
export function starter(
  kind: 'studio' | 'launch' | 'blank',
  name: string,
): Project {
  const document = emptyDocument();
  document.theme = {
    preset: 'paper',
    accent: '#5743ad',
    typography: 'modern',
    corners: 'soft',
  };
  if (kind !== 'blank')
    document.blocks = (
      kind === 'studio'
        ? ['brand', 'hero', 'benefits', 'event', 'cta', 'footer']
        : ['brand', 'hero', 'information', 'offer', 'cta', 'footer']
    ).map((type) => sampleBlock(type as BlockType));
  const appearance = Object.fromEntries(
    document.blocks.map((block) => [
      block.id,
      {
        ...defaultAppearance(),
        tone:
          block.type === 'cta'
            ? 'dark'
            : block.type === 'benefits'
              ? 'soft'
              : 'light',
      },
    ]),
  );
  if (kind === 'launch') {
    const hero = document.blocks.find((b) => b.type === 'hero')!;
    Object.assign(hero.data, {
      eyebrow: 'THE NEXT CHAPTER',
      headline: 'Good things\nare taking shape.',
      description:
        'A considered collection for everyday living. Get a first look at what we have been making.',
    });
    appearance[hero.id]!.art = 'arch';
    document.theme.accent = '#8c431f';
  }
  return {
    name: name.trim() || 'Untitled campaign',
    document: documentSchema.parse(document),
    appearance: appearance as Record<string, Appearance>,
  };
}
export function moveBlock(
  project: Project,
  id: string,
  beforeId: string | null,
): Project {
  const next = structuredClone(project);
  const index = next.document.blocks.findIndex((b) => b.id === id);
  if (index < 0 || id === beforeId) return next;
  const [block] = next.document.blocks.splice(index, 1);
  const target = beforeId
    ? next.document.blocks.findIndex((b) => b.id === beforeId)
    : next.document.blocks.length;
  next.document.blocks.splice(
    target < 0 ? next.document.blocks.length : target,
    0,
    block!,
  );
  return next;
}
export class History {
  private past: Project[] = [];
  private future: Project[] = [];
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
  push(project: Project) {
    this.past.push(structuredClone(project));
    this.past = this.past.slice(-80);
    this.future = [];
  }
  undo(current: Project) {
    const previous = this.past.pop();
    if (!previous) return current;
    this.future.push(structuredClone(current));
    return previous;
  }
  redo(current: Project) {
    const next = this.future.pop();
    if (!next) return current;
    this.past.push(structuredClone(current));
    return next;
  }
}
