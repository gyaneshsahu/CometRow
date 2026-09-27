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
export const visualSchema = z.custom<VisualData>(
  check,
  'Invalid shared editor document or resolved layouts.',
);
export const visualShape = visualSchema;
