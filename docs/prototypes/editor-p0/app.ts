import {
  template,
  sections,
  elements,
  layouts,
  assets,
  anchors,
  elementBundle,
  sectionBundle,
  execute,
  errors,
  assertStructure,
  compatible,
  descendants,
  resolved,
  destination,
  actionError,
  History,
  type Project,
  type Node as CampaignNode,
  type Device,
  type Command,
  type Action,
  type Layout,
  type Style,
} from './model.js';
import { escape as e, artwork, canvasHtml, nodeHtml } from './render.js';
import * as storage from './storage.js';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
let project = template('event');
let revision = 0;
let acknowledged = '';
let selected: string | null = project.root;
let device: Device = 'phone';
let zoom = 'fit';
let scale = 1;
let preview = false;
let left = 'layers';
let libraryMode = 'sections';
let query = '';
let category = 'All';
let recent: string[] = [];
let tab = 'content';
let override = false;
let sheet = '';
let role: 'editor' | 'viewer' = 'editor';
let paused = false;
let offline = false;
let failNext = false;
let busy = false;
let conflict: storage.Saved | undefined;
let state = 'saved';
let saveTimer: ReturnType<typeof setTimeout>;
let toastTimer: ReturnType<typeof setTimeout>;
let composing = false;
let grouping = '';
let pendingLayout: Command | undefined;
let selectionBeforePreview: string | null;
let scrollBeforePreview = 0;
let observer: ResizeObserver | undefined;
let dialogTrigger: HTMLElement | null;
const collapsed = new Set<string>();
const history = new History();
const audit: { command: string; time: string }[] = [];
const mutable = () => role === 'editor';
const current = () => (selected ? project.nodes[selected] : undefined);
const dirty = () => JSON.stringify(project) !== acknowledged;
const btn = (action: string, label: string, disabled = false, cls = '') =>
  `<button data-action="${action}" class="${cls}" ${disabled ? 'disabled' : ''} title="${e(disabled ? `${label} is unavailable in the current state` : label)}">${label}</button>`;

$('#app').innerHTML =
  `<a class="skip" href="#stage">Skip to campaign canvas</a><header class="topbar"><a href="http://127.0.0.1:3000/app" class="back" title="Back to the local application">←<span class="sr-only">Back to application</span></a><a class="brand" href="http://127.0.0.1:3000/app"><span aria-hidden="true">↗</span>CometRow</a><div class="document-title"><button id="rename" data-action="rename" title="Rename campaign"></button><div id="save-status" role="status" aria-live="polite"></div></div><div class="history-controls">${btn('undo', 'Undo', true)}${btn('redo', 'Redo', true)}</div><button data-action="save" id="save-now" hidden>Save now</button><button data-action="review" class="review-button">Review tools</button><button data-action="new" class="new-button">New campaign</button><button data-action="preview" class="primary" id="preview-toggle">Preview</button></header><div class="review-bar"><span>P0 interaction review · local browser copy</span><span>No uploads or publishing · production unchanged</span></div><div class="workspace"><aside class="left-panel" aria-label="Content and layers"><div class="panel-nav" role="tablist" aria-label="Editor tools"><button role="tab" data-left="add">Add</button><button role="tab" data-left="layers">Layers</button><button role="tab" data-left="assets">Assets</button></div><div id="left-content"></div></aside><main class="canvas-column"><div class="canvas-toolbar"><button data-action="toggle-left" title="Show or hide content panel">Content</button><div class="devices" role="toolbar" aria-label="Preview device"><button data-device="phone">Phone</button><button data-device="tablet">Tablet</button><button data-device="desktop">Desktop</button></div><label class="zoom-label"><span class="sr-only">Canvas zoom</span><select id="zoom"><option value="fit">Fit</option><option value=".5">50%</option><option value=".75">75%</option><option value="1">100%</option><option value="1.25">125%</option></select></label><button data-action="toggle-right">Properties</button></div><div class="canvas-caption"><span id="selection-hint">Click to select · double-click text to edit</span><span id="dimensions"></span></div><div id="stage" tabindex="-1" aria-label="Campaign canvas"><div id="frame-space"><iframe id="canvas" title="Editable campaign canvas" sandbox="allow-same-origin"></iframe></div></div><div class="selection-bar" id="selection-bar"></div></main><aside class="right-panel" aria-label="Selection properties"><div class="inspector-heading"><div id="breadcrumb"></div><h2 id="inspector-title"></h2><div id="node-actions"></div></div><div id="inspector-tabs" role="tablist" aria-label="Property groups"></div><div id="inspector"></div></aside></div><nav class="mobile-nav" aria-label="Mobile editor"><button data-panel="">Canvas</button><button data-panel="add">Add</button><button data-panel="layers">Layers</button><button data-panel="assets">Assets</button><button data-panel="properties">Properties</button></nav><div id="sheet-backdrop" hidden></div><button class="sheet-close" data-action="close-sheet" hidden>Close panel ↓</button><div id="toast" role="status" aria-live="polite" hidden></div><div class="sr-only" id="announcement" aria-live="polite"></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog><div id="inline-tools" hidden role="toolbar" aria-label="Text formatting"><button data-action="bold">Bold</button><button data-action="italic">Italic</button><button data-action="text-done">Done</button></div>`;
