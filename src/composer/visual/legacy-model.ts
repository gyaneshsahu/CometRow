import { z } from 'zod';

// Geometry and relationships adapted from Editor Lab. Each engine input is one
// visual block; the campaign schema can contain multiple independent blocks.
export const devices = ['mobile', 'tablet', 'desktop'] as const;
export type Device = (typeof devices)[number];
export const bands = [
  'background',
  'decorative',
  'content',
  'interactive',
] as const;
const finite = (min: number, max: number) =>
  z.number().finite().min(min).max(max);
const id = z.uuid();
const color = z.string().regex(/^(#[0-9a-fA-F]{6}|transparent)$/);
export function safeUrl(value: string) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return (
      !/\s/.test(value) &&
      ['https:', 'http:'].includes(u.protocol) &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
export const styleSchema = z.strictObject({
  fontFamily: z.enum(['system-ui, sans-serif', 'Georgia, serif']).optional(),
  fontSizePx: finite(8, 120).optional(),
  fontWeight: finite(100, 900).optional(),
  lineHeight: finite(1, 3).optional(),
  letterSpacingPx: finite(-2, 10).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  color: color.optional(),
  backgroundColor: color.optional(),
  borderColor: color.optional(),
  borderWidthPx: finite(0, 20).optional(),
  borderRadiusPx: finite(0, 100).optional(),
  paddingPx: finite(0, 60).optional(),
  opacity: finite(0, 1).optional(),
  objectFit: z.enum(['cover', 'contain', 'fill', 'none']).optional(),
  objectPositionX: finite(0, 100).optional(),
  objectPositionY: finite(0, 100).optional(),
});
export type Style = z.infer<typeof styleSchema>;
export const heightSchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('auto'), minPx: finite(1, 4000) }),
  z.strictObject({ mode: z.literal('fixed'), px: finite(1, 4000) }),
  z.strictObject({ mode: z.literal('aspect'), ratio: finite(0.05, 20) }),
]);
export type Height = z.infer<typeof heightSchema>;
export const placementSchema = z.strictObject({
  geometryMode: z.enum(['auto', 'custom']),
  inferredRole: z.enum(['content', 'decoration', 'background']).optional(),
  x: finite(0, 479),
  yPx: finite(0, 4000),
  w: finite(1, 480),
  height: heightSchema,
  layerBand: z.enum(bands),
  layerOrder: finite(0, 99).int(),
  locked: z.boolean(),
  hidden: z.boolean(),
  sectionBackground: z.boolean(),
});
export type Placement = z.infer<typeof placementSchema>;
const common = {
  id,
  name: z.string().max(120),
  baseStyle: styleSchema,
  styleOverrides: z.strictObject({
    mobile: styleSchema.optional(),
    tablet: styleSchema.optional(),
    desktop: styleSchema.optional(),
  }),
};
const plain = (max: number) =>
  z
    .string()
    .max(max)
    .refine((v) => !/<\/?[a-z!][^>]*>/i.test(v), 'Use plain text, not HTML.');
