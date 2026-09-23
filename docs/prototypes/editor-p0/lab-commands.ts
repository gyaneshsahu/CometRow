import {
  type LabDocument,
  type LabNode,
  type Device,
  type Placement,
  type Style,
  type Asset,
  type Layout,
  devices,
  uid,
  clamp,
  sectionHeight,
  nodeHeight,
  validate,
} from './lab-model.js';
export type Command =
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
  | { type: 'DuplicateNode' | 'DeleteNode'; id: string; newId?: string }
  | {
      type: 'SetImageAsBackground' | 'DetachImageFromBackground';
      id: string;
      device: Device;
    }
  | { type: 'SetSectionHeight'; device: Device; height: Layout['height'] }
  | {
      type: 'ApplyGeneratedBreakpointLayout' | 'ResetBreakpointLayout';
      device: Device;
      from: Device;
      confirmed?: boolean;
    }
  | { type: 'ImportDocument'; document: LabDocument };
export function execute(input: LabDocument, c: Command): LabDocument {
  if (c.type === 'ImportDocument') {
    validate(c.document);
    return structuredClone(c.document);
  }
  const d = structuredClone(input),
    s = d.sections[0]!;
  const b = 'device' in c && c.device !== 'all' ? c.device : undefined;
  const l = b ? s.layouts[b] : undefined;
  const n = 'id' in c ? d.nodes[c.id] : undefined;
  const p = n && l ? l.placements[n.id] : undefined;
  switch (c.type) {
    case 'AddNode':
      d.nodes[c.node.id] = structuredClone(c.node);
      s.childIds.push(c.node.id);
      s.readingOrder.push(c.node.id);
      for (const bp of devices) {
        const layout = s.layouts[bp];
        layout.placements[c.node.id] = clamp(
          c.placement,
          sectionHeight(d, bp),
          d.breakpoints[bp].previewWidthPx,
        );
      }
      break;
    case 'ChangeNodeType':
      d.nodes[c.id] = structuredClone(c.node);
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
      s.readingOrder.splice(s.readingOrder.indexOf(c.id) + 1, 0, id);
      for (const bp of devices)
        s.layouts[bp].placements[id] = structuredClone(
          s.layouts[bp].placements[c.id]!,
        );
      break;
    }
    case 'DeleteNode':
      delete d.nodes[c.id];
      s.childIds = s.childIds.filter((id) => id !== c.id);
      s.readingOrder = s.readingOrder.filter((id) => id !== c.id);
      for (const bp of devices) delete s.layouts[bp].placements[c.id];
      break;
    case 'SetImageAsBackground':
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
    case 'ApplyGeneratedBreakpointLayout':
    case 'ResetBreakpointLayout':
      if (c.device === c.from)
        throw Error('Choose a different source breakpoint');
      if (
        l!.origin === 'user' &&
        !(c.type === 'ResetBreakpointLayout' && c.confirmed)
      )
        throw Error('User layout is protected; explicitly reset first.');
      s.layouts[c.device] = structuredClone(s.layouts[c.from]);
      s.layouts[c.device].origin = 'generated';
      s.layouts[c.device].generatedFrom = c.from;
      break;
  }
  if (
    l &&
    c.type !== 'ApplyGeneratedBreakpointLayout' &&
    c.type !== 'ResetBreakpointLayout'
  )
    l.origin = 'user';
  validate(d);
  return d;
}
export class History {
  past: LabDocument[] = [];
  future: LabDocument[] = [];
  lastKey = '';
  lastTime = 0;
  constructor(public document: LabDocument) {}
  commit(c: Command, key = '') {
    const next = execute(this.document, c),
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