const frame = $<HTMLIFrameElement>('#canvas');
const modal = $<HTMLDialogElement>('#dialog');
const mobile = () => innerWidth <= 1050;
function announce(message: string) {
  $('#announcement').textContent = message;
}
function toast(message: string) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('#toast').hidden = true), 4200);
  announce(message);
}
function backup() {
  try {
    sessionStorage.setItem(
      'cometrow:p0-recovery',
      JSON.stringify({ project, revision, acknowledged }),
    );
  } catch {
    toast(
      'Browser recovery storage is unavailable. Download a copy before leaving.',
    );
  }
}
function status() {
  const invalid = errors(project);
  const message = !mutable()
    ? 'Read only · Viewer review'
    : conflict
      ? 'Conflict · review required'
      : offline || !navigator.onLine
        ? 'Offline · edits retained in this tab'
        : busy
          ? 'Saving…'
          : state === 'error'
            ? 'Save failed · retry available'
            : invalid.length
              ? `${invalid.length} issue${invalid.length > 1 ? 's' : ''} · not saved`
              : dirty()
                ? paused
                  ? 'Unsaved changes · autosave paused'
                  : 'Unsaved changes'
                : `Saved locally · revision ${revision}`;
  $('#save-status').textContent = message;
  $('#save-status').dataset.state =
    conflict || state === 'error' || invalid.length
      ? 'error'
      : dirty()
        ? 'pending'
        : 'saved';
  $('#rename').textContent = project.nodes[project.root]!.name;
  $<HTMLButtonElement>('#rename').disabled = !mutable() || preview;
  const saveButton = $<HTMLButtonElement>('#save-now');
  saveButton.hidden =
    !mutable() ||
    (!dirty() && !conflict && state !== 'error' && !invalid.length);
  saveButton.textContent = conflict
    ? 'Review conflict'
    : state === 'error'
      ? 'Retry save'
      : invalid.length
        ? 'Review issues'
        : 'Save now';
  saveButton.disabled = busy || (!conflict && !invalid.length && offline);
  for (const [action, available] of [
    ['undo', history.past.length],
    ['redo', history.future.length],
  ] as const) {
    const b = $<HTMLButtonElement>(`[data-action=${action}]`);
    b.disabled = !available || !mutable() || preview;
    b.title = available
      ? `${action === 'undo' ? 'Undo' : 'Redo'} last change`
      : `Nothing to ${action} yet`;
  }
  document
    .querySelectorAll<HTMLButtonElement>('[data-action=new]')
    .forEach((b) => (b.disabled = !mutable()));
}
function schedule() {
  clearTimeout(saveTimer);
  backup();
  status();
  if (!paused && !composing && mutable() && !conflict)
    saveTimer = setTimeout(() => void save(), 900);
}
async function save(expected = revision) {
  if (
    !mutable() ||
    busy ||
    composing ||
    errors(project).length ||
    !dirty() ||
    offline ||
    !navigator.onLine
  )
    return;
  if (conflict && expected === revision) {
    showConflict();
    return;
  }
  busy = true;
  state = 'saving';
  status();
  const snapshot = structuredClone(project);
  try {
    if (failNext) {
      failNext = false;
      throw Error('Deliberate review failure');
    }
    const result = await storage.save(snapshot, expected);
    if (!result.ok) {
      conflict = result.saved;
      state = 'conflict';
      toast('Another tab saved first. Your edits are preserved.');
      showConflict();
    } else {
      revision = result.saved.revision;
      acknowledged = JSON.stringify(snapshot);
      conflict = undefined;
      state = 'saved';
      backup();
    }
  } catch {
    state = 'error';
    toast('Save failed. Your edits are still here. Retry or download a copy.');
  } finally {
    busy = false;
    status();
    if (dirty() && state === 'saved') schedule();
  }
}
function run(command: Command, message?: string, group = '', render = true) {
  try {
    const next = execute(project, command, role);
    if (JSON.stringify(next) === JSON.stringify(project)) return;
    if (!group || grouping !== group) history.push(project);
    grouping = group;
    project = next;
    audit.push({ command: command.type, time: new Date().toISOString() });
    if (selected && !project.nodes[selected]) selected = project.root;
    if (render) {
      panels();
      canvas();
    }
    schedule();
    if (message) toast(message);
  } catch (error) {
    toast((error as Error).message);
  }
}
function path(id: string): CampaignNode[] {
  const items: CampaignNode[] = [];
  let n: CampaignNode | undefined = project.nodes[id];
  while (n) {
    items.unshift(n);
    n = n.parent ? project.nodes[n.parent] : undefined;
  }
  return items;
}
function select(id: string | null, open = false) {
  selected = id;
  grouping = '';
  tab = 'content';
  panels();
  markSelection();
  if (open && mobile()) setSheet('properties');
  if (id)
    announce(`Selected ${project.nodes[id]!.name}, ${project.nodes[id]!.kind}`);
}
function markSelection() {
  frame.contentDocument
    ?.querySelectorAll<HTMLElement>('[data-node]')
    .forEach((el) => {
      const yes = el.dataset.node === selected && !preview;
      el.classList.toggle('selected', yes);
      el.setAttribute('aria-current', String(yes));
    });
  $('#selection-hint').textContent = preview
    ? 'Campaign preview · sample assets, no submission backend'
    : current()
      ? `${current()!.name} · ${current()!.kind}`
      : 'Click to select · double-click text to edit';
  $('#selection-bar').innerHTML =
    selected && !preview
      ? `<span>${e(current()!.name)}</span><button data-action="properties">Edit properties</button>${current()!.kind !== 'page' ? btn('up', 'Move up', !mutable()) + btn('down', 'Move down', !mutable()) : ''}`
      : '';
}
function setSheet(value: string) {
  sheet = value;
  if (['add', 'layers', 'assets'].includes(value)) left = value;
  document.body.dataset.sheet = value;
  const open = mobile() && !!value;
  $('#sheet-backdrop').hidden = !open;
  $('.sheet-close').hidden = !open;
  $('.topbar').inert = open;
  $('.canvas-column').inert = open;
  $('.left-panel').inert = open && value === 'properties';
  $('.right-panel').inert = open && value !== 'properties';
  panels();
  if (open) {
    const panel = value === 'properties' ? $('.right-panel') : $('.left-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.querySelector<HTMLElement>('button,input,select')?.focus();
  } else {
    for (const p of ['.left-panel', '.right-panel']) {
      $(p).removeAttribute('role');
      $(p).removeAttribute('aria-modal');
    }
    document
      .querySelector<HTMLButtonElement>(`[data-panel="${value}"]`)
      ?.focus();
  }
}
function panels() {
  renderLeft();
  inspector();
  status();
  document.querySelectorAll<HTMLElement>('[data-left]').forEach((b) => {
    b.setAttribute('aria-selected', String(b.dataset.left === left));
    b.tabIndex = b.dataset.left === left ? 0 : -1;
  });
}
function tree(id: string, depth = 0): string {
  const n = project.nodes[id]!;
  const isCollapsed = collapsed.has(id);
  return `<div class="layer-row ${selected === id ? 'active' : ''} ${n.visible ? '' : 'hidden-layer'}" style="--depth:${depth}" data-drop-node="${id}"><button class="expand" data-expand="${id}" aria-label="${isCollapsed ? 'Expand' : 'Collapse'} ${e(n.name)}" ${!n.children.length ? 'disabled' : ''}>${n.children.length ? (isCollapsed ? '›' : '⌄') : '·'}</button><button class="layer-label" data-select="${id}" aria-pressed="${selected === id}"><span>${e(n.name)}</span><small>${n.kind === 'element' ? e(n.type) : n.kind}${n.visible ? '' : ' · hidden'}</small></button>${n.kind !== 'page' ? `<button class="drag-handle" data-drag="${id}" title="Drag ${e(n.name)}. Use Move up/down in Properties as an alternative." aria-label="Drag ${e(n.name)}" ${!mutable() ? 'disabled' : ''}>⠿</button>` : ''}</div>${isCollapsed ? '' : n.children.map((child) => tree(child, depth + 1)).join('')}`;
}
function renderLeft() {
  if (left === 'layers') {
    $('#left-content').innerHTML =
      `<div class="panel-heading"><h2>Campaign layers</h2><span>${project.nodes[project.root]!.children.length}/20 sections</span></div><p class="helper">Select an item to make it yours.</p><div class="tree">${tree(project.root)}</div>${btn('add-section', '＋ Add section', !mutable(), 'wide')}`;
    return;
  }
  if (left === 'assets') {
    $('#left-content').innerHTML =
      `<div class="panel-heading"><h2>Sample assets</h2><span>Local review</span></div><p class="helper">Bundled images only. Choose an image on the canvas, then replace it here. Uploads, video and audio belong to the media phase.</p>${assets.map((a) => `<button class="asset-card" data-asset="${a.id}" ${!mutable() || current()?.type !== 'image' ? 'disabled' : ''} title="${current()?.type === 'image' ? 'Replace only the selected image' : 'Select an image element first'}">${artwork(a.id)}<strong>${a.name}</strong><small>Sample · ${a.width} × ${a.height} · SVG</small></button>`).join('')}<h3>Campaign brand</h3><p class="helper">Page properties control campaign colour and typography. CometRow application branding stays fixed.</p>${btn('select-page', 'Open campaign theme')}`;
    return;
  }
  $('#left-content').innerHTML =
    `<div class="panel-heading"><h2>Add to your campaign</h2></div><div class="submodes" role="tablist" aria-label="Library type">${['sections', 'elements', 'layouts'].map((m) => `<button role="tab" data-mode="${m}" aria-selected="${libraryMode === m}" tabindex="${libraryMode === m ? 0 : -1}">${m[0]!.toUpperCase() + m.slice(1)}</button>`).join('')}</div><label class="search-label"><span class="sr-only">Search library</span><input id="search" type="search" placeholder="Search ${libraryMode}…" value="${e(query)}"></label><label class="compact-label">Category<select id="category">${['All', 'Recent', ...new Set((libraryMode === 'sections' ? sections : elements).map((x) => x[3]))].map((c) => `<option ${c === category ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label class="compact-label">Insert<select id="insert-position"><option value="after">After selected</option><option value="before">Before selected</option><option value="inside">Into selected container</option></select></label><div id="library-results">${libraryResults()}</div>`;
}
function libraryResults() {
  const list =
    libraryMode === 'sections'
      ? sections
      : libraryMode === 'elements'
        ? elements
        : layouts.map(
            (l) =>
              [
                l[0],
                l[1],
                l[2],
                'Structure',
                'columns grid row stack',
              ] as const,
          );
  const filtered = list.filter(
    (row) =>
      `${row.join(' ')}`.toLowerCase().includes(query.toLowerCase()) &&
      (category === 'All' || category === 'Recent'
        ? category !== 'Recent' || recent.includes(`${libraryMode}:${row[0]}`)
        : row[3] === category),
  );
  return filtered.length
    ? filtered
        .map(
          (row) =>
            `<button class="library-card" data-library="${row[0]}" data-library-kind="${libraryMode}" ${!mutable() ? 'disabled' : ''}><div class="structure-thumb thumb-${row[0]}" aria-hidden="true"><i></i><i></i><i></i></div><span><strong>${e(row[1])}</strong><b aria-hidden="true">＋</b></span><small>${e(row[2])}</small></button>`,
        )
        .join('')
    : `<div class="empty"><h3>No matches</h3><p>Try “hero”, “signup” or “columns”.</p>${btn('clear-search', 'Clear filters')}</div>`;
}
function field(
  label: string,
  group: string,
  key: string,
  value: unknown,
  options?: readonly string[],
  bounds?: [number, number, number?],
): string {
  const attr = `data-group="${group}" data-key="${key}" ${!mutable() ? 'disabled' : ''}`;
  const control = options
    ? `<select ${attr}>${options.map((v) => `<option value="${e(v)}" ${String(value) === v ? 'selected' : ''}>${e(v)}</option>`).join('')}</select>`
    : typeof value === 'boolean'
      ? `<input ${attr} type="checkbox" ${value ? 'checked' : ''}>`
      : typeof value === 'number'
        ? `<input ${attr} type="number" value="${value}" min="${bounds?.[0] ?? 0}" max="${bounds?.[1] ?? 120}" step="${bounds?.[2] ?? 1}">`
        : [
              'text',
              'description',
              'answer',
              'privacy',
              'terms',
              'value',
            ].includes(key)
          ? `<textarea ${attr} rows="3">${e(value)}</textarea>`
          : `<input ${attr} type="${['start', 'end', 'target'].includes(key) ? 'datetime-local' : ['color', 'background', 'accent'].includes(key) ? 'text' : 'text'}" value="${e(value)}" maxlength="${key === 'name' ? 160 : 3000}">`;
  return `<label class="field ${typeof value === 'boolean' ? 'check' : ''}"><span>${e(label)}</span>${control}</label>`;
}
function inspector() {
  const n = current();
  $('#breadcrumb').innerHTML = n
    ? path(n.id)
        .map(
          (a) =>
            `<button data-select="${a.id}" title="Select ${e(a.name)}">${e(a.kind === 'page' ? 'Campaign' : a.name)}</button>`,
        )
        .join('<span>›</span>')
    : 'Nothing selected';
  $('#inspector-title').textContent = n?.name || 'Your campaign';
  $('#node-actions').innerHTML =
    n && n.kind !== 'page'
      ? `${btn('duplicate', 'Duplicate', !mutable())}${btn('visibility', n.visible ? 'Hide' : 'Show', !mutable())}${btn('delete', 'Delete', !mutable(), 'danger')}`
      : '';
  if (!n) {
    $('#inspector-tabs').innerHTML = '';
    $('#inspector').innerHTML =
      '<div class="empty"><h3>Choose something to edit</h3><p>Select a section, container or individual item on the canvas.</p></div>';
    return;
  }
  const hasAction = [
    'button',
    'image',
    'text',
    'heading',
    'logo',
    'contact',
  ].includes(n.type);
  const tabs = ['content', 'layout', 'style', ...(hasAction ? ['action'] : [])];
  if (!tabs.includes(tab)) tab = 'content';
  $('#inspector-tabs').innerHTML = tabs
    .map(
      (t) =>
        `<button role="tab" data-tab="${t}" aria-selected="${tab === t}" tabindex="${tab === t ? 0 : -1}">${t[0]!.toUpperCase() + t.slice(1)}</button>`,
    )
    .join('');
  const value = resolved(
    n,
    override && device !== 'desktop' ? device : 'desktop',
  );
  let html = '';
  if (tab === 'content') {
    html += field(
      n.kind === 'page' ? 'Campaign name' : 'Layer name',
      'name',
      'name',
      n.name,
    );
    if (n.type === 'image')
      html += `<div class="selected-asset">${artwork(String(n.content.asset))}</div>${btn('assets', 'Choose sample image', !mutable(), 'wide')}<p class="helper">Replacement affects this image only.</p>`;
    for (const [key, val] of Object.entries(n.content)) {
      if (['asset', 'sourcePath'].includes(key)) continue;
      const options =
        key === 'level'
          ? ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
          : key === 'ratio'
            ? ['1/1', '4/3', '3/4', '16/9']
            : key === 'fit'
              ? ['cover', 'contain']
              : key === 'fieldType'
                ? ['text', 'email', 'tel']
                : key === 'after'
                  ? ['message']
                  : undefined;
      html += field(
        key === 'text'
          ? 'Text'
          : key === 'alt'
            ? 'Alternative text'
            : key === 'decorative'
              ? 'Decorative image (empty alt)'
              : key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (a) => a.toUpperCase()),
        'content',
        key,
        val,
        options,
      );
    }
    if (n.type === 'form' && n.kind === 'element')
      html += `${btn('add-field', '＋ Add field', !mutable())}<p class="helper">Select each field in Layers to change its label, required state and order. Preview does not submit or collect data.</p>`;
    if (n.kind === 'section' || n.kind === 'container')
      html += `<p class="helper">${n.children.length} direct item${n.children.length === 1 ? '' : 's'}. Select an item on the canvas or in Layers to edit its content.</p>${btn('add-element', '＋ Add element', !mutable(), 'wide')}`;
    if (n.kind === 'page')
      html +=
        '<p class="helper">These are internal campaign settings. Change visible headings by selecting them on the canvas.</p>';
  } else if (tab === 'layout') {
    html += responsiveControl(n);
    const l = value.layout;
    if (n.kind === 'section' || n.kind === 'container')
      html +=
        field('Arrangement', 'layout', 'display', l.display, [
          'stack',
          'row',
          'grid',
          'overlay',
        ]) +
        field('Columns', 'layout', 'columns', l.columns, undefined, [1, 4]) +
        field(
          'First column (%)',
          'layout',
          'split',
          l.split,
          undefined,
          [20, 80],
        ) +
        field('Gap', 'layout', 'gap', l.gap, undefined, [0, 120]) +
        field('Reverse item order', 'layout', 'reverse', l.reverse) +
        field('Distribution', 'layout', 'justify', l.justify, [
          'start',
          'center',
          'end',
          'space-between',
        ]);
    html +=
      field('Alignment', 'layout', 'align', l.align, [
        'start',
        'center',
        'end',
        'stretch',
      ]) +
      field(
        'Width (%) · 0 means Auto',
        'layout',
        'width',
        l.width,
        undefined,
        [0, 100],
      ) +
      field(
        'Maximum width (px)',
        'layout',
        'maxWidth',
        l.maxWidth,
        undefined,
        [160, 1440],
      ) +
      field(
        'Padding (px)',
        'layout',
        'padding',
        l.padding,
        undefined,
        [0, 120],
      );
    if (l.display === 'overlay')
      html +=
        field('Foreground anchor', 'layout', 'anchor', l.anchor, anchors) +
        '<p class="helper">An image in the first position is the decorative background. Foreground items stay in front, inside safe insets.</p>';
    if (n.parent) {
      const parent = project.nodes[n.parent]!;
      const index = parent.children.indexOf(n.id);
      html += `<div class="move-buttons">${btn('up', 'Move up', !mutable() || index <= 0)}${btn('down', 'Move down', !mutable() || index >= parent.children.length - 1)}</div><label class="field"><span>Move to container</span><select id="move-parent" ${!mutable() ? 'disabled' : ''}><option value="">Choose destination…</option>${Object.values(
        project.nodes,
      )
        .filter(
          (p) => compatible(p, n) && !descendants(project, n.id).includes(p.id),
        )
        .map(
          (p) =>
            `<option value="${p.id}">${e(
              path(p.id)
                .map((x) => x.name)
                .join(' › '),
            )}</option>`,
        )
        .join('')}</select></label>`;
    }
  } else if (tab === 'style') {
    if (n.kind === 'page')
      html += `<p class="helper">Campaign appearance only. CometRow branding stays unchanged.</p>${field('Theme', 'theme', 'preset', project.theme.preset, ['paper', 'sage', 'midnight'])}${field('Campaign accent', 'theme', 'accent', project.theme.accent)}${field('Campaign typography', 'theme', 'typography', project.theme.typography, ['modern', 'editorial'])}${field('Button corners', 'theme', 'corners', project.theme.corners, ['soft', 'square'])}<hr>`;
    html += responsiveControl(n);
    const s = value.style;
    html += field('Background token', 'style', 'tone', s.tone, [
      'page',
      'soft',
      'dark',
      'accent',
    ]);
    if (n.kind === 'element')
      html +=
        field('Size (px)', 'style', 'size', s.size, undefined, [10, 96]) +
        field('Weight', 'style', 'weight', String(s.weight), [
          '400',
          '500',
          '600',
          '650',
          '700',
        ]) +
        field('Text alignment', 'style', 'align', s.align, [
          'left',
          'center',
          'right',
        ]) +
        field('Italic', 'style', 'italic', s.italic);
    if (n.type === 'button')
      html += field('Button style', 'style', 'variant', s.variant, [
        'primary',
        'secondary',
        'text',
      ]);
    html +=
      field('Corner radius', 'style', 'radius', s.radius, undefined, [0, 80]) +
      field('Border width', 'style', 'border', s.border, undefined, [0, 8]) +
      field('Shadow', 'style', 'shadow', s.shadow, [
        'none',
        'subtle',
        'medium',
      ]);
    html += `<details class="advanced"><summary>Advanced style values</summary>${field('Text colour · hex or empty', 'style', 'color', s.color)}${field('Background · hex or empty', 'style', 'background', s.background)}${field('Line height', 'style', 'lineHeight', s.lineHeight, undefined, [1, 2.5, 0.1])}${field('Letter spacing', 'style', 'tracking', s.tracking, undefined, [0, 8, 0.1])}${field('Opacity (%)', 'style', 'opacity', s.opacity, undefined, [20, 100])}</details>${btn('reset-style', 'Reset to theme', !mutable())}`;
  } else {
    html += field('Action type', 'action', 'kind', n.action.kind, [
      'none',
      'url',
      'section',
      'phone',
      'email',
      'whatsapp',
      'maps',
    ]);
    if (n.action.kind === 'section')
      html += `<label class="field"><span>Campaign section</span><select data-group="action" data-key="value" ${!mutable() ? 'disabled' : ''}><option value="">Choose a section</option>${project.nodes[project.root]!.children.map((id) => `<option value="${id}" ${n.action.value === id ? 'selected' : ''}>${e(project.nodes[id]!.name)}</option>`).join('')}</select></label>`;
    else if (n.action.kind !== 'none')
      html += field(
        n.action.kind === 'maps' ? 'Address or place' : 'Destination',
        'action',
        'value',
        n.action.value,
      );
    if (['url', 'maps', 'whatsapp'].includes(n.action.kind))
      html += field('Open in new tab', 'action', 'newTab', n.action.newTab);
    html +=
      field('Accessible label (optional)', 'action', 'label', n.action.label) +
      `<div id="action-result"><p class="helper">${n.action.kind === 'url' ? 'URL syntax is checked. The destination’s existence is not checked.' : 'One action model for every supported link.'}</p><output class="destination">${e(destination(n.action))}</output></div>`;
  }
  $('#inspector').innerHTML =
    `${!mutable() ? '<div class="notice">Viewer mode: properties are available to read.</div>' : ''}${html}<div id="validation" role="status"></div>`;
  validation();
}
function responsiveControl(n: CampaignNode) {
  return `<div class="responsive-control"><label class="check"><input id="override" type="checkbox" ${override ? 'checked' : ''} ${device === 'desktop' || !mutable() ? 'disabled' : ''}> Edit ${device} override</label><p>${device === 'desktop' || !override ? 'Base values · all devices inherit' : `${device} only · base is preserved`}</p>${device !== 'desktop' && n.overrides[device] ? `<span class="pill">${device} override</span>${btn('reset-override', 'Reset override', !mutable())}` : ''}</div>`;
}
function validation() {
  const list = errors(project).filter((err) => err.id === selected);
  const target = $('#validation');
  if (target)
    target.innerHTML = list
      .map((err) => `<p class="field-error">${e(err.message)}</p>`)
      .join('');
  const n = current();
  const dest = document.querySelector('.destination');
  if (dest && n)
    dest.textContent = actionError(n.action, project) || destination(n.action);
}
function sizeCanvas() {
  const width = { phone: 390, tablet: 768, desktop: 1200 }[device];
  const available = Math.max(
    240,
    $('#stage').clientWidth - (mobile() ? 24 : 64),
  );
  scale = zoom === 'fit' ? Math.min(1, available / width) : Number(zoom);
  const height = Math.max(
    600,
    Math.ceil(
      frame.contentDocument?.body?.getBoundingClientRect().height || 600,
    ) + 2,
  );
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  frame.style.transform = `scale(${scale})`;
  $('#frame-space').style.width = `${width * scale}px`;
  $('#frame-space').style.height = `${height * scale}px`;
  $('#dimensions').textContent = `${width}px · ${Math.round(scale * 100)}%`;
  document.querySelectorAll<HTMLElement>('[data-device]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.device === device));
    b.tabIndex = b.dataset.device === device ? 0 : -1;
  });
}
function canvas() {
  const scroll = $('#stage').scrollTop;
  observer?.disconnect();
  frame.addEventListener(
    'load',
    () => {
      const doc = frame.contentDocument!;
      observer = new ResizeObserver(sizeCanvas);
      observer.observe(doc.body);
      bindCanvas(doc);
      markSelection();
      sizeCanvas();
      $('#stage').scrollTop = scroll;
    },
    { once: true },
  );
  frame.srcdoc = canvasHtml(project, device, preview);
}
function patchNode(id: string) {
  const old = frame.contentDocument?.getElementById(id);
  if (!old) return;
  const temp = frame.contentDocument!.createElement('div');
  temp.innerHTML = nodeHtml(project, id, device, preview);
  old.replaceWith(temp.firstElementChild!);
  markSelection();
  sizeCanvas();
}
function addFromLibrary(
  type: string,
  kind: string,
  parentId?: string,
  index?: number,
) {
  if (!mutable()) return;
  const n = parentId ? project.nodes[parentId] : current();
  const position = $<HTMLSelectElement>('#insert-position')?.value || 'after';
  if (kind === 'layouts') {
    let target = n;
    if (!target || target.kind === 'page') {
      const bundle = sectionBundle('blank');
      run(
        { type: 'add', parent: project.root, bundle },
        'Added a blank section',
      );
      selected = bundle.nodes[bundle.root]!.children[0]!;
      target = current();
    } else if (target.kind === 'element')
      target = target.parent ? project.nodes[target.parent] : undefined;
    if (!target) return;
    pendingLayout = { type: 'apply-layout', id: target.id, layout: type };
    const proposed = execute(project, pendingLayout);
    openDialog(
      'Apply layout',
      `<p>All ${descendants(project, target.id).length - 1} nested items are preserved. Review the structure before applying.</p><div class="layout-preview">${e(layouts.find((l) => l[0] === type)?.[1])}<small>${proposed.nodes[target.id]!.layout.columns} column(s), ${proposed.nodes[target.id]!.children.length} direct items</small></div><iframe class="template-preview" title="Proposed layout preview" sandbox="allow-same-origin" srcdoc="${e(canvasHtml({ ...proposed, root: target.id }, device, true))}"></iframe>${btn('apply-layout', 'Apply layout', false, 'primary')}${btn('close-dialog', 'Cancel')}`,
    );
    return;
  }
  const bundle =
    kind === 'sections' ? sectionBundle(type) : elementBundle(type);
  let parent = parentId || project.root;
  let insertion = index;
  if (!parentId && kind === 'sections' && n) {
    const section = path(n.id).find((p) => p.kind === 'section');
    if (section)
      insertion =
        project.nodes[project.root]!.children.indexOf(section.id) +
        (position === 'before' ? 0 : 1);
  }
  if (kind === 'elements' && !parentId) {
    if (n && position === 'inside' && compatible(n, bundle.nodes[bundle.root]!))
      parent = n.id;
    else if (n && ['container', 'section'].includes(n.kind))
      parent =
        n.kind === 'section' &&
        n.children.length === 1 &&
        project.nodes[n.children[0]!]!.kind === 'container'
          ? n.children[0]!
          : n.id;
    else if (
      n?.parent &&
      compatible(project.nodes[n.parent]!, bundle.nodes[bundle.root]!)
    ) {
      parent = n.parent;
      insertion =
        project.nodes[parent]!.children.indexOf(n.id) +
        (position === 'before' ? 0 : 1);
    } else {
      const section = sectionBundle('blank');
      const container = section.nodes[section.root]!.children[0]!;
      const b = bundle.nodes[bundle.root]!;
      b.parent = container;
      section.nodes[container]!.children.push(b.id);
      Object.assign(section.nodes, bundle.nodes);
      run(
        { type: 'add', parent: project.root, bundle: section },
        'Added a section for your element',
      );
      select(b.id);
      recent = [`${kind}:${type}`, ...recent].slice(0, 12);
      return;
    }
  }
  run(
    { type: 'add', parent, bundle, index: insertion },
    `Added ${bundle.nodes[bundle.root]!.name}`,
  );
  if (project.nodes[bundle.root]) select(bundle.root);
  recent = [`${kind}:${type}`, ...recent].slice(0, 12);
  if (mobile()) setSheet('');
}
function move(direction: number) {
  const n = current();
  if (!n?.parent) return;
  const parent = project.nodes[n.parent]!;
  const index = parent.children.indexOf(n.id);
  if (index + direction < 0 || index + direction >= parent.children.length)
    return;
  run(
    { type: 'move', id: n.id, parent: parent.id, index: index + direction },
    `${n.name} moved ${direction < 0 ? 'up' : 'down'}`,
  );
}
function openDialog(title: string, content: string) {
  dialogTrigger = document.activeElement as HTMLElement;
  modal.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2>${btn('close-dialog', 'Close')}</div>${content}`;
  if (!modal.open) modal.showModal();
}
function showConflict() {
  if (!conflict) return;
  openDialog(
    'Another tab saved a newer version',
    `<p>Your tab began at revision ${revision}. The saved copy is now revision ${conflict.revision}. Choose an entire version; this does not merge individual fields.</p><div class="version-comparison"><section><h3>Your working copy</h3><p>${e(project.nodes[project.root]!.name)}</p><small>${project.nodes[project.root]!.children.length} sections · ${Object.keys(project.nodes).length} items</small><pre>${e(summary(project))}</pre></section><section><h3>Saved revision ${conflict.revision}</h3><p>${e(conflict.project.nodes[conflict.project.root]!.name)}</p><small>${conflict.project.nodes[conflict.project.root]!.children.length} sections · ${Object.keys(conflict.project.nodes).length} items</small><pre>${e(summary(conflict.project))}</pre></section></div><p class="helper">Download your copy before replacing it. A new remote save during review will produce another conflict.</p>${btn('download', 'Download my copy')}${btn('keep-local', 'Save my version', false, 'primary')}${btn('use-saved', 'Use saved version')}`,
  );
}
function summary(p: Project) {
  return Object.values(p.nodes)
    .filter((n) => n.kind === 'element')
    .slice(0, 12)
    .map(
      (n) =>
        `${n.name}: ${Object.values(n.content)
          .filter((v) => typeof v === 'string')
          .join(' · ')
          .slice(0, 140)}`,
    )
    .join('\n');
}
function closeDialog() {
  modal.close();
  dialogTrigger?.focus();
}
function chooseTemplate() {
  openDialog(
    'A starting point for your next campaign',
    `<p>Start blank or choose an editable composition. Applying a starter replaces this local review draft and can be undone.</p><div class="starter-grid">${[
      ['blank', 'Start blank', 'Only a page. Everything else is up to you.'],
      [
        'event',
        'Open studio',
        'An invitation, event details and RSVP form UI.',
      ],
      [
        'launch',
        'Product launch',
        'Benefits, price, proof and frequently asked questions.',
      ],
    ]
      .map(
        ([kind, title, desc]) =>
          `<button data-template-preview="${kind}"><div class="phone-mini ${kind}"><i></i><i></i><i></i></div><strong>${title}</strong><small>${desc}</small><span>Preview →</span></button>`,
      )
      .join('')}</div>`,
  );
}
function reviewTools() {
  openDialog(
    'Review tools · not campaign features',
    `<p>This prototype saves one review draft in this browser’s IndexedDB. No account, production data, upload or API is connected.</p><div class="review-controls">${btn('new', 'Start a new campaign', !mutable())}${btn('redo', 'Redo last change', !mutable() || !history.future.length)}${btn('pause', paused ? 'Resume autosave' : 'Pause autosave')}${btn('fail', 'Fail next save')}${btn('offline', offline ? 'Reconnect simulation' : 'Simulate offline')}${btn('viewer', mutable() ? 'Switch to Viewer review' : 'Switch to Editor review')}${btn('download', 'Download working copy')}</div><h3>Exact conflict test</h3><ol><li>Open this URL in a second tab after Saved appears.</li><li>In tab B, pause autosave here. Edit a heading.</li><li>In tab A, edit the same heading and wait for Saved.</li><li>In tab B, choose Save now. The stale revision must be rejected.</li><li>While B’s conflict is open, save one more edit in A. Then choose Save my version in B. It must conflict again.</li></ol><p class="helper">${audit.length} commands in this tab’s review log. Viewer is a UI simulation; real production permissions remain server-enforced.</p>`,
  );
}
async function action(name: string) {
  const n = current();
  if (name === 'close-dialog') closeDialog();
  else if (name === 'rename') {
    if (!mutable()) return;
    openDialog(
      'Rename campaign',
      `<label class="field"><span>Campaign name</span><input id="new-name" value="${e(project.nodes[project.root]!.name)}" maxlength="160"></label>${btn('confirm-rename', 'Save name', false, 'primary')}`,
    );
  } else if (name === 'confirm-rename') {
    const value = $<HTMLInputElement>('#new-name').value.trim();
    if (!value) {
      toast('Enter a campaign name.');
      return;
    }
    run({ type: 'name', id: project.root, value });
    closeDialog();
    await save();
    if (state === 'saved' && !conflict) toast('Campaign name saved');
  } else if (name === 'preview') {
    if (!preview) {
      selectionBeforePreview = selected;
      scrollBeforePreview = $('#stage').scrollTop;
    }
    preview = !preview;
    document.body.classList.toggle('preview-mode', preview);
    $('#preview-toggle').textContent = preview ? 'Back to editor' : 'Preview';
    if (!preview) {
      selected = selectionBeforePreview;
      $('#stage').scrollTop = scrollBeforePreview;
    }
    setSheet('');
    canvas();
    status();
  } else if (name === 'save') {
    if (conflict) showConflict();
    else if (errors(project).length)
      openDialog(
        'Review before saving',
        `<p>Your input is retained. Fix these items to save the draft.</p>${errors(
          project,
        )
          .map(
            (error) =>
              `<button class="issue-link" data-issue="${error.id}"><strong>${e(project.nodes[error.id]!.name)}</strong> — ${e(error.message)}</button>`,
          )
          .join('')}`,
      );
    else await save();
  } else if (name === 'undo' || name === 'redo') {
    if (!mutable() || preview) return;
    project = history[name](project);
    grouping = '';
    if (selected && !project.nodes[selected]) selected = project.root;
    panels();
    canvas();
    schedule();
    toast(name === 'undo' ? 'Change undone' : 'Change restored');
  } else if (name === 'review') reviewTools();
  else if (name === 'new') chooseTemplate();
  else if (name === 'pause') {
    paused = !paused;
    clearTimeout(saveTimer);
    closeDialog();
    if (!paused) schedule();
    status();
  } else if (name === 'fail') {
    failNext = true;
    closeDialog();
    toast('The next save will fail once. Make an edit, then retry.');
  } else if (name === 'offline') {
    offline = !offline;
    closeDialog();
    if (!offline) schedule();
    status();
  } else if (name === 'viewer') {
    role = mutable() ? 'viewer' : 'editor';
    closeDialog();
    panels();
    canvas();
  } else if (name === 'download') {
    const blob = new Blob(
      [JSON.stringify({ project, revision, audit }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cometrow-p0-recovery.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (name === 'keep-local' && conflict) {
    const expected = conflict.revision;
    closeDialog();
    await save(expected);
  } else if (name === 'use-saved' && conflict) {
    history.push(project);
    project = structuredClone(conflict.project);
    revision = conflict.revision;
    acknowledged = JSON.stringify(project);
    conflict = undefined;
    state = 'saved';
    selected = project.root;
    closeDialog();
    panels();
    canvas();
    backup();
    toast('Saved version loaded. Your previous copy is available with Undo.');
  } else if (name === 'close-sheet') setSheet('');
  else if (name === 'toggle-left') {
    if (mobile()) setSheet(left);
    else {
      document.body.classList.toggle('left-collapsed');
      sizeCanvas();
    }
  } else if (name === 'toggle-right' || name === 'properties') {
    if (mobile()) setSheet('properties');
    else {
      if (name === 'toggle-right')
        document.body.classList.toggle('right-collapsed');
      else document.body.classList.remove('right-collapsed');
      sizeCanvas();
    }
  } else if (name === 'select-page') {
    select(project.root);
    tab = 'style';
    inspector();
    if (mobile()) setSheet('properties');
  } else if (name === 'assets') {
    left = 'assets';
    renderLeft();
    if (mobile()) setSheet('assets');
  } else if (name === 'add-section' || name === 'add-element') {
    left = 'add';
    libraryMode = name === 'add-section' ? 'sections' : 'elements';
    query = '';
    category = 'All';
    panels();
    if (mobile()) setSheet('add');
  } else if (name === 'clear-search') {
    query = '';
    category = 'All';
    renderLeft();
  } else if (name === 'apply-layout' && pendingLayout) {
    run(pendingLayout, 'Layout applied. All content preserved.');
    pendingLayout = undefined;
    closeDialog();
  } else if (name === 'add-field' && n?.type === 'form')
    addFromLibrary('field', 'elements', n.id);
  else if (name === 'up') move(-1);
  else if (name === 'down') move(1);
  else if (n && ['duplicate', 'visibility', 'delete'].includes(name))
    run(
      { type: name as 'duplicate' | 'visibility' | 'delete', id: n.id },
      name === 'delete'
        ? 'Item deleted. Use Undo to restore it.'
        : name === 'duplicate'
          ? 'Item duplicated with independent content.'
          : n.visible
            ? 'Item hidden from preview.'
            : 'Item shown.',
    );
  else if (name === 'reset-override' && n && device !== 'desktop')
    run({ type: 'reset', id: n.id, device }, 'Device override reset');
  else if (name === 'reset-style' && n)
    run({ type: 'reset', id: n.id }, 'Style reset to theme');
  else if (n && ['bold', 'italic'].includes(name)) {
    run(
      {
        type: 'style',
        id: n.id,
        patch:
          name === 'bold'
            ? { weight: n.style.weight >= 600 ? 400 : 700 }
            : { italic: !n.style.italic },
      },
      undefined,
      '',
      false,
    );
    const selectedEl = frame.contentDocument?.getElementById(n.id);
    if (selectedEl) {
      selectedEl.style.fontWeight = String(project.nodes[n.id]!.style.weight);
      selectedEl.style.fontStyle = project.nodes[n.id]!.style.italic
        ? 'italic'
        : 'normal';
    }
  } else if (name === 'text-done') endText();
}
function updateField(
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  const n = current();
  if (!n || !mutable()) return;
  const group = input.dataset.group!;
  const key = input.dataset.key!;
  const value =
    input instanceof HTMLInputElement && input.type === 'checkbox'
      ? input.checked
      : (input instanceof HTMLInputElement && input.type === 'number') ||
          (group === 'style' && key === 'weight')
        ? Number(input.value)
        : input.value;
  let command: Command;
  if (group === 'content')
    command = {
      type: 'content',
      id: n.id,
      patch:
        key === 'decorative' && value
          ? { decorative: true, alt: '' }
          : { [key]: value },
    };
  else if (group === 'name')
    command = { type: 'name', id: n.id, value: String(value) };
  else if (group === 'theme')
    command = { type: 'theme', patch: { [key]: value } };
  else if (group === 'action')
    command = {
      type: 'action',
      id: n.id,
      action: {
        ...n.action,
        [key]: value,
        ...(key === 'kind' ? { value: '', newTab: false } : {}),
      } as Action,
    };
  else
    command = {
      type: group as 'style',
      id: n.id,
      patch: { [key]: value } as Partial<Style> & Partial<Layout>,
      ...(override && device !== 'desktop' ? { device } : {}),
    };
  run(command, undefined, `${n.id}:${group}:${key}`, false);
  validation();
  if (group === 'theme') canvas();
  else patchNode(n.id);
  if (group === 'layout' || group === 'style') {
    const badge = document.querySelector('.responsive-control');
    if (badge) badge.outerHTML = responsiveControl(current()!);
  }
  if (
    (group === 'action' && key === 'kind') ||
    key === 'decorative' ||
    key === 'display'
  )
    inspector();
}
document.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'search') {
    query = target.value;
    $('#library-results').innerHTML = libraryResults();
  } else if (target.dataset.group && !composing) updateField(target);
});
document.addEventListener('change', (event) => {
  const input = event.target as HTMLSelectElement;
  if (input.id === 'category') {
    category = input.value;
    $('#library-results').innerHTML = libraryResults();
  }
  if (input.id === 'zoom') {
    zoom = input.value;
    sizeCanvas();
  }
  if (input.id === 'override') {
    override = (input as unknown as HTMLInputElement).checked;
    inspector();
  }
  if (input.id === 'move-parent' && input.value && selected)
    run(
      {
        type: 'move',
        id: selected,
        parent: input.value,
        index: project.nodes[input.value]!.children.length,
      },
      'Moved to selected container',
    );
});
document.addEventListener('focusout', (event) => {
  if ((event.target as HTMLElement).matches('input,textarea')) {
    grouping = '';
  }
});
document.addEventListener('compositionstart', () => {
  composing = true;
  clearTimeout(saveTimer);
});
document.addEventListener('compositionend', (event) => {
  composing = false;
  const target = event.target as HTMLInputElement;
  if (target.dataset.group) updateField(target);
});
document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>(
    'button,[data-select]',
  );
  if (!target || (target as HTMLButtonElement).disabled || suppressClick)
    return;
  if (target.dataset.action) void action(target.dataset.action);
  if (target.dataset.left) {
    left = target.dataset.left;
    panels();
  }
  if (target.dataset.mode) {
    libraryMode = target.dataset.mode;
    query = '';
    category = 'All';
    renderLeft();
  }
  if (target.dataset.tab) {
    tab = target.dataset.tab;
    inspector();
  }
  if (target.dataset.select) select(target.dataset.select);
  if (target.dataset.issue) {
    closeDialog();
    select(target.dataset.issue, true);
    if (actionError(current()!.action, project)) {
      tab = 'action';
      inspector();
    }
  }
  if (target.dataset.expand) {
    if (collapsed.has(target.dataset.expand))
      collapsed.delete(target.dataset.expand);
    else collapsed.add(target.dataset.expand);
    renderLeft();
  }
  if ('panel' in target.dataset) setSheet(target.dataset.panel!);
  if (target.dataset.device) {
    device = target.dataset.device as Device;
    override = false;
    inspector();
    canvas();
  }
  if (target.dataset.library)
    addFromLibrary(target.dataset.library, target.dataset.libraryKind!);
  if (target.dataset.asset && current()?.type === 'image') {
    const asset = assets.find((a) => a.id === target.dataset.asset)!;
    run(
      {
        type: 'content',
        id: selected!,
        patch: {
          asset: asset.id,
          alt: current()!.content.decorative ? '' : asset.alt,
        },
      },
      'Selected image replaced. Other images are unchanged.',
    );
  }
  if (target.dataset.templatePreview) {
    const kind = target.dataset.templatePreview as 'blank' | 'event' | 'launch';
    openDialog(
      kind === 'blank'
        ? 'Start with a blank page'
        : kind === 'event'
          ? 'Open studio · event'
          : 'A considered product launch',
      `<iframe class="template-preview" title="Template phone preview" sandbox="allow-same-origin" srcdoc="${e(canvasHtml(template(kind), 'phone', true))}"></iframe><p>This replaces your current local draft. Undo restores it.</p><button class="primary" data-use-template="${kind}">Use ${kind === 'blank' ? 'blank page' : 'this template'}</button>${btn('new', 'Back to starters')}`,
    );
  }
  if (target.dataset.useTemplate) {
    run(
      {
        type: 'replace',
        document: template(
          target.dataset.useTemplate as 'blank' | 'event' | 'launch',
        ),
      },
      'New campaign ready. Undo restores the previous draft.',
    );
    selected = project.root;
    closeDialog();
    panels();
    canvas();
  }
});
function endText() {
  frame.contentDocument
    ?.querySelectorAll<HTMLElement>('[contenteditable]')
    .forEach((el) => {
      el.removeAttribute('contenteditable');
      el.blur();
    });
  $('#inline-tools').hidden = true;
  grouping = '';
  composing = false;
  schedule();
}
function beginText(el: HTMLElement) {
  if (!mutable() || preview) return;
  const nodeEl = el.closest<HTMLElement>('[data-node]');
  if (!nodeEl || !el.dataset.content) return;
  const n = project.nodes[nodeEl.dataset.node!]!;
  if (typeof n.content[el.dataset.content] !== 'string') return;
  select(n.id);
  el.contentEditable = 'plaintext-only';
  el.focus();
  $('#inline-tools').hidden = false;
  $('#inline-tools').title = 'Formatting applies to this entire text element';
}
function bindCanvas(doc: Document) {
  // The host stage owns scrolling. Avoid a fractional-pixel iframe scrollbar
  // reducing the actual responsive width below the labelled device width.
  doc.documentElement.style.overflow = 'hidden';
  if (!mutable())
    doc
      .querySelectorAll<HTMLButtonElement>('[data-drag],[data-add-here]')
      .forEach((button) => (button.disabled = true));
  doc.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      return;
    }
    const el = event.target as HTMLElement;
    const copy = el.closest<HTMLElement>('[data-copy]');
    if (preview && copy) {
      event.preventDefault();
      navigator.clipboard
        .writeText(copy.dataset.copy!)
        .then(() => {
          copy.textContent = copy.dataset.copied!;
          toast(copy.dataset.copied!);
        })
        .catch(() =>
          toast(
            'Clipboard access was unavailable. Select and copy the visible code.',
          ),
        );
      return;
    }
    if (preview) return;
    if (el.closest('a')) event.preventDefault();
    const add = el.closest<HTMLElement>('[data-add-here]');
    if (add) {
      select(add.dataset.addHere!);
      void action(
        project.nodes[add.dataset.addHere!]!.kind === 'page'
          ? 'add-section'
          : 'add-element',
      );
      return;
    }
    if (el.isContentEditable) return;
    const item = el.closest<HTMLElement>('[data-node]');
    if (item) select(item.dataset.node!);
    else select(null);
  });
  doc.addEventListener('dblclick', (event) => {
    const el = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-content]',
    );
    if (el) {
      event.preventDefault();
      beginText(el);
    }
  });
  doc.addEventListener('input', (event) => {
    const el = event.target as HTMLElement;
    if (composing || !el.isContentEditable) return;
    const id = el.closest<HTMLElement>('[data-node]')!.dataset.node!;
    run(
      { type: 'content', id, patch: { [el.dataset.content!]: el.innerText } },
      undefined,
      `inline:${id}:${el.dataset.content}`,
      false,
    );
    const inspectorInput = document.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(`[data-group="content"][data-key="${el.dataset.content}"]`);
    if (inspectorInput) inspectorInput.value = el.innerText;
    validation();
  });
  doc.addEventListener('compositionstart', () => {
    composing = true;
    clearTimeout(saveTimer);
  });
  doc.addEventListener('compositionend', (event) => {
    composing = false;
    (event.target as HTMLElement).dispatchEvent(
      new Event('input', { bubbles: true }),
    );
  });
  doc.addEventListener('focusout', (event) => {
    const el = event.target as HTMLElement;
    if (el.isContentEditable && !composing) {
      el.removeAttribute('contenteditable');
      $('#inline-tools').hidden = true;
      grouping = '';
    }
  });
  doc.addEventListener('keydown', keyboard);
  bindDrag(doc, true);
}
function keyboard(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  const editing =
    target.isContentEditable || target.matches('input,textarea,select');
  if (event.key === 'Escape') {
    if (modal.open) return;
    if (target.isContentEditable) {
      event.preventDefault();
      endText();
      return;
    }
    if (sheet) {
      setSheet('');
      return;
    }
    if (preview) {
      void action('preview');
      return;
    }
    event.preventDefault();
    select(current()?.parent || null);
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    void save();
  }
  if (
    !editing &&
    (event.ctrlKey || event.metaKey) &&
    ['z', 'y'].includes(event.key.toLowerCase())
  ) {
    event.preventDefault();
    void action(
      event.shiftKey || event.key.toLowerCase() === 'y' ? 'redo' : 'undo',
    );
  }
  if (
    !editing &&
    event.altKey &&
    ['ArrowUp', 'ArrowDown'].includes(event.key)
  ) {
    event.preventDefault();
    move(event.key === 'ArrowUp' ? -1 : 1);
  }
  if (
    !editing &&
    event.key === 'Enter' &&
    target.ownerDocument === frame.contentDocument &&
    !preview
  ) {
    const item = target.closest<HTMLElement>('[data-node]');
    if (item) {
      select(item.dataset.node!);
      const text = item.querySelector<HTMLElement>(
        ':scope > .node-content [data-content]',
      );
      if (text) {
        event.preventDefault();
        beginText(text);
      }
    }
  }
  if (
    !editing &&
    ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
  ) {
    const toolbar = target.closest('[role=toolbar],[role=tablist]');
    if (toolbar) {
      const buttons = [
        ...toolbar.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
      ];
      const index = buttons.indexOf(target as HTMLButtonElement);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? buttons.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) %
              buttons.length;
      event.preventDefault();
      buttons[next]?.focus();
      buttons[next]?.click();
    }
  }
  if (event.key === 'Tab' && sheet && mobile() && !modal.open) {
    const panel = sheet === 'properties' ? $('.right-panel') : $('.left-panel');
    const targets = [
      ...panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary',
      ),
      $('.sheet-close'),
      ...document.querySelectorAll<HTMLElement>('.mobile-nav button'),
    ].filter((el) => el.getClientRects().length);
    const index = targets.indexOf(target);
    if (
      (event.shiftKey && index <= 0) ||
      (!event.shiftKey && index === targets.length - 1)
    ) {
      event.preventDefault();
      targets[event.shiftKey ? targets.length - 1 : 0]?.focus();
    }
  }
}
document.addEventListener('keydown', keyboard);
$('#sheet-backdrop').addEventListener('click', () => setSheet(''));
$('#stage').addEventListener('click', (event) => {
  if (event.target === $('#stage') || event.target === $('#frame-space'))
    select(null);
});
window.addEventListener('resize', () => {
  if (!mobile() && sheet) setSheet('');
  sizeCanvas();
});
window.addEventListener('online', schedule);
window.addEventListener('offline', status);
window.addEventListener('beforeunload', (event) => {
  if (dirty()) {
    event.preventDefault();
    event.returnValue = '';
  }
});

