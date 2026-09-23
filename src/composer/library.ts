import type { BlockType, ContentBlock } from './schema.js';

export type Field = {
  key: string;
  label: string;
  kind?:
    'textarea' | 'select' | 'checkbox' | 'datetime-local' | 'url' | 'email';
  help?: string;
  section?: string;
  max?: number;
  options?: readonly string[];
  fields?: Field[];
  item?: Record<string, unknown>;
  maxItems?: number;
};
export type BlockDefinition = {
  type: BlockType;
  name: string;
  description: string;
  icon: string;
  group: string;
  fields: Field[];
  defaults: Record<string, unknown>;
};
const field = (key: string, label: string, max = 160): Field => ({
  key,
  label,
  max,
});
const area = (key: string, label: string, max = 1200): Field => ({
  key,
  label,
  max,
  kind: 'textarea',
});
const link = (key: string, label: string): Field => ({
  key,
  label,
  kind: 'url',
  max: 2048,
  help: 'Use a full https:// link. We check its format, not whether the page exists. Leave blank while drafting.',
});
const select = (key: string, label: string, options: string[]): Field => ({
  key,
  label,
  kind: 'select',
  options,
});
const ratio = select('ratio', 'Media shape', [
  'landscape',
  'square',
  'portrait',
]);
export const blockLibrary: BlockDefinition[] = [
  {
    type: 'brand',
    name: 'Brand identity',
    description: 'Introduce your name and a short tagline.',
    icon: '◈',
    group: 'Introduction',
    defaults: { name: '', tagline: '', logo: true },
    fields: [
      field('name', 'Business name'),
      field('tagline', 'Tagline', 240),
      {
        key: 'logo',
        label: 'Show logo placeholder',
        kind: 'checkbox',
        help: 'Logo upload will be available with media. Your initials appear for now.',
      },
    ],
  },
  {
    type: 'hero',
    name: 'Hero',
    description: 'Make your opening statement memorable.',
    icon: '↗',
    group: 'Introduction',
    defaults: {
      eyebrow: '',
      headline: '',
      description: '',
      visual: 'none',
      ratio: 'landscape',
      alt: '',
    },
    fields: [
      field('eyebrow', 'Short introduction', 80),
      field('headline', 'Headline'),
      area('description', 'Description'),
      {
        ...select('visual', 'Cover placeholder', ['none', 'image', 'video']),
        section: 'Cover & accessibility',
      },
      { ...ratio, section: 'Cover & accessibility' },
      {
        ...field('alt', 'Cover description', 300),
        section: 'Cover & accessibility',
      },
    ],
  },
  {
    type: 'media',
    name: 'Media gallery',
    description: 'Plan image and video placements.',
    icon: '▧',
    group: 'Story',
    defaults: { heading: '', items: [] },
    fields: [
      field('heading', 'Heading'),
      {
        key: 'items',
        label: 'Media slots',
        maxItems: 12,
        item: { kind: 'image', ratio: 'landscape', caption: '', alt: '' },
        fields: [
          select('kind', 'Media type', ['image', 'video']),
          ratio,
          field('alt', 'Image or video description', 300),
          field('caption', 'Caption', 300),
        ],
        help: 'Placeholders only. Up to 10 images and 2 videos across your campaign. Uploads come later.',
      },
    ],
  },
  {
    type: 'information',
    name: 'Rich information',
    description: 'Tell your story with simple formatting.',
    icon: '≡',
    group: 'Story',
    defaults: { heading: '', body: '' },
    fields: [
      field('heading', 'Heading'),
      {
        ...area('body', 'Your story', 8000),
        help: 'Use paragraphs, **bold**, *italic*, and lines starting with - for lists. HTML is not supported.',
      },
    ],
  },
  {
    type: 'benefits',
    name: 'Benefits & features',
    description: 'Show what makes the experience worthwhile.',
    icon: '✳',
    group: 'Story',
    defaults: { heading: '', items: [] },
    fields: [
      field('heading', 'Heading'),
      {
        key: 'items',
        label: 'Benefits',
        maxItems: 8,
        item: { title: '', description: '' },
        fields: [
          field('title', 'Benefit title'),
          area('description', 'Description', 500),
        ],
      },
    ],
  },
  {
    type: 'event',
    name: 'Date & location',
    description: 'Help people know when and where.',
    icon: '◷',
    group: 'Details',
    defaults: {
      heading: '',
      startsAt: '',
      endsAt: '',
      timezone: 'Europe/Berlin',
      venue: '',
      address: '',
      mapUrl: '',
    },
    fields: [
      field('heading', 'Heading'),
      { key: 'startsAt', label: 'Starts', kind: 'datetime-local' },
      { key: 'endsAt', label: 'Ends', kind: 'datetime-local' },
      {
        ...field('timezone', 'Time zone', 80),
        help: 'IANA time zone, e.g. Europe/Berlin. Times are displayed in this zone.',
      },
      field('venue', 'Venue', 240),
      area('address', 'Address', 500),
      link('mapUrl', 'Map link'),
    ],
  },
  {
    type: 'offer',
    name: 'Price & offer',
    description: 'Make an offer clear and easy to understand.',
    icon: '◇',
    group: 'Details',
    defaults: { heading: '', price: '', description: '', code: '', terms: '' },
    fields: [
      field('heading', 'Heading'),
      field('price', 'Price or offer', 80),
      area('description', 'Description', 600),
      field('code', 'Coupon code', 80),
      area('terms', 'Terms', 600),
    ],
  },
  {
    type: 'testimonials',
    name: 'Testimonials',
    description: 'Build trust with attributed feedback.',
    icon: '“',
    group: 'Story',
    defaults: { heading: '', items: [] },
    fields: [
      field('heading', 'Heading'),
      {
        key: 'items',
        label: 'Testimonials',
        maxItems: 6,
        item: { quote: '', author: '', source: '' },
        fields: [
          area('quote', 'Quote'),
          field('author', 'Attribution'),
          field('source', 'Source label', 240),
        ],
      },
    ],
  },
  {
    type: 'cta',
    name: 'Primary action',
    description: 'Give visitors one clear next step.',
    icon: '→',
    group: 'Actions',
    defaults: { heading: '', description: '', label: '', url: '' },
    fields: [
      field('heading', 'Heading'),
      area('description', 'Supporting text', 600),
      field('label', 'Button label', 80),
      link('url', 'Destination link'),
    ],
  },
  {
    type: 'actions',
    name: 'More ways to connect',
    description: 'Call, email, book, visit, or shop.',
    icon: '↗',
    group: 'Actions',
    defaults: { heading: '', items: [] },
    fields: [
      field('heading', 'Heading'),
      {
        key: 'items',
        label: 'Secondary actions',
        maxItems: 8,
        item: { kind: 'website', label: '', url: '' },
        fields: [
          select('kind', 'Action type', [
            'website',
            'call',
            'email',
            'whatsapp',
            'directions',
            'registration',
            'tickets',
            'store',
            'marketplace',
          ]),
          field('label', 'Button label', 80),
          {
            ...field('url', 'Destination', 2048),
            help: 'Use https://, tel:+4930123456 for calls, or mailto:hello@example.com for email.',
          },
        ],
      },
    ],
  },
  {
    type: 'contact',
    name: 'Contact details',
    description: 'Make your business easy to reach.',
    icon: '◎',
    group: 'Trust',
    defaults: { name: '', email: '', phone: '', address: '', website: '' },
    fields: [
      field('name', 'Business or contact name'),
      { ...field('email', 'Email', 254), kind: 'email' },
      field('phone', 'Phone number', 40),
      area('address', 'Address', 500),
      link('website', 'Website'),
    ],
  },
  {
    type: 'footer',
    name: 'Identity & legal',
    description: 'Identify the advertiser and add legal links.',
    icon: '⊞',
    group: 'Trust',
    defaults: { identity: '', legalLinks: [], note: '' },
    fields: [
      area('identity', 'Advertiser identity', 500),
      {
        key: 'legalLinks',
        label: 'Legal links',
        maxItems: 5,
        item: { label: '', url: '' },
        fields: [field('label', 'Link label', 80), link('url', 'Link address')],
      },
      area('note', 'Footer note', 500),
    ],
  },
];
export const definition = (type: BlockType) =>
  blockLibrary.find((entry) => entry.type === type)!;
export function newBlock(type: BlockType, id: string): ContentBlock {
  return {
    id,
    type,
    enabled: true,
    data: structuredClone(definition(type).defaults),
  } as ContentBlock;
}
export function blockTitle(block: ContentBlock) {
  const data = block.data as Record<string, unknown>;
  return String(
    data.headline ||
      data.heading ||
      data.name ||
      data.identity ||
      definition(block.type).name,
  );
}
