import { Ajv2020 } from 'ajv/dist/2020.js';
import schema from '../../editor-lab/cometrow-editor-lab.schema.json' with { type: 'json' };
export const devices = ['mobile', 'tablet', 'desktop'] as const;
export type Device = (typeof devices)[number];
export const bands = [
  'background',
  'decorative',
  'content',
  'interactive',
] as const;
export type Style = Partial<{
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacingPx: number;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidthPx: number;
  borderRadiusPx: number;
  paddingPx: number;
  opacity: number;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
  objectPositionX: number;
  objectPositionY: number;
}>;
export type Height =
  | { mode: 'auto'; minPx: number }
  | { mode: 'fixed'; px: number }
  | { mode: 'aspect'; ratio: number };
export type Placement = {
  geometryMode?: 'auto' | 'custom';
  inferredRole?: 'content' | 'decoration' | 'background';
  x: number;
  yPx: number;
  w: number;
  height: Height;
  layerBand: (typeof bands)[number];
  layerOrder: number;
  locked: boolean;
  hidden: boolean;
  sectionBackground: boolean;
};
type Contents = {
  heading: { text: string; level: number };
  paragraph: { text: string };
  image: { assetId: string; alt: string; decorative: boolean };
  video: {
    assetId: string;
    posterAssetId?: string | null;
    controls: boolean;
    autoplay: boolean;
    muted: boolean;
    loop: boolean;
  };
  button: {
    label: string;
    action: { kind: 'url' | 'section'; value: string; newTab?: boolean };
  };
  shape: { shape: 'rectangle' | 'ellipse' | 'line'; decorative: boolean };
};
export type Kind = keyof Contents;
export type LabNode = {
  [K in Kind]: {
    id: string;
    name: string;
    type: K;
    content: Contents[K];
    baseStyle: Style;
    styleOverrides: Partial<Record<Device, Style>>;
  };
}[Kind];
export type Asset = {
  id: string;
  kind: 'image' | 'video';
  name: string;
  mimeType: string;
  source:
    | { kind: 'sample'; path: string }
    | { kind: 'url'; url: string }
    | { kind: 'local'; blobKey: string; embeddedDataUrl?: string };
};
export type Layout = {
  height: Exclude<Height, { mode: 'aspect' }>;
  origin: 'template' | 'generated' | 'user';
  generatedFrom?: Device | null;
  placements: Record<string, Placement>;
};
export type ResponsiveGroup = {
  id: string;
  name: string;
  layout: 'row' | 'stack' | 'overlay';
  children: string[];
};
export type ResponsiveRelationships = {
  groups: ResponsiveGroup[];
  roles: Record<string, 'content' | 'decoration'>;
};
export type LabDocument = {
  primaryScreen?: Device;
  schemaVersion: 'editor-lab/1';
  documentId: string;
  name: string;
  breakpoints: Record<
    Device,
    {
      minWidthPx: number;
      maxWidthPx: number | null;
      previewWidthPx: number;
      visibleGuideColumns: number;
      horizontalUnits: number;
    }
  >;
  sections: {
    id: string;
    kind: 'freeform';
    name: string;
    childIds: string[];
    readingOrder: string[];
    bottomPaddingPx?: number;
    responsive?: ResponsiveRelationships;
    layouts: Record<Device, Layout>;
  }[];
  nodes: Record<string, LabNode>;
  assets: Record<string, Asset>;
};
export const uid = () => 'n' + crypto.randomUUID();
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
}
const ajv = new Ajv2020({
  strict: false,
  allErrors: true,
  formats: { uri: { type: 'string', validate: safeUrl } },
});
const validateSchema = ajv.compile(schema);
export const resolved = (n: LabNode, b: Device): Style => ({
  ...n.baseStyle,
  ...n.styleOverrides[b],
});
export const percent = (units: number) => (units / 480) * 100;
export const units = (px: number, width: number) =>
  Math.round((px / width) * 480);
export const breakpoint = (width: number): Device =>
  width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
export const zOrder = (p: Placement) =>
  bands.indexOf(p.layerBand) * 100 + p.layerOrder;