// Pointer drag works across the host and sandboxed same-origin canvas. Every
// drop uses the same validated command as the explicit keyboard move controls.
type Drag = {
  id?: string;
  type?: string;
  kind?: string;
  x: number;
  y: number;
  active: boolean;
  target?: { parent: string; index: number };
  ghost?: HTMLElement;
};
let drag: Drag | undefined;
let suppressClick = false;
let dragScroll: ReturnType<typeof setInterval> | undefined;
function bindDrag(doc: Document, inFrame: boolean) {
  doc.addEventListener('pointerdown', (event) => {
    if (!mutable() || preview || event.button !== 0) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-drag],[data-library]',
    );
    if (!target || target.dataset.libraryKind === 'layouts') return;
    const rect = frame.getBoundingClientRect();
    drag = {
      id: target.dataset.drag,
      type: target.dataset.library,
      kind: target.dataset.libraryKind,
      x: inFrame ? rect.left + event.clientX * scale : event.clientX,
      y: inFrame ? rect.top + event.clientY * scale : event.clientY,
      active: false,
    };
    target.setPointerCapture(event.pointerId);
  });
  doc.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = frame.getBoundingClientRect();
    const x = inFrame ? rect.left + event.clientX * scale : event.clientX;
    const y = inFrame ? rect.top + event.clientY * scale : event.clientY;
    if (!drag.active && Math.hypot(x - drag.x, y - drag.y) < 8) return;
    if (!drag.active) {
      drag.active = true;
      const ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.textContent = drag.id ? project.nodes[drag.id]!.name : drag.type!;
      document.body.append(ghost);
      drag.ghost = ghost;
    }
    event.preventDefault();
    drag.ghost!.style.left = `${x + 12}px`;
    drag.ghost!.style.top = `${y + 12}px`;
    updateDrop(x, y);
    clearInterval(dragScroll);
    const stage = $('#stage').getBoundingClientRect();
    const delta = y < stage.top + 70 ? -14 : y > stage.bottom - 70 ? 14 : 0;
    if (delta)
      dragScroll = setInterval(() => {
        $('#stage').scrollTop += delta;
        updateDrop(x, y);
      }, 30);
  });
  doc.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag;
    clearInterval(dragScroll);
    drag = undefined;
    d.ghost?.remove();
    clearDrop();
    if (!d.active) return;
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 80);
    if (!d.target) {
      toast(
        'Drop cancelled. Choose a compatible container or section position.',
      );
      return;
    }
    if (d.id) {
      const parent = project.nodes[d.target.parent]!;
      let index = d.target.index;
      if (
        project.nodes[d.id]!.parent === parent.id &&
        parent.children.indexOf(d.id) < index
      )
        index--;
      run({ type: 'move', id: d.id, parent: parent.id, index }, 'Item moved');
    } else addFromLibrary(d.type!, d.kind!, d.target.parent, d.target.index);
  });
  doc.addEventListener('pointercancel', () => {
    clearInterval(dragScroll);
    drag?.ghost?.remove();
    drag = undefined;
    clearDrop();
  });
}
function clearDrop() {
  document
    .querySelectorAll('.drop-before,.drop-inside')
    .forEach((el) => el.classList.remove('drop-before', 'drop-inside'));
  frame.contentDocument
    ?.querySelectorAll('.drop-before,.drop-inside')
    .forEach((el) => el.classList.remove('drop-before', 'drop-inside'));
}
function updateDrop(x: number, y: number) {
  if (!drag) return;
  clearDrop();
  drag.target = undefined;
  const rect = frame.getBoundingClientRect();
  const onCanvas =
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  const el = onCanvas
    ? frame.contentDocument
        ?.elementFromPoint((x - rect.left) / scale, (y - rect.top) / scale)
        ?.closest<HTMLElement>('[data-node]')
    : document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-node]');
  if (!el) return;
  let id = el.dataset.node || el.dataset.dropNode!;
  const source = drag.id
    ? project.nodes[drag.id]!
    : drag.kind === 'sections'
      ? sectionBundle(drag.type!)
      : elementBundle(drag.type!);
  const child = 'root' in source ? source.nodes[source.root]! : source;
  if (child.kind === 'section')
    id = path(id).find((n) => n.kind === 'section')?.id || project.root;
  const target = project.nodes[id]!;
  const b = el.getBoundingClientRect();
  const localY = onCanvas ? (y - rect.top) / scale : y;
  const middle =
    localY > b.top + b.height * 0.25 && localY < b.bottom - b.height * 0.25;
  let parent = target;
  let index = target.children.length;
  if (!compatible(target, child) || !middle) {
    if (!target.parent) return;
    parent = project.nodes[target.parent]!;
    index =
      parent.children.indexOf(target.id) +
      (localY > b.top + b.height / 2 ? 1 : 0);
  }
  if (
    !compatible(parent, child) ||
    (drag.id && descendants(project, drag.id).includes(parent.id))
  ) {
    if (drag.ghost) drag.ghost.textContent = 'Choose a compatible container';
    return;
  }
  drag.target = { parent: parent.id, index };
  el.classList.add(parent.id === target.id ? 'drop-inside' : 'drop-before');
  if (drag.ghost) drag.ghost.textContent = `Move to ${parent.name}`;
}
bindDrag(document, false);

