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
export const visualBlockSchema = z.strictObject({
  id: z.uuid(),
  enabled: z.boolean(),
  type: z.literal('visual-section'),
  data: visualSchema,
});
export const documentShape = z.strictObject({
  schemaVersion: z.literal(2),
  theme: themeSchema,
  blocks: z.array(visualBlockSchema).max(pilotLimits.blocksPerCampaign),
});
export type CampaignDocument = z.infer<typeof documentShape>;
export type Theme = CampaignDocument['theme'];
export const documentSchema = documentShape.superRefine((doc, ctx) => {
  const add = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message });
  const ids = new Set<string>();
  let images = 0,
    videos = 0;
  doc.blocks.forEach((entry, index) => {
    const path = ['blocks', index, 'data'];
    if (ids.has(entry.id))
      add(['blocks', index, 'id'], 'Each block needs a unique identity.');
    ids.add(entry.id);
    if (entry.data.document.sections[0]!.id !== 's' + entry.id)
      add(
        [...path, 'section', 'id'],
        'Visual section identity must match its block.',
      );
    for (const node of Object.values(entry.data.document.nodes)) {
      images += Number(node.type === 'image');
      videos += Number(node.type === 'video');
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
export type DraftSnapshot = { document: CampaignDocument; revision: number };
export const newVisualDocument = (id: string): CampaignDocument => ({
  schemaVersion: 2,
  theme: themeSchema.parse({}),
  blocks: [
    { id, enabled: true, type: 'visual-section', data: createVisual(id) },
  ],
});