export const nodeSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...common,
    type: z.literal('heading'),
    content: z.strictObject({ text: plain(1200), level: finite(1, 6).int() }),
  }),
  z.strictObject({
    ...common,
    type: z.literal('paragraph'),
    content: z.strictObject({ text: plain(8000) }),
  }),
  z.strictObject({
    ...common,
    type: z.literal('button'),
    content: z.strictObject({
      label: plain(160),
      action: z.strictObject({
        kind: z.literal('url'),
        value: z.string().max(2048).refine(safeUrl),
        newTab: z.boolean().optional(),
      }),
    }),
  }),
  z.strictObject({
    ...common,
    type: z.literal('image'),
    content: z.strictObject({ alt: plain(300), decorative: z.boolean() }),
  }),
  z.strictObject({
    ...common,
    type: z.literal('video'),
    content: z.strictObject({ alt: plain(300) }),
  }),
  z.strictObject({
    ...common,
    type: z.literal('shape'),
    content: z.strictObject({
      shape: z.enum(['rectangle', 'ellipse', 'line']),
      decorative: z.boolean(),
    }),
  }),
]);
export type VisualNode = z.infer<typeof nodeSchema>;
export type Kind = VisualNode['type'];
export const relationshipsSchema = z.strictObject({
  groups: z
    .array(
      z.strictObject({
        id,
        name: z.string().max(120),
        layout: z.enum(['row', 'stack', 'overlay']),
        children: z.array(id).max(50),
      }),
    )
    .max(50),
  roles: z.record(id, z.enum(['content', 'decoration'])),
});
export type ResponsiveRelationships = z.infer<typeof relationshipsSchema>;
export type ResponsiveGroup = ResponsiveRelationships['groups'][number];
export const layoutSchema = z.strictObject({
  height: z.union([
    z.strictObject({ mode: z.literal('auto'), minPx: finite(1, 4000) }),
    z.strictObject({ mode: z.literal('fixed'), px: finite(1, 4000) }),
  ]),
  origin: z.enum(['template', 'generated', 'user']),
  generatedFrom: z.enum(devices).nullable().optional(),
  placements: z.record(id, placementSchema),
});
export type Layout = z.infer<typeof layoutSchema>;
export const sectionSchema = z.strictObject({
  id,
  childIds: z.array(id).max(50),
  readingOrder: z.array(id).max(50),
  bottomPaddingPx: finite(0, 200),
  responsive: relationshipsSchema.optional(),
  layouts: z.strictObject({
    mobile: layoutSchema,
    tablet: layoutSchema,
    desktop: layoutSchema,
  }),
});
export type Section = z.infer<typeof sectionSchema>;
export const breakpoints = {
  mobile: { previewWidthPx: 390 },
  tablet: { previewWidthPx: 768 },
  desktop: { previewWidthPx: 1200 },
};
export type EngineDocument = {
  primaryScreen: Device;
  nodes: Record<string, VisualNode>;
  sections: Section[];
  breakpoints: typeof breakpoints;
};
export const primaryScreen = (d: EngineDocument) => d.primaryScreen;
export const resolved = (n: VisualNode, b: Device): Style => ({
  ...n.baseStyle,
  ...n.styleOverrides[b],
});
export const zOrder = (p: Placement) =>
  bands.indexOf(p.layerBand) * 100 + p.layerOrder;
export const nodeHeight = (p: Placement, width: number) =>
  p.height.mode === 'fixed'
    ? p.height.px
    : p.height.mode === 'auto'
      ? p.height.minPx
      : (width * p.w) / 480 / p.height.ratio;
export function sectionHeight(
  d: EngineDocument,
  b: Device,
  measured: Record<string, number> = {},
) {
  const s = d.sections[0]!,
    l = s.layouts[b];
  return l.height.mode === 'fixed'
    ? l.height.px
    : Math.max(
        l.height.minPx,
        ...Object.entries(l.placements)
          .filter(([, p]) => !p.hidden && !p.sectionBackground)
          .map(
            ([key, p]) =>
              p.yPx +
              (measured[key] ?? nodeHeight(p, breakpoints[b].previewWidthPx)) +
              s.bottomPaddingPx,
          ),
      );
}
export function clamp(p: Placement, height: number, width: number): Placement {
  const q = structuredClone(p);
  q.w = Math.max(1, Math.min(480, Math.round(q.w)));
  q.x = Math.max(0, Math.min(480 - q.w, Math.round(q.x)));
  if (q.height.mode === 'fixed')
    q.height.px = Math.max(44, Math.min(height, Math.round(q.height.px)));
  if (q.height.mode === 'aspect' && nodeHeight(q, width) > height)
    q.height = { mode: 'fixed', px: height };
  q.yPx = Math.max(
    0,
    Math.min(Math.floor(height - nodeHeight(q, width)), Math.round(q.yPx)),
  );
  return q;
}