async function start() {
  try {
    const saved = await storage.read();
    if (saved) {
      assertStructure(saved.project);
      project = saved.project;
      revision = saved.revision;
      acknowledged = JSON.stringify(project);
    } else {
      const initial = await storage.save(project, 0);
      project = initial.saved.project;
      revision = initial.saved.revision;
      acknowledged = JSON.stringify(project);
    }
    const recovery = sessionStorage.getItem('cometrow:p0-recovery');
    if (recovery) {
      const savedRecovery = JSON.parse(recovery) as {
        project: Project;
        revision: number;
        acknowledged: string;
      };
      assertStructure(savedRecovery.project);
      if (
        JSON.stringify(savedRecovery.project) !== savedRecovery.acknowledged
      ) {
        project = savedRecovery.project;
        revision = savedRecovery.revision;
        acknowledged = savedRecovery.acknowledged;
        paused = true;
        toast(
          'Recovered unsaved edits from this tab. Review them, then Save now.',
        );
      }
    }
  } catch {
    state = 'error';
    paused = true;
    toast(
      'Local storage could not be opened. Download a copy to keep your work.',
    );
  }
  selected = project.root;
  for (const id of project.nodes[project.root]!.children)
    if (project.nodes[id]!.type !== 'hero') collapsed.add(id);
  panels();
  canvas();
}
void start();