export const nodeHeight = (p: Placement, width: number) =>
  p.height.mode === 'fixed'
    ? p.height.px
    : p.height.mode === 'auto'
      ? p.height.minPx
      : (width * p.w) / 480 / p.height.ratio;
export function sectionHeight(
  d: LabDocument,
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
            ([id, p]) =>
              p.yPx +
              (measured[id] ?? nodeHeight(p, d.breakpoints[b].previewWidthPx)) +
              (s.bottomPaddingPx ?? 32),
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
export function snap(
  p: Placement,
  others: Placement[],
  precision = false,
  width = 1200,
  height = 640,
  resize = '',
) {
  const q = structuredClone(p),
    guides: string[] = [];
  if (precision) return { placement: q, guides };
  const originalX = q.x,
    originalY = q.yPx;
  const h = nodeHeight(q, width);
  const xs = [
    0,
    240,
    480,
    ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w]),
  ];
  const ys = [
    0,
    height / 2,
    height,
    ...others.flatMap((o) => [
      o.yPx,
      o.yPx + nodeHeight(o, width) / 2,
      o.yPx + nodeHeight(o, width),
    ]),
  ];
  let bestX = 5,
    bestY = 5,
    xDelta = 0,
    yDelta = 0;
  if (resize.includes('s') && q.height.mode === 'fixed')
    q.height.px = Math.round(q.height.px / 8) * 8;
  else if (!resize) q.yPx = Math.round(q.yPx / 8) * 8;
  for (const x of xs)
    for (const offset of resize ? [q.w] : [0, q.w / 2, q.w]) {
      const delta = x - originalX - offset;
      if (Math.abs(delta) < bestX) {
        bestX = Math.abs(delta);
        xDelta = delta;
        guides[0] = `Vertical guide ${x}`;
      }
    }
  for (const y of ys)
    for (const offset of resize ? [h] : [0, h / 2, h]) {
      const delta = y - originalY - offset;
      if (Math.abs(delta) < bestY) {
        bestY = Math.abs(delta);
        yDelta = delta;
        guides[1] = `Horizontal guide ${y}`;
      }
    }
  if (resize) {
    if (resize.includes('e')) q.w = Math.round(q.w + xDelta);
    if (resize.includes('s') && q.height.mode === 'fixed' && bestY < 5)
      q.height.px = Math.round(h + yDelta);
  } else {
    q.x = Math.round(q.x + xDelta);
    if (bestY < 5) q.yPx = Math.round(originalY + yDelta);
  }
  if (!resize)
    for (const axis of ['x', 'y'] as const) {
      const sorted = [...others].sort((a, b) =>
        axis === 'x' ? a.x - b.x : a.yPx - b.yPx,
      );
      for (let i = 1; i < sorted.length; i++) {
        const a = sorted[i - 1]!,
          b = sorted[i]!;
        const end = axis === 'x' ? a.x + a.w : a.yPx + nodeHeight(a, width),
          start = axis === 'x' ? b.x : b.yPx,
          size = axis === 'x' ? q.w : h;
        const target = (end + start - size) / 2,
          current = axis === 'x' ? q.x : q.yPx;
        if (start - end >= size && Math.abs(current - target) < 5) {
          if (axis === 'x') q.x = Math.round(target);
          else q.yPx = Math.round(target);
          guides.push(`Equal ${axis === 'x' ? 'horizontal' : 'vertical'} gaps`);
        }
      }
    }
  return { placement: q, guides: guides.filter(Boolean) };
}
export function validate(value: unknown): asserts value is LabDocument {
  if (!validateSchema(value))
    throw Error(ajv.errorsText(validateSchema.errors));
  const d = value as LabDocument;
  if (d.sections.length !== 1) throw Error('P0 supports one hero');
  const s = d.sections[0]!;
  const same = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id) => b.includes(id));
  if (
    !same(Object.keys(d.nodes), s.childIds) ||
    !same(s.childIds, s.readingOrder)
  )
    throw Error('Reading order / node membership mismatch');
  if (s.responsive) {
    const groups = new Map(s.responsive.groups.map((g) => [g.id, g]));
    if (groups.size !== s.responsive.groups.length)
      throw Error('Duplicate responsive group');
    const owners = new Set<string>();
    for (const g of groups.values()) {
      if (d.nodes[g.id]) throw Error('Responsive group conflicts with node');
      for (const id of g.children) {
        if (!d.nodes[id] && !groups.has(id))
          throw Error('Unknown responsive member');
        if (owners.has(id))
          throw Error('Responsive member belongs to two groups');
        owners.add(id);
      }
    }
    const visit = (id: string, path: Set<string>) => {
      if (path.has(id)) throw Error('Responsive group cycle');
      const g = groups.get(id);
      if (g)
        for (const child of g.children) visit(child, new Set([...path, id]));
    };
    for (const id of groups.keys()) visit(id, new Set());
    for (const id of Object.keys(s.responsive.roles))
      if (!d.nodes[id]) throw Error('Unknown responsive role');
      else if (
        d.nodes[id]!.type === 'button' &&
        s.responsive.roles[id] === 'decoration'
      )
        throw Error('Buttons remain interactive content');
  }
  for (const [id, a] of Object.entries(d.assets)) {
    if (id !== a.id) throw Error('Asset ID mismatch');
    if (
      a.source.kind === 'sample' &&
      !['/lab/sample.svg', '/lab/sample.webm'].includes(a.source.path)
    )
      throw Error('Unknown sample');
    if (a.source.kind === 'url' && !safeUrl(a.source.url))
      throw Error('Unsafe asset URL');
    if (a.source.kind === 'local' && a.source.embeddedDataUrl)
      throw Error('Embedded assets are unsupported; use device-local blobs');
  }
  for (const [id, n] of Object.entries(d.nodes)) {
    if (id !== n.id) throw Error('Node ID mismatch');
    if (n.type === 'image' || n.type === 'video') {
      if (d.assets[n.content.assetId]?.kind !== n.type)
        throw Error('Missing or incompatible asset');
      if (
        n.type === 'image' &&
        (n.content.decorative ? !!n.content.alt : !n.content.alt.trim())
      )
        throw Error('Image needs alt text or decorative status');
      if (
        n.type === 'video' &&
        ((n.content.autoplay && !n.content.muted) ||
          (n.content.posterAssetId &&
            d.assets[n.content.posterAssetId]?.kind !== 'image'))
      )
        throw Error('Invalid video accessibility');
    }
    if (
      n.type === 'button' &&
      (n.content.action.kind === 'url'
        ? !safeUrl(n.content.action.value)
        : n.content.action.value !== s.id)
    )
      throw Error('Unsafe or unresolved action');
  }
  for (const b of devices) {
    const l = s.layouts[b];
    if (!same(Object.keys(l.placements), s.childIds))
      throw Error('Incomplete placement map');
    for (const [id, p] of Object.entries(l.placements)) {
      if (
        p.x + p.w > 480 ||
        (l.height.mode === 'fixed' &&
          p.yPx + nodeHeight(p, d.breakpoints[b].previewWidthPx) > l.height.px)
      )
        throw Error('Outside section bounds');
      if (p.sectionBackground && d.nodes[id]!.type !== 'image')
        throw Error('Only images are backgrounds');
      if (d.nodes[id]!.type === 'button' && p.layerBand !== 'interactive')
        throw Error('Buttons require interactive band');
    }
  }
}
// Legacy and partially annotated designs are protected, never inferred as Auto.
export function normalizeDocument(value: unknown): LabDocument {
  validate(value);
  const d = structuredClone(value);
  const legacy = !d.primaryScreen;
  d.primaryScreen ??= 'desktop';
  for (const section of d.sections)
    for (const b of devices)
      for (const p of Object.values(section.layouts[b].placements)) {
        if (legacy) p.geometryMode = 'custom';
        else p.geometryMode ??= 'custom';
      }
  return d;
}
export const primaryScreen = (d: LabDocument): Device =>
  d.primaryScreen ?? 'desktop';
