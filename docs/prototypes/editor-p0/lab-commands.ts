import {
  type LabDocument,
  type LabNode,
  type Device,
  type Placement,
  type Style,
  type Asset,
  type Layout,
  type ResponsiveRelationships,
  devices,
  uid,
  clamp,
  sectionHeight,
  nodeHeight,
  validate,
  normalizeDocument,
  primaryScreen,
} from './lab-model.js';
import {
  regenerateAuto,
  autoLayout,
  estimateText,
  type TextMeasure,
} from './lab-auto-layout.js';
export type Command =
  | {
      type: 'SetResponsiveRelationships';
      relationships: ResponsiveRelationships;
    }
  | { type: 'AddNode'; node: LabNode; placement: Placement; device: Device }
  | { type: 'ChangeNodeType'; id: string; node: LabNode }
  | {
      type: 'MoveNode' | 'ResizeNode';
      id: string;
      device: Device;
      placement: Placement;
    }
  | { type: 'UpdateNodeContent'; id: string; node: LabNode; asset?: Asset }
  | {
      type: 'UpdateNodeStyle';
      id: string;
      device: Device | 'all';
      style: Style;
    }
  | {
      type: 'SetNodeVisibility' | 'LockNode';
      id: string;
      device: Device;
      value: boolean;
    }
  | {
      type: 'SetLayer';
      id: string;
      device: Device;
      band: Placement['layerBand'];
      order: number;
    }
  | { type: 'SetReadingOrder'; ids: string[] }
  | { type: 'DuplicateNode'; id: string; newId?: string }
  | { type: 'DeleteNode'; id: string; confirmed: boolean }
  | { type: 'SetPrimaryScreen'; device: Device; confirmed: boolean }
  | { type: 'ResetNodeToAuto'; id: string; device: Device }
  | {
      type: 'SetImageAsBackground' | 'DetachImageFromBackground';
      id: string;
      device: Device;
    }
  | { type: 'SetSectionHeight'; device: Device; height: Layout['height'] }
  | { type: 'ImportDocument'; document: LabDocument };
