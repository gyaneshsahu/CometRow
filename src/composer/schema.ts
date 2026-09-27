import { z } from 'zod';
import { visualSchema, createVisual } from './visual/document.js';
import { pilotLimits } from '../shared/limits.js';

export const themeSchema = z.strictObject({
  preset: z.enum(['sage', 'paper', 'midnight']).default('sage'),
  accent: z
    .string()
    .regex(
      /^#[0-9a-fA-F]{6}$/,
      'Use a six-digit hex color, for example #375b37.',
    )
    .default('#375b37'),
  typography: z.enum(['modern', 'editorial']).default('modern'),
  corners: z.enum(['soft', 'square']).default('soft'),
});
const text = (max: number) => z.string().max(max);
const short = text(160);
const url = text(2048);
const media = z.strictObject({
  kind: z.enum(['image', 'video']),
  ratio: z.enum(['landscape', 'square', 'portrait']),
  caption: text(300),
  alt: text(300),
});
const action = z.strictObject({
  label: text(80),
  url,
  kind: z.enum([
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
});
const legal = z.strictObject({ label: text(80), url });
const common = { id: z.uuid(), enabled: z.boolean() };
const block = <T extends string, S extends z.ZodRawShape>(type: T, data: S) =>
  z.strictObject({
    ...common,
    type: z.literal(type),
    data: z.strictObject(data),
  });
export const blockSchema = z.discriminatedUnion('type', [
  block('brand', { name: short, tagline: text(240), logo: z.boolean() }),
  block('hero', {
    eyebrow: text(80),
    headline: short,
    description: text(1200),
    visual: z.enum(['none', 'image', 'video']),
    ratio: z.enum(['landscape', 'square', 'portrait']),
    alt: text(300),
  }),
  block('media', { heading: short, items: z.array(media).max(12) }),
  block('information', { heading: short, body: text(8000) }),
  block('benefits', {
    heading: short,
    items: z
      .array(z.strictObject({ title: short, description: text(500) }))
      .max(8),
  }),
  block('event', {
    heading: short,
    startsAt: text(16),
    endsAt: text(16),
    timezone: text(80),
    venue: text(240),
    address: text(500),
    mapUrl: url,
  }),
  block('offer', {
    heading: short,
    price: text(80),
    description: text(600),
    code: text(80),
    terms: text(600),
  }),
  block('testimonials', {
    heading: short,
    items: z
      .array(
        z.strictObject({ quote: text(1200), author: short, source: text(240) }),
      )
      .max(6),
  }),
  block('cta', {
    heading: short,
    description: text(600),
    label: text(80),
    url,
  }),
  block('actions', { heading: short, items: z.array(action).max(8) }),
  block('contact', {
    name: short,
    email: text(254),
    phone: text(40),
    address: text(500),
    website: url,
  }),
  block('footer', {
    identity: text(500),
    legalLinks: z.array(legal).max(5),
    note: text(500),
  }),
]);
export const legacyDocumentShape = z.strictObject({
  schemaVersion: z.literal(1),
  theme: themeSchema,
  blocks: z.array(blockSchema).max(pilotLimits.blocksPerCampaign),
});
export const visualBlockSchema = z.strictObject({
  ...common,
  type: z.literal('visual-section'),
  data: visualSchema,
});
export const documentShape = z.discriminatedUnion('schemaVersion', [
  legacyDocumentShape,
  z.strictObject({
    schemaVersion: z.literal(2),
    theme: themeSchema,
    blocks: z
      .array(z.union([blockSchema, visualBlockSchema]))
      .max(pilotLimits.blocksPerCampaign),
  }),
]);
export type CampaignDocument = {
  schemaVersion: 1 | 2;
  theme: z.infer<typeof themeSchema>;
  blocks: (z.infer<typeof blockSchema> | z.infer<typeof visualBlockSchema>)[];
};
export type ContentBlock = CampaignDocument['blocks'][number];
export type BlockType = ContentBlock['type'];
export type Theme = CampaignDocument['theme'];

export function isSafeUrl(value: string, kind = 'website') {
  if (!value) return true;
  if (
    /\s/.test(value) ||
    [...value].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    return false;
  if (kind === 'call') return /^tel:\+?[0-9().-]{3,32}$/.test(value);
  if (kind === 'email') return /^mailto:[^?&#]+@[^?&#]+\.[^?&#]+$/.test(value);
  try {
    const parsed = new URL(value);
    return (
      ['https:', 'http:'].includes(parsed.protocol) &&
      !!parsed.hostname &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}
function realDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(`${value}Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value
  );
}
export const documentSchema = documentShape.superRefine((doc, ctx) => {
  const add = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message });
  const ids = new Set<string>();
  let images = 0;
  let videos = 0;
  doc.blocks.forEach((entry, index) => {
    const path = ['blocks', index, 'data'];
    if (ids.has(entry.id))
      add(['blocks', index, 'id'], 'Each block needs a unique identity.');
    ids.add(entry.id);
    const link = (value: string, field: (string | number)[], kind?: string) => {
      if (!isSafeUrl(value, kind))
        add(
          [...path, ...field],
          kind === 'email'
            ? 'Use mailto:name@example.com.'
            : kind === 'call'
              ? 'Use tel:+4930123456.'
              : 'Use a complete http:// or https:// link without spaces or credentials.',
        );
    };
    if (entry.type === 'visual-section') {
      if (entry.data.document.sections[0]!.id !== 's' + entry.id)
        add(
          [...path, 'section', 'id'],
          'Visual section identity must match its block.',
        );
      for (const node of Object.values(entry.data.document.nodes)) {
        images += Number(node.type === 'image');
        videos += Number(node.type === 'video');
      }
    }
    if (entry.type === 'hero') {
      images += Number(entry.data.visual === 'image');
      videos += Number(entry.data.visual === 'video');
    }
    if (entry.type === 'media')
      entry.data.items.forEach((item) => {
        images += Number(item.kind === 'image');
        videos += Number(item.kind === 'video');
      });
    if (entry.type === 'cta') link(entry.data.url, ['url']);
    if (entry.type === 'actions')
      entry.data.items.forEach((item, i) =>
        link(item.url, ['items', i, 'url'], item.kind),
      );
    if (entry.type === 'footer')
      entry.data.legalLinks.forEach((item, i) =>
        link(item.url, ['legalLinks', i, 'url']),
      );
    if (entry.type === 'contact') {
      link(entry.data.website, ['website']);
      if (entry.data.email && !z.email().safeParse(entry.data.email).success)
        add([...path, 'email'], 'Enter a valid email address.');
      if (entry.data.phone && !/^\+?[0-9 ()-]{3,40}$/.test(entry.data.phone))
        add(
          [...path, 'phone'],
          'Use a phone number, optionally starting with +.',
        );
    }
    if (entry.type === 'event') {
      link(entry.data.mapUrl, ['mapUrl']);
      for (const field of ['startsAt', 'endsAt'] as const)
        if (entry.data[field] && !realDate(entry.data[field]))
          add([...path, field], 'Enter a valid date and time.');
      if (
        entry.data.endsAt &&
        (!entry.data.startsAt || entry.data.endsAt < entry.data.startsAt)
      )
        add([...path, 'endsAt'], 'The end must be on or after the start.');
      try {
        new Intl.DateTimeFormat('en', {
          timeZone: entry.data.timezone,
        }).format();
      } catch {
        add(
          [...path, 'timezone'],
          'Choose a valid IANA time zone, for example Europe/Berlin.',
        );
      }
    }
    const inspect = (value: unknown, location: (string | number)[]) => {
      if (typeof value === 'string' && /<\/?[a-z!][^>]*>/i.test(value))
        add(location, 'Use plain text or the supported formatting, not HTML.');
      if (Array.isArray(value))
        value.forEach((item, i) => inspect(item, [...location, i]));
      else if (value && typeof value === 'object')
        Object.entries(value).forEach(([key, item]) =>
          inspect(item, [...location, key]),
        );
    };
    inspect(entry.data, path);
  });
  if (images > pilotLimits.imagesPerCampaign)
    add(
      ['blocks'],
      `Use up to ${pilotLimits.imagesPerCampaign} image slots across the campaign.`,
    );
  if (videos > pilotLimits.videosPerCampaign)
    add(
      ['blocks'],
      `Use up to ${pilotLimits.videosPerCampaign} video slots across the campaign.`,
    );
  if (new TextEncoder().encode(JSON.stringify(doc)).length > 120000)
    add(['blocks'], 'This campaign is too large. Shorten the content.');
});
export const emptyDocument = (): CampaignDocument =>
  documentSchema.parse({ schemaVersion: 1, theme: {}, blocks: [] });
export type DraftSnapshot = { document: CampaignDocument; revision: number };

export const newVisualDocument = (id: string): CampaignDocument => ({
  schemaVersion: 2,
  theme: themeSchema.parse({}),
  blocks: [
    { id, enabled: true, type: 'visual-section', data: createVisual(id) },
  ],
});