export function geometryState(d: LabDocument, id: string, b: Device) {
  const p = d.sections[0]!.layouts[b].placements[id]!;
  return p.hidden
    ? 'Hidden'
    : b === primaryScreen(d)
      ? 'Primary'
      : p.geometryMode === 'auto'
        ? 'Auto'
        : 'Custom';
}
export function validateFile(file: { type: string; size: number }) {
  if (
    !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
      file.type,
    ) ||
    file.size > 5 * 1024 * 1024 ||
    file.size === 0
  )
    throw Error('Choose a PNG, JPEG, WebP or GIF image up to 5 MB.');
}
export function createNode(type: Kind, id = uid()): LabNode {
  const contents: Contents = {
    heading: { text: 'Make room for your next idea.', level: 1 },
    paragraph: {
      text: 'A considered experience, created for curious people. Make this story your own.',
    },
    image: {
      assetId: 'sample-image',
      alt: 'Blue geometric studio forms',
      decorative: false,
    },
    video: {
      assetId: 'sample-video',
      controls: true,
      autoplay: false,
      muted: true,
      loop: true,
    },
    button: {
      label: 'Discover more',
      action: { kind: 'url', value: 'https://example.com', newTab: false },
    },
    shape: { shape: 'rectangle', decorative: true },
  };
  return {
    id,
    name: type,
    type,
    content: contents[type],
    baseStyle: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      fontSizePx: type === 'heading' ? 48 : 18,
      lineHeight: 1.3,
      color: type === 'button' ? '#ffffff' : '#172338',
      ...(type === 'button'
        ? { backgroundColor: '#315ad8', paddingPx: 12, borderRadiusPx: 8 }
        : type === 'shape'
          ? { backgroundColor: '#edf2ff' }
          : {}),
    },
    styleOverrides: {},
  } as LabNode;
}
export function placement(type: Kind, x = 120, yPx = 120): Placement {
  return {
    x,
    yPx,
    w: 240,
    height:
      type === 'image' || type === 'video'
        ? { mode: 'aspect', ratio: 16 / 9 }
        : type === 'shape'
          ? { mode: 'fixed', px: 120 }
          : { mode: 'auto', minPx: 44 },
    layerBand:
      type === 'button'
        ? 'interactive'
        : type === 'shape'
          ? 'decorative'
          : 'content',
    layerOrder: 0,
    locked: false,
    hidden: false,
    sectionBackground: false,
  };
}
export function seed(): LabDocument {
  return {
    primaryScreen: 'desktop',
    schemaVersion: 'editor-lab/1',
    documentId: 'lab-document',
    name: 'Editor Lab',
    breakpoints: {
      mobile: {
        minWidthPx: 0,
        maxWidthPx: 639,
        previewWidthPx: 390,
        visibleGuideColumns: 8,
        horizontalUnits: 480,
      },
      tablet: {
        minWidthPx: 640,
        maxWidthPx: 1023,
        previewWidthPx: 768,
        visibleGuideColumns: 12,
        horizontalUnits: 480,
      },
      desktop: {
        minWidthPx: 1024,
        maxWidthPx: null,
        previewWidthPx: 1200,
        visibleGuideColumns: 24,
        horizontalUnits: 480,
      },
    },
    sections: [
      {
        id: 'hero-section',
        kind: 'freeform',
        name: 'Hero',
        childIds: [],
        readingOrder: [],
        bottomPaddingPx: 32,
        layouts: Object.fromEntries(
          devices.map((b) => [
            b,
            {
              height: { mode: 'auto', minPx: 640 },
              origin: b === 'desktop' ? 'template' : 'generated',
              generatedFrom: b === 'desktop' ? null : 'desktop',
              placements: {},
            },
          ]),
        ) as Record<Device, Layout>,
      },
    ],
    nodes: {},
    assets: {
      'sample-image': {
        id: 'sample-image',
        kind: 'image',
        name: 'Studio forms',
        mimeType: 'image/svg+xml',
        source: { kind: 'sample', path: '/lab/sample.svg' },
      },
      'sample-video': {
        id: 'sample-video',
        kind: 'video',
        name: 'Studio motion',
        mimeType: 'video/webm',
        source: { kind: 'sample', path: '/lab/sample.webm' },
      },
    },
  };
}