export function execute(
  input: LabDocument,
  c: Command,
  measure: TextMeasure = estimateText,
): LabDocument {
  if (c.type === 'ImportDocument') {
    validate(c.document);
    return normalizeDocument(c.document);
  }
  const d = normalizeDocument(input),
    s = d.sections[0]!;
  const b = 'device' in c && c.device !== 'all' ? c.device : undefined;
  const l = b ? s.layouts[b] : undefined;
  const n = 'id' in c ? d.nodes[c.id] : undefined;
  const p = n && l ? l.placements[n.id] : undefined;
  const primary = primaryScreen(d);
  // Freeze the generated appearance when the user takes ownership of a box.
  // Otherwise a responsive heading would jump back to its larger authored size.
  if (
    b &&
    b !== primary &&
    n &&
    p?.geometryMode === 'auto' &&
    [
      'MoveNode',
      'ResizeNode',
      'SetImageAsBackground',
      'DetachImageFromBackground',
    ].includes(c.type)
  ) {
    const style = autoLayout(d, b, d.breakpoints[b].previewWidthPx, measure)
      .styles[n.id];
    if (style) n.styleOverrides[b] = { ...style };
  }
  switch (c.type) {
    case 'SetResponsiveRelationships':
      s.responsive = structuredClone(c.relationships);
      validate(d);
      break;
    case 'AddNode': {
      d.nodes[c.node.id] = structuredClone(c.node);
      s.childIds.push(c.node.id);
      s.readingOrder.push(c.node.id);
      const authored = clamp(
        c.placement,
        sectionHeight(d, c.device),
        d.breakpoints[c.device].previewWidthPx,
      );
      for (const bp of devices)
        s.layouts[bp].placements[c.node.id] = {
          ...structuredClone(authored),
          geometryMode: 'auto',
        };
      s.layouts[primary].placements[c.node.id] = {
        ...clamp(
          authored,
          sectionHeight(d, primary),
          d.breakpoints[primary].previewWidthPx,
        ),
        geometryMode: 'custom',
      };
      if (c.device !== primary)
        s.layouts[c.device].placements[c.node.id] = {
          ...authored,
          geometryMode: 'custom',
        };
      break;
    }
    case 'ChangeNodeType':
      d.nodes[c.id] = structuredClone(c.node);
      if (c.node.type === 'button' && s.responsive)
        delete s.responsive.roles[c.id];
      for (const bp of devices) {
        const q = s.layouts[bp].placements[c.id]!;
        q.layerBand = c.node.type === 'button' ? 'interactive' : 'content';
        q.sectionBackground = false;
        q.locked = false;
      }
      break;
    case 'MoveNode':
    case 'ResizeNode':
      l!.placements[c.id] = clamp(
        c.placement,
        l!.height.mode === 'auto'
          ? Math.max(
              sectionHeight(d, c.device),
              c.placement.yPx +
                nodeHeight(c.placement, d.breakpoints[c.device].previewWidthPx),
            )
          : sectionHeight(d, c.device),
        d.breakpoints[c.device].previewWidthPx,
      );
      l!.placements[c.id]!.geometryMode = 'custom';
      break;
    case 'UpdateNodeContent':
      d.nodes[c.id] = structuredClone(c.node);
      if (c.asset) d.assets[c.asset.id] = structuredClone(c.asset);
      break;
    case 'UpdateNodeStyle':
      if (c.device === 'all') {
        Object.assign(n!.baseStyle, c.style);
        for (const bp of devices)
          for (const key of Object.keys(c.style))
            delete n!.styleOverrides[bp]?.[key as keyof Style];
        for (const bp of devices) s.layouts[bp].origin = 'user';
      } else
        n!.styleOverrides[c.device] = {
          ...n!.styleOverrides[c.device],
          ...c.style,
        };
      break;
    case 'SetNodeVisibility':
      p!.hidden = c.value;
      break;
    case 'LockNode':
      p!.locked = c.value;
      break;
    case 'SetLayer':
      delete p!.inferredRole;
      p!.layerBand = c.band;
      p!.layerOrder = Math.max(0, Math.min(99, Math.round(c.order)));
      break;
    case 'SetReadingOrder':
      s.readingOrder = [...c.ids];
      break;
    case 'DuplicateNode': {
      const id = c.newId ?? uid();
      d.nodes[id] = { ...structuredClone(n!), id, name: n!.name + ' copy' };
      s.childIds.push(id);
      if (s.responsive) {
        const owner = s.responsive.groups.find((g) =>
          g.children.includes(c.id),
        );
        if (owner)
          owner.children.splice(owner.children.indexOf(c.id) + 1, 0, id);
        const role = s.responsive.roles[c.id];
        if (role) s.responsive.roles[id] = role;
      }
      s.readingOrder.splice(s.readingOrder.indexOf(c.id) + 1, 0, id);
      for (const bp of devices)
        s.layouts[bp].placements[id] = structuredClone(
          s.layouts[bp].placements[c.id]!,
        );
      break;
    }
    case 'DeleteNode':
      if (!c.confirmed) throw Error('Delete everywhere requires confirmation.');
      if (s.responsive) {
        delete s.responsive.roles[c.id];
        for (const group of s.responsive.groups)
          group.children = group.children.filter((id) => id !== c.id);
      }
      delete d.nodes[c.id];
      s.childIds = s.childIds.filter((id) => id !== c.id);
      s.readingOrder = s.readingOrder.filter((id) => id !== c.id);
      for (const bp of devices) delete s.layouts[bp].placements[c.id];
      break;
    case 'SetImageAsBackground':
      p!.geometryMode = 'custom';
      if (n?.type !== 'image') throw Error('Choose an image');
      Object.assign(p!, {
        x: 0,
        yPx: 0,
        w: 480,
        height: { mode: 'fixed', px: sectionHeight(d, c.device) },
        layerBand: 'background',
        layerOrder: 0,
        locked: true,
        sectionBackground: true,
      });
      n.styleOverrides[c.device] = {
        ...n.styleOverrides[c.device],
        objectFit: 'cover',
      };
      break;
    case 'DetachImageFromBackground':
      if (c.device === primary) {
        s.responsive ??= { groups: [], roles: {} };
        s.responsive.roles[c.id] = 'content';
      }
      p!.geometryMode = 'custom';
      Object.assign(p!, {
        sectionBackground: false,
        locked: false,
        layerBand: 'content',
      });
      break;
    case 'SetSectionHeight':
      l!.height = c.height;
      for (const [id, q] of Object.entries(l!.placements)) {
        l!.placements[id] = clamp(
          q,
          sectionHeight(d, c.device),
          d.breakpoints[c.device].previewWidthPx,
        );
        if (q.sectionBackground)
          l!.placements[id]!.height = {
            mode: 'fixed',
            px: sectionHeight(d, c.device),
          };
      }
      break;
    case 'ResetNodeToAuto':
      if (c.device === primary)
        throw Error('The Primary screen is the source.');
      p!.geometryMode = 'auto';
      break;
    case 'SetPrimaryScreen':
      if (!c.confirmed) throw Error('Changing Primary requires confirmation.');
      if (c.device === primary) break;
      {
        const promoted = autoLayout(
          d,
          c.device,
          d.breakpoints[c.device].previewWidthPx,
          measure,
        );
        s.layouts[c.device] = promoted.layout;
        for (const [id, style] of Object.entries(promoted.styles))
          d.nodes[id]!.styleOverrides[c.device] = { ...style };
      }
      for (const id of s.childIds)
        s.layouts[primary].placements[id]!.geometryMode = 'custom';
      d.primaryScreen = c.device;
      break;
  }
  if (l && c.type !== 'SetPrimaryScreen') l.origin = 'user';
  regenerateAuto(d, measure);
  validate(d);
  return d;
}
export class History {
  past: LabDocument[] = [];
  future: LabDocument[] = [];
  lastKey = '';
  lastTime = 0;
  constructor(
    public document: LabDocument,
    private measure: TextMeasure = estimateText,
  ) {
    this.document = normalizeDocument(document);
  }
  commit(c: Command, key = '') {
    const next = execute(this.document, c, this.measure),
      now = Date.now();
    if (JSON.stringify(next) === JSON.stringify(this.document)) return;
    if (!key || key !== this.lastKey || now - this.lastTime > 900)
      this.past.push(this.document);
    this.document = next;
    this.future = [];
    this.lastKey = key;
    this.lastTime = now;
  }
  undo() {
    const d = this.past.pop();
    if (d) {
      this.future.push(this.document);
      this.document = d;
    }
    this.lastKey = '';
  }
  redo() {
    const d = this.future.pop();
    if (d) {
      this.past.push(this.document);
      this.document = d;
    }
    this.lastKey = '';
  }
}
