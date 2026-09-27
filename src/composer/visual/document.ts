import { z } from 'zod';
import {
  seed,
  validate,
  normalizeDocument,
  devices,
  resolved,
  type LabDocument,
  type Device,
  type Layout,
  type Style,
} from '../../../docs/prototypes/editor-p0/lab-model.js';
import {
  autoLayout,
  estimateText,
  type TextMeasure,
} from '../../../docs/prototypes/editor-p0/lab-auto-layout.js';
import { legacySchema } from './legacy-document.js';
export {
  createNode,
  placement,
} from '../../../docs/prototypes/editor-p0/lab-model.js';
// This identifies the shared engine implementation. Inference changes require a
// new version and explicit handling of old saved versions, never silent reuse.
export const ENGINE_VERSION = 'editor-lab/1' as const;
export type ResolvedLayout = {
  width: number;
  height: number;
  layout: Layout;
  styles: Record<string, Style>;
};
export type VisualData = {
  layoutEngineVersion: typeof ENGINE_VERSION;
  document: LabDocument;
  resolved: Record<Device, ResolvedLayout>;
};
export function resolveVisual(
  document: LabDocument,
  measure: TextMeasure = estimateText,
): VisualData {
  const d = normalizeDocument(document);
  const snapshots = {} as VisualData['resolved'];
  for (const b of devices) {
    const width = d.breakpoints[b].previewWidthPx;
    const result = autoLayout(d, b, width, measure);
    snapshots[b] = {
      width,
      height: result.height,
      layout: result.layout,
      styles: Object.fromEntries(
        Object.keys(d.nodes).map((id) => [
          id,
          result.styles[id] ?? resolved(d.nodes[id]!, b),
        ]),
      ),
    };
  }
  return {
    layoutEngineVersion: ENGINE_VERSION,
    document: d,
    resolved: snapshots,
  };
}
export function createVisual(id: string): VisualData {
  const d = seed();
  d.documentId = 'c' + id;
  d.name = 'Campaign';
  d.sections[0]!.id = 's' + id;
  return resolveVisual(d);
}
function upgradeLegacy(value: unknown): unknown {
  const parsed = legacySchema.safeParse(value);
  if (!parsed.success) return value;
  const old = parsed.data,
    d = seed();
  const ids = new Map(
    [
      ...Object.keys(old.nodes),
      ...(old.section.responsive?.groups.map((g) => g.id) ?? []),
    ].map((id) => [id, 'n' + id]),
  );
  const mapped = (id: string) => ids.get(id) ?? id;
  const keys = <T>(record: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(record).map(([id, v]) => [mapped(id), v]),
    );
  d.documentId = 'c' + old.section.id;
  d.name = 'Campaign';
  d.primaryScreen = old.primaryScreen;
  d.sections = [
    {
      ...structuredClone(old.section),
      id: 's' + old.section.id,
      kind: 'freeform',
      name: 'Hero',
    },
  ];
  const section = d.sections[0]!;
  section.childIds = section.childIds.map(mapped);
  section.readingOrder = section.readingOrder.map(mapped);
  if (section.responsive) {
    section.responsive.roles = keys(section.responsive.roles);
    section.responsive.groups = section.responsive.groups.map((g) => ({
      ...g,
      id: mapped(g.id),
      children: g.children.map(mapped),
    }));
  }
  for (const b of devices)
    section.layouts[b].placements = keys(section.layouts[b].placements);
  for (const [oldId, original] of Object.entries(old.nodes)) {
    const id = mapped(oldId),
      n = { ...original, id };
    if (n.type === 'image')
      d.nodes[id] = {
        ...n,
        content: {
          ...n.content,
          alt: n.content.decorative ? '' : n.content.alt,
          assetId: 'sample-image',
        },
      };
    else if (n.type === 'video')
      d.nodes[id] = {
        ...n,
        content: {
          assetId: 'sample-video',
          controls: true,
          muted: true,
          autoplay: false,
          loop: false,
        },
      };
    else if (n.type === 'button')
      d.nodes[id] = {
        ...n,
        content: {
          ...n.content,
          action: n.content.action.value
            ? n.content.action
            : { kind: 'section', value: 's' + old.section.id },
        },
      };
    else d.nodes[id] = n;
  }
  validate(d);
  // Existing recreated-editor drafts retain every authored placement, relationship
  // and saved appearance; no database or V1 conversion is performed.
  const snapshots = {} as VisualData['resolved'];
  for (const b of devices)
    snapshots[b] = {
      width: d.breakpoints[b].previewWidthPx,
      height: old.resolved[b].height,
      layout: structuredClone(section.layouts[b]),
      styles: keys(structuredClone(old.resolved[b].styles)),
    };
  return {
    layoutEngineVersion: ENGINE_VERSION,
    document: d,
    resolved: snapshots,
  };
}
function check(value: unknown): value is VisualData {
  try {
    if (!value || typeof value !== 'object') return false;
    const v = value as VisualData;
    if (
      v.layoutEngineVersion !== ENGINE_VERSION ||
      Object.keys(v).sort().join(',') !==
        'document,layoutEngineVersion,resolved'
    )
      return false;
    validate(v.document);
    // Production uses sample references as placeholders; Lab-only file storage
    // and external media are intentionally outside this integration milestone.
    if (
      Object.values(v.document.assets).some((a) => a.source.kind !== 'sample')
    )
      return false;
    if (Object.keys(v.document.nodes).length > 50) return false;
    if (Object.keys(v.resolved).sort().join(',') !== 'desktop,mobile,tablet')
      return false;
    const ids = Object.keys(v.document.nodes).sort().join(',');
    for (const b of devices) {
      const r = v.resolved[b];
      if (
        !r ||
        r.width !== v.document.breakpoints[b].previewWidthPx ||
        !Number.isFinite(r.height) ||
        r.height <= 0 ||
        r.height > 20000
      )
        return false;
      if (Object.keys(r.styles).sort().join(',') !== ids) return false;
      const copy = structuredClone(v.document);
      copy.sections[0]!.layouts[b] = r.layout;
      for (const [id, style] of Object.entries(r.styles))
        copy.nodes[id]!.styleOverrides[b] = style;
      validate(copy);
    }
    return true;
  } catch {
    return false;
  }
}
export const visualSchema = z.preprocess(
  upgradeLegacy,
  z.custom<VisualData>(
    check,
    'Invalid shared editor document or resolved layouts.',
  ),
);
export const visualShape = visualSchema;
