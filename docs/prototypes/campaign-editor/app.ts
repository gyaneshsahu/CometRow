import {
  blockLibrary,
  definition,
  blockTitle,
  type Field,
} from '../../../src/composer/library.js';
import {
  documentSchema,
  type BlockType,
} from '../../../src/composer/schema.js';
import { escape as e } from '../../../src/composer/render.js';
import {
  History,
  defaultAppearance,
  label,
  moveBlock,
  sampleBlock,
  starter,
  type Appearance,
  type Project,
} from './model.js';
import { icon, thumbnail, art, canvasHtml } from './visuals.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
const storageKey = 'cometrow:visual-editor-review:v1';
type Saved = { project: Project; revision: number };
let project = starter('studio', 'Fieldnotes · Open studio');
let revision = 1;
let acknowledged = JSON.stringify(project);
let storageError = false;
try {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    const saved = JSON.parse(raw) as Saved;
    documentSchema.parse(saved.project.document);
    if (!saved.project.appearance || typeof saved.project.name !== 'string')
      throw new Error('Invalid review copy');
    project = saved.project;
    revision = saved.revision;
    acknowledged = JSON.stringify(project);
  } else
    localStorage.setItem(storageKey, JSON.stringify({ project, revision }));
} catch {
  storageError = true;
}
const history = new History();
let selected: string | null =
  project.document.blocks.find((b) => b.type === 'hero')?.id || null;
let leftTab: 'add' | 'layers' | 'media' = 'layers';
let inspectorTab: 'content' | 'layout' | 'style' = 'content';
let mobilePanel = 'canvas';
let viewport: 'phone' | 'tablet' | 'desktop' =
  window.innerWidth < 1000 ? 'phone' : 'desktop';
let zoom: 'fit' | number = 'fit';
let scale = 1;
let preview = false;
let query = '';
let group = 'All';
let beforeId: string | null | undefined;
let timer: ReturnType<typeof setTimeout>;
let toastTimer: ReturnType<typeof setTimeout>;
let busy = false;
let changedWhileBusy = false;
let conflict: Saved | undefined;
let saveState = storageError ? 'error' : 'saved';
let simulateFailure = false;
let inlineStarted = false;
let readOnly = false;
let canvasObserver: ResizeObserver | undefined;
let dialogTrigger: HTMLElement | null = null;

const button = (action: string, name: string, glyph: string, extra = '') =>
  `<button data-action="${action}" aria-label="${e(name)}" title="${e(name)}" ${extra}>${icon(glyph)}</button>`;
app.innerHTML = `<a href="#stage" class="skip">Skip to campaign canvas</a>
<header class="topbar"><a href="http://127.0.0.1:3000/app" class="back-button" aria-label="Return to campaign overview (existing application)" title="Return to existing application">${icon('back')}</a><div class="wordmark" aria-label="CometRow"><span>↗</span></div><div class="title-group"><input id="campaign-name" aria-label="Campaign name" maxlength="160" value="${e(project.name)}"><button class="save-indicator" id="save-status" data-action="save" title="Saved only in this prototype browser"></button></div><div class="history-controls">${button('undo', 'Undo (Ctrl+Z)', 'undo', 'id="undo"')}${button('redo', 'Redo (Ctrl+Shift+Z)', 'redo', 'id="redo"')}</div><div class="top-actions"><button class="preview-button" data-action="preview">${icon('eye')}<span>Preview</span></button><span tabindex="0" title="Publishing comes in a later phase"><button class="publish" disabled>Publish</button></span></div></header>
<div class="review-strip"><span><i></i> INTERACTION PROTOTYPE <span class="strip-detail">· Local review copy</span></span><button data-action="new">New campaign</button><button data-action="help">Review guide ${icon('help')}</button></div>
<main class="workspace"><aside class="left-panel" aria-label="Campaign tools"><div class="panel-head"><strong>Campaign</strong>${button('close-panel', 'Close panel', 'close', 'class="sheet-close"')}</div><nav class="library-tabs" aria-label="Campaign tools"><button data-left="add">${icon('plus')}Add</button><button data-left="layers">${icon('layers')}Layers</button><button data-left="media">${icon('image')}Media</button></nav><div id="left-content" class="panel-content"></div><div class="panel-foot">${icon('check')} Responsive by design</div></aside>
<section class="canvas-column" aria-label="Visual workspace"><div class="canvas-toolbar"><div class="viewport-controls" aria-label="Canvas viewport">${(['phone', 'tablet', 'desktop'] as const).map((v) => `<button data-viewport="${v}" aria-label="${v[0]!.toUpperCase() + v.slice(1)} preview" title="${v[0]!.toUpperCase() + v.slice(1)}">${icon(v)}<span>${v[0]!.toUpperCase() + v.slice(1)}</span></button>`).join('')}</div><label class="zoom-control"><span class="sr-only">Canvas zoom</span><select id="zoom"><option value="fit">Fit</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option></select></label></div><div id="save-banner" role="alert" hidden></div><div class="stage-scroll" id="stage" tabindex="-1"><div class="canvas-caption"><span id="canvas-label"></span><span id="canvas-size"></span></div><div class="frame-space"><iframe id="canvas" title="Editable campaign canvas" sandbox="allow-same-origin" scrolling="no"></iframe></div><div class="canvas-bottom">${icon('check')} One campaign. Every screen.</div></div><div class="canvas-statusbar"><span id="selection-label">Click any section to edit</span><span id="revision-label"></span></div></section>
<aside class="right-panel" aria-label="Selected block properties"><div class="panel-head"><div><span class="overline">PROPERTIES</span><h2 id="inspector-title">Hero</h2></div>${button('close-panel', 'Close properties', 'close', 'class="sheet-close"')}</div><div id="inspector-actions" class="inspector-actions"></div><nav class="inspector-tabs" aria-label="Block properties">${['content', 'layout', 'style'].map((t) => `<button data-inspector="${t}">${t[0]!.toUpperCase() + t.slice(1)}</button>`).join('')}</nav><div id="inspector" class="panel-content"></div></aside></main>
<button class="sheet-backdrop" data-action="close-panel" aria-label="Close panel" hidden></button><nav class="mobile-nav" aria-label="Editor panels">${[
  ['canvas', 'canvas', 'Canvas'],
  ['add', 'plus', 'Add'],
  ['layers', 'layers', 'Layers'],
  ['properties', 'settings', 'Properties'],
]
  .map(
    ([id, glyph, text]) =>
      `<button data-mobile="${id}">${icon(glyph!)}<span>${text}</span></button>`,
  )
  .join('')}</nav>
<div id="toast" role="status" hidden></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog><div id="drag-ghost" hidden></div>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  app.querySelector<T>(selector)!;
const frame = $<HTMLIFrameElement>('#canvas');
const modal = $<HTMLDialogElement>('#dialog');
const isMobile = () => window.innerWidth <= 1050;
const selectedBlock = () =>
  project.document.blocks.find((b) => b.id === selected);

function toast(message: string, undo = false) {
  clearTimeout(toastTimer);
  $('#toast').hidden = false;
  $('#toast').innerHTML =
    `${icon('check')}<span>${e(message)}</span>${undo ? '<button data-action="undo">Undo</button>' : ''}`;
  toastTimer = setTimeout(() => {
    $('#toast').hidden = true;
  }, 4500);
}
function updateStatus() {
  $('#save-status').setAttribute('aria-live', 'polite');
  const messages: Record<string, string> = {
    saved: 'Saved locally',
    dirty: 'Save now',
    saving: 'Saving…',
    invalid: 'Check fields',
    error: 'Save failed · Retry',
    conflict: 'Resolve conflict',
  };
  $('#save-status').innerHTML =
    `${icon(saveState === 'saved' ? 'check' : saveState === 'conflict' || saveState === 'error' ? 'help' : 'canvas')}<span>${readOnly ? 'Read-only review' : messages[saveState]}</span>`;
  $('#save-status').dataset.state = saveState;
  $('#save-status').title =
    saveState === 'saved'
      ? 'All changes are saved in this prototype browser. No changes to your real campaigns.'
      : 'Click to save or review the issue';
  $<HTMLButtonElement>('#undo').disabled = readOnly || !history.canUndo;
  $<HTMLButtonElement>('#redo').disabled = readOnly || !history.canRedo;
  $('#revision-label').textContent = `Local revision ${revision}`;
  const issues = documentSchema.safeParse(project.document);
  const nameInvalid = !project.name.trim();
  const message = conflict
    ? 'A newer review copy was saved in another tab. Your changes are protected.'
    : saveState === 'error'
      ? 'Couldn’t save this review copy. Your edits are still in this tab.'
      : !issues.success
        ? issues.error.issues[0]!.message
        : nameInvalid
          ? 'Give your campaign a name before saving.'
          : '';
  $('#save-banner').hidden = !message;
  $('#save-banner').innerHTML =
    `${e(message)}${conflict ? '<button data-action="conflict">Review versions</button>' : saveState === 'error' ? '<button data-action="save">Retry save</button>' : ''}`;
}
function scheduleSave() {
  clearTimeout(timer);
  if (conflict || readOnly) return;
  if (
    !documentSchema.safeParse(project.document).success ||
    !project.name.trim()
  ) {
    saveState = 'invalid';
    updateStatus();
    return;
  }
  if (busy) {
    changedWhileBusy = true;
    return;
  }
  saveState = JSON.stringify(project) === acknowledged ? 'saved' : 'dirty';
  updateStatus();
  if (saveState === 'dirty') timer = setTimeout(save, 800);
}
function save() {
  clearTimeout(timer);
  if (
    readOnly ||
    busy ||
    conflict ||
    !documentSchema.safeParse(project.document).success ||
    !project.name.trim()
  )
    return;
  const snapshot = structuredClone(project);
  if (JSON.stringify(snapshot) === acknowledged) {
    saveState = 'saved';
    updateStatus();
    return;
  }
  busy = true;
  saveState = 'saving';
  updateStatus();
  setTimeout(() => {
    try {
      if (simulateFailure) {
        simulateFailure = false;
        throw new Error('Review failure');
      }
      const existing = localStorage.getItem(storageKey);
      const saved = existing ? (JSON.parse(existing) as Saved) : undefined;
      if (saved && saved.revision !== revision) {
        conflict = saved;
        saveState = 'conflict';
      } else {
        const next = revision + 1;
        localStorage.setItem(
          storageKey,
          JSON.stringify({ project: snapshot, revision: next }),
        );
        revision = next;
        acknowledged = JSON.stringify(snapshot);
        saveState = 'saved';
      }
    } catch {
      saveState = 'error';
    }
    busy = false;
    updateStatus();
    if (
      saveState === 'saved' &&
      (changedWhileBusy || JSON.stringify(project) !== acknowledged)
    ) {
      changedWhileBusy = false;
      scheduleSave();
    }
  }, 350);
}
function mutate(change: (p: Project) => void, message?: string) {
  if (readOnly) return;
  history.push(project);
  change(project);
  render();
  scheduleSave();
  if (message) toast(message, true);
}
function add(type: BlockType, target: string | null | undefined = beforeId) {
  if (project.document.blocks.length >= 20) {
    toast('This campaign already has 20 blocks.');
    return;
  }
  mutate(
    (p) => {
      const block = sampleBlock(type);
      const selectedIndex = p.document.blocks.findIndex(
        (b) => b.id === selected,
      );
      const index =
        target === undefined
          ? selectedIndex < 0
            ? p.document.blocks.length
            : selectedIndex + 1
          : target === null
            ? p.document.blocks.length
            : p.document.blocks.findIndex((b) => b.id === target);
      p.document.blocks.splice(
        index < 0 ? p.document.blocks.length : index,
        0,
        block,
      );
      p.appearance[block.id] = {
        ...defaultAppearance(),
        tone: type === 'cta' ? 'dark' : 'light',
      };
      selected = block.id;
      beforeId = undefined;
      inspectorTab = 'content';
      mobilePanel = 'canvas';
    },
    `${label(type)} added`,
  );
  scrollToSelected();
}
function reorder(id: string, target: string | null) {
  const next = moveBlock(project, id, target);
  if (
    JSON.stringify(next.document.blocks) ===
    JSON.stringify(project.document.blocks)
  )
    return;
  mutate(() => {
    project = next;
    selected = id;
  }, 'Block moved');
  scrollToSelected();
}
function moveSelected(direction: -1 | 1) {
  const index = project.document.blocks.findIndex((b) => b.id === selected);
  if (
    index < 0 ||
    index + direction < 0 ||
    index + direction >= project.document.blocks.length
  )
    return;
  reorder(
    selected!,
    direction === -1
      ? project.document.blocks[index - 1]!.id
      : project.document.blocks[index + 2]?.id || null,
  );
}
function setPanel(panel: string) {
  mobilePanel = panel;
  if (['add', 'layers', 'media'].includes(panel))
    leftTab = panel as typeof leftTab;
  renderPanels();
  if (isMobile() && panel === 'canvas')
    $('.mobile-nav [data-mobile="canvas"]').focus();
  if (isMobile() && panel !== 'canvas')
    requestAnimationFrame(() =>
      (panel === 'properties' ? $('.right-panel') : $('.left-panel'))
        .querySelector<HTMLButtonElement>('button')
        ?.focus(),
    );
}
function select(id: string, properties = false) {
  selected = id;
  frame.contentDocument
    ?.querySelectorAll('.section')
    .forEach((el) =>
      el.classList.toggle('selected', el.getAttribute('data-id') === id),
    );
  if (properties && isMobile()) mobilePanel = 'properties';
  renderPanels();
}
function renderPanels() {
  app.dataset.panel = mobilePanel;
  app.dataset.preview = String(preview);
  $('.sheet-backdrop').hidden =
    !isMobile() || mobilePanel === 'canvas' || preview;
  document
    .querySelectorAll<HTMLButtonElement>('[data-mobile]')
    .forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.mobile === mobilePanel)),
    );
  document
    .querySelectorAll<HTMLButtonElement>('[data-left]')
    .forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.left === leftTab)),
    );
  document
    .querySelectorAll<HTMLButtonElement>('[data-inspector]')
    .forEach((b) =>
      b.setAttribute(
        'aria-pressed',
        String(b.dataset.inspector === inspectorTab),
      ),
    );
  renderLeft();
  renderInspector();
  syncSheetAccess();
  autosizeFields();
  const block = selectedBlock();
  $('#selection-label').textContent = preview
    ? 'Preview · Links are inactive'
    : block
      ? `${label(block.type)} selected · ${isMobile() ? 'Tap text to edit' : 'Click text to edit'}`
      : 'Click a section to edit';
  requestAnimationFrame(sizeCanvas);
}
function syncSheetAccess() {
  const open = isMobile() && mobilePanel !== 'canvas' && !preview;
  for (const selector of ['.canvas-column', '.topbar', '.review-strip'])
    $(selector).inert = open;
}
function autosizeFields() {
  $('#inspector')
    .querySelectorAll<HTMLTextAreaElement>('textarea')
    .forEach((input) => {
      input.style.height = 'auto';
      input.style.height = `${Math.max(70, input.scrollHeight + 2)}px`;
    });
}
function renderLeft() {
  if (leftTab === 'add') {
    $('#left-content').innerHTML =
      `<div class="search-field">${icon('search')}<input id="block-search" type="search" aria-label="Search blocks" placeholder="Find a block…" value="${e(query)}"></div><label class="category-label">Category<select id="block-category">${['All', ...new Set(blockLibrary.map((b) => b.group))].map((c) => `<option ${c === group ? 'selected' : ''}>${c}</option>`).join('')}</select></label><div class="insertion-note">${beforeId ? `Insert before ${e(label(project.document.blocks.find((b) => b.id === beforeId)!.type))}` : 'Click to add. Drag to place.'}</div><div id="library-results">${libraryResults()}</div>`;
  } else if (leftTab === 'layers') {
    $('#left-content').innerHTML =
      `<div class="section-heading"><span>Your sections</span><span>${project.document.blocks.length}/20</span></div><div class="layer-list">${project.document.blocks.map((b, i) => `<div class="layer ${b.id === selected ? 'is-selected' : ''} ${b.enabled ? '' : 'is-hidden'}" data-layer="${b.id}">${button('drag', `Drag ${label(b.type)}`, 'drag', `data-id="${b.id}" class="drag-handle" ${readOnly ? 'disabled' : ''}`)}<button class="layer-select" data-select="${b.id}" aria-pressed="${selected === b.id}"><span class="layer-icon">${icon(b.type === 'hero' || b.type === 'media' ? 'image' : 'type')}</span><span><strong>${e(label(b.type))}</strong><small>${e(blockTitle(b))}</small></span></button>${button('visibility', `${b.enabled ? 'Hide' : 'Show'} ${label(b.type)}`, b.enabled ? 'eye' : 'hidden', `data-id="${b.id}" ${readOnly ? 'disabled' : ''}`)}<span class="sr-only">Position ${i + 1}</span></div>`).join('')}<div data-layer-end class="layer-end">Drop a section here</div></div><button class="wide dashed" data-action="open-library" ${readOnly ? 'disabled' : ''}>${icon('plus')} Add a block</button><p class="muted small">Drag to reorder. Select a block for more controls.</p>`;
  } else
    $('#left-content').innerHTML =
      `<div class="media-note">${icon('image')}<h3>A place for your visuals.</h3><p>Uploads arrive with the media phase. For this review, try our bundled sample artwork.</p><button class="primary wide" data-action="media" ${!selectedBlock() || !['hero', 'media'].includes(selectedBlock()!.type) ? 'disabled' : ''}>Choose sample artwork</button></div><div class="sample-grid">${['orbit', 'arch', 'wave'].map((k) => `<div>${art(k)}<span>${k[0]!.toUpperCase() + k.slice(1)} · Sample</span></div>`).join('')}</div>`;
}
function libraryResults() {
  const entries = blockLibrary.filter(
    (b) =>
      (group === 'All' || b.group === group) &&
      `${label(b.type)} ${b.name} ${b.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return entries.length
    ? entries
        .map(
          (b) =>
            `<button class="library-card" data-add="${b.type}" data-drag-type="${b.type}" ${readOnly ? 'disabled' : ''}>${thumbnail(b.type)}<span><strong>${e(label(b.type))}</strong>${icon('plus')}</span><small>${e(b.description)}</small></button>`,
        )
        .join('')
    : '<div class="search-empty"><h3>No blocks found</h3><p>Try “Hero”, “Story” or “Contact”.</p><button data-action="clear-search">Clear search</button></div>';
}
function fieldMarkup(
  field: Field,
  data: Record<string, unknown>,
  prefix = '',
): string {
  const path = prefix + field.key;
  const value = data[field.key];
  const id = `field-${path.replaceAll('.', '-')}`;
  if (field.fields) {
    const items = (value || []) as Record<string, unknown>[];
    return `<fieldset class="repeater"><legend>${e(field.label)}</legend>${items.map((item, i) => `<details ${i === 0 ? 'open' : ''}><summary>Item ${i + 1}</summary>${field.fields!.map((f) => fieldMarkup(f, item, `${path}.${i}.`)).join('')}<button class="text-button danger" data-remove-item="${path}" data-index="${i}">Remove item</button></details>`).join('')}<button class="wide secondary" data-add-item="${path}" ${items.length >= field.maxItems! ? 'disabled' : ''}>${icon('plus')} Add item</button></fieldset>`;
  }
  const attrs = `id="${id}" data-field="${e(path)}" ${field.max ? `maxlength="${field.max}"` : ''} ${readOnly ? 'disabled' : ''}`;
  const control =
    field.kind === 'select'
      ? `<select ${attrs}>${field.options!.map((v) => `<option value="${v}" ${value === v ? 'selected' : ''}>${v[0]!.toUpperCase() + v.slice(1)}</option>`).join('')}</select>`
      : field.kind === 'checkbox'
        ? `<input type="checkbox" ${attrs} ${value ? 'checked' : ''}>`
        : field.kind === 'textarea' || field.key === 'headline'
          ? `<textarea ${attrs} rows="3">${e(value)}</textarea>`
          : `<input ${attrs} type="${field.kind === 'datetime-local' ? 'datetime-local' : 'text'}" value="${e(value)}">`;
  return `<div class="field ${field.kind === 'checkbox' ? 'check-field' : ''}"><label for="${id}">${e(field.label)}</label>${control}${field.help ? `<small>${e(field.help)}</small>` : ''}</div>`;
}
function renderInspector() {
  const b = selectedBlock();
  $('#inspector-title').textContent = b ? label(b.type) : 'Campaign';
  const index = project.document.blocks.findIndex((v) => v.id === selected);
  $('#inspector-actions').innerHTML = b
    ? `${button('duplicate', 'Duplicate block', 'copy', readOnly ? 'disabled' : '')}${button('visibility', b.enabled ? 'Hide block' : 'Show block', b.enabled ? 'eye' : 'hidden', readOnly ? 'disabled' : '')}${button('up', 'Move block up', 'up', index <= 0 || readOnly ? 'disabled' : '')}${button('down', 'Move block down', 'down', index === project.document.blocks.length - 1 || readOnly ? 'disabled' : '')}${button('delete', 'Delete block', 'trash', readOnly ? 'disabled' : '')}`
    : '';
  if (!b) {
    $('#inspector').innerHTML =
      '<div class="inspector-empty"><h3>Make it yours.</h3><p>Select a section on the canvas to edit its content and appearance.</p></div>';
    return;
  }
  const a = project.appearance[b.id] || defaultAppearance();
  if (inspectorTab === 'content') {
    const fields = definition(b.type).fields;
    const regular = fields.filter((f) => !f.section);
    const advanced = fields.filter((f) => f.section);
    $('#inspector').innerHTML =
      `${b.type === 'hero' ? `<div class="inspector-media">${art(a.art)}<button data-action="media">${icon('image')} Replace sample image</button></div>` : ''}${regular.map((f) => fieldMarkup(f, b.data as Record<string, unknown>)).join('')}${advanced.length ? `<details class="advanced"><summary>Image & accessibility</summary>${advanced.map((f) => fieldMarkup(f, b.data as Record<string, unknown>)).join('')}</details>` : ''}`;
  } else if (inspectorTab === 'layout') {
    $('#inspector').innerHTML =
      `${['hero', 'cta'].includes(b.type) ? `<div class="setting-title">Arrangement</div><div class="layout-options">${(b.type === 'hero' ? ['split', 'stacked', 'centered'] : ['split', 'centered']).map((v) => `<button data-layout="${v}" aria-pressed="${a.layout === v}" ${readOnly ? 'disabled' : ''}><span class="layout-demo ${v}"><i></i><b></b></span><span>${v === 'split' ? 'Side by side' : v[0]!.toUpperCase() + v.slice(1)}</span></button>`).join('')}</div>` : '<p class="muted">This section adapts automatically to each screen.</p>'}<label class="field">Section spacing<select data-appearance="spacing" ${readOnly ? 'disabled' : ''}>${['compact', 'comfortable', 'generous'].map((v) => `<option value="${v}" ${a.spacing === v ? 'selected' : ''}>${v[0]!.toUpperCase() + v.slice(1)}</option>`).join('')}</select></label><div class="inspector-tip">${icon('phone')} Layouts stack naturally on smaller screens.</div>`;
  } else
    $('#inspector').innerHTML =
      `<div class="setting-title">Section background</div><div class="tone-options">${['light', 'soft', 'dark'].map((v) => `<button data-tone="${v}" aria-pressed="${a.tone === v}" ${readOnly ? 'disabled' : ''}><i class="tone-${v}"></i>${v[0]!.toUpperCase() + v.slice(1)}</button>`).join('')}</div><hr><div class="setting-title">Campaign accent <span class="scope-badge">All sections</span></div><div class="swatches">${[
        ['#5743ad', 'Iris'],
        ['#375b45', 'Forest'],
        ['#8c431f', 'Clay'],
        ['#294e79', 'Ocean'],
        ['#34313c', 'Ink'],
      ]
        .map(
          ([c, n]) =>
            `<button data-accent="${c}" style="--swatch:${c}" aria-label="${n} accent" aria-pressed="${project.document.theme.accent === c}" title="${n}" ${readOnly ? 'disabled' : ''}>${project.document.theme.accent === c ? icon('check') : ''}</button>`,
        )
        .join(
          '',
        )}</div><p class="muted small">A single accent keeps your campaign consistent.</p><details class="advanced"><summary>Typography & corners</summary><label class="field">Typography<select data-theme="typography" ${readOnly ? 'disabled' : ''}><option value="modern" ${project.document.theme.typography === 'modern' ? 'selected' : ''}>Modern sans</option><option value="editorial" ${project.document.theme.typography === 'editorial' ? 'selected' : ''}>Editorial serif</option></select></label><label class="field">Corners<select data-theme="corners" ${readOnly ? 'disabled' : ''}><option value="soft" ${project.document.theme.corners === 'soft' ? 'selected' : ''}>Soft</option><option value="square" ${project.document.theme.corners === 'square' ? 'selected' : ''}>Square</option></select></label></details>`;
}
function renderCanvas() {
  canvasObserver?.disconnect();
  frame.srcdoc = canvasHtml(project, selected, preview || readOnly);
}
function sizeCanvas() {
  const width = { phone: 390, tablet: 768, desktop: 1200 }[viewport];
  const available =
    $('#stage').clientWidth - (window.innerWidth < 600 ? 24 : 64);
  scale = zoom === 'fit' ? Math.min(1, available / width) : zoom;
  const height = Math.max(
    500,
    frame.contentDocument?.body?.scrollHeight || 600,
  );
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  frame.style.transform = `scale(${scale})`;
  $('.frame-space').style.width = `${width * scale}px`;
  $('.frame-space').style.height = `${height * scale}px`;
  $('#canvas-size').textContent = `${width} px · ${Math.round(scale * 100)}%`;
  $('#canvas-label').textContent = preview
    ? 'CAMPAIGN PREVIEW'
    : 'YOUR CAMPAIGN';
  document
    .querySelectorAll<HTMLButtonElement>('[data-viewport]')
    .forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.viewport === viewport)),
    );
}
function render() {
  renderPanels();
  renderCanvas();
  updateStatus();
  $<HTMLInputElement>('#campaign-name').value = project.name;
  $<HTMLInputElement>('#campaign-name').disabled = readOnly || preview;
  $('.preview-button').innerHTML =
    `${icon(preview ? 'back' : 'eye')}<span>${preview ? 'Back to editor' : 'Preview'}</span>`;
  $('.preview-button').setAttribute(
    'aria-label',
    preview ? 'Back to editor' : 'Preview',
  );
  $('.back-button').setAttribute(
    'aria-label',
    'Return to existing application',
  );
}
function scrollToSelected() {
  frame.addEventListener(
    'load',
    () => {
      const section = frame.contentDocument?.querySelector<HTMLElement>(
        `[data-id="${selected}"]`,
      );
      if (section)
        $('#stage').scrollTop = Math.max(0, section.offsetTop * scale - 70);
    },
    { once: true },
  );
}
function openDialog(title: string, content: string, css = '') {
  dialogTrigger = document.activeElement as HTMLElement;
  modal.className = css;
  modal.innerHTML = `<div class="dialog-header"><div><span class="overline">COMETROW · DESIGN REVIEW</span><h2 id="dialog-title">${title}</h2></div>${button('close-dialog', 'Close dialog', 'close')}</div>${content}`;
  if (!modal.open) modal.showModal();
}
function newCampaign() {
  openDialog(
    'Start with a little possibility.',
    `<p class="dialog-intro">Choose a starting point. Every section is yours to change.</p><label class="field new-name">Campaign name<input id="new-name" maxlength="160" value="My next campaign" required></label><div class="starter-grid"><button data-starter="studio"><div class="starter-art">${art('orbit')}<span>MAKE ROOM<br>FOR WHAT’S NEXT.</span></div><strong>Open studio</strong><small>A warm invitation to an event or experience.</small><b>Use this starter ${icon('arrow')}</b></button><button data-starter="launch"><div class="starter-art">${art('arch')}<span>GOOD THINGS<br>TAKE SHAPE.</span></div><strong>Fresh launch</strong><small>An editorial introduction to your next offering.</small><b>Use this starter ${icon('arrow')}</b></button><button data-starter="blank"><div class="starter-blank">${icon('plus')}<span>Your idea.<br>Your starting point.</span></div><strong>Start blank</strong><small>Build a campaign one section at a time.</small><b>Start creating ${icon('arrow')}</b></button></div><p class="muted small">Creates a new local review copy. You can undo this change. Your real campaigns are unaffected.</p>`,
    'starter-dialog',
  );
}
function mediaDialog() {
  const b = selectedBlock();
  if (!b || !['hero', 'media'].includes(b.type)) {
    toast('Select a Hero or Gallery to replace its sample.');
    return;
  }
  openDialog(
    'Give your story a visual.',
    `<p class="dialog-intro">Choose bundled sample artwork for this prototype.</p><div class="art-grid">${['orbit', 'arch', 'wave'].map((k) => `<button data-art="${k}">${art(k)}<strong>${k[0]!.toUpperCase() + k.slice(1)}</strong><span>${project.appearance[b.id]?.art === k ? 'Current sample' : 'Use this sample'}</span></button>`).join('')}</div><div class="coming-later">${icon('image')} Uploads and your media library arrive in the media phase.</div>`,
  );
}
function helpDialog() {
  openDialog(
    'Try the visual editor.',
    `<div class="review-help"><p>This is an isolated interaction prototype. Changes save only in this browser on port 3001.</p><ol><li>Create a campaign from a starter or choose blank.</li><li>Add a Hero and click its headline directly on the canvas.</li><li>Replace the sample image; explore Layout and Style.</li><li>Add a Call to action. Drag its handle to a new position.</li><li>Try all three viewports, Preview, then Undo.</li></ol><p>Keyboard: Tab for controls, Enter to activate, Alt + ↑/↓ on a section or drag handle to move. Ctrl/Cmd + Z and Shift + Z undo/redo outside text editing.</p><div class="review-tools"><button data-action="simulate-failure">Simulate next save failure</button><button data-action="toggle-readonly">${readOnly ? 'Return to editing' : 'Try read-only mode'}</button><button data-action="export">Download review copy</button></div><p class="muted small">Two tabs loaded at the same local revision reproduce a conflict when each edits. Layout choices and sample artwork are prototype proposals; no production schema has changed.</p></div>`,
  );
}
function conflictDialog() {
  if (!conflict) return;
  openDialog(
    'Choose how to continue.',
    `<p class="dialog-intro">Another tab saved local revision ${conflict.revision}. Your tab started from revision ${revision}.</p><div class="conflict-comparison"><div><h3>Your version</h3><p>${e(project.name)}</p><p>${e(project.document.blocks.find((b) => b.type === 'hero')?.data.headline || 'No Hero')}</p></div><div><h3>Saved version</h3><p>${e(conflict.project.name)}</p><p>${e(conflict.project.document.blocks.find((b) => b.type === 'hero')?.data.headline || 'No Hero')}</p></div></div><p>Choosing your version replaces the whole review copy. Download it first if you want a backup.</p><div class="dialog-actions"><button data-action="export">Download my copy</button><button data-action="use-saved">Use saved version</button><button class="primary" data-action="keep-mine">Keep my version</button></div>`,
  );
}
function setPath(path: string, value: unknown) {
  const b = selectedBlock();
  if (!b) return;
  const keys = path.split('.');
  let data = b.data as Record<string, unknown>;
  for (const key of keys.slice(0, -1))
    data = data[key] as Record<string, unknown>;
  data[keys.at(-1)!] = value;
}
function action(name: string, id?: string) {
  if (id) selected = id;
  if (name === 'close-dialog') {
    modal.close();
    return;
  }
  if (name === 'close-panel') {
    setPanel('canvas');
    return;
  }
  if (name === 'preview') {
    preview = !preview;
    mobilePanel = 'canvas';
    render();
    return;
  }
  if (name === 'help') {
    helpDialog();
    return;
  }
  if (name === 'conflict') {
    conflictDialog();
    return;
  }
  if (name === 'save') {
    if (conflict) conflictDialog();
    else save();
    return;
  }
  if (name === 'export') {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(project, null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cometrow-design-review.json';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (name === 'toggle-readonly') {
    readOnly = !readOnly;
    modal.close();
    render();
    return;
  }
  if (readOnly) {
    toast('This review mode is read-only.');
    return;
  }
  if (name === 'new') {
    newCampaign();
    return;
  }
  if (name === 'media') {
    mediaDialog();
    return;
  }
  if (name === 'simulate-failure') {
    simulateFailure = true;
    modal.close();
    toast('The next local save will fail once.');
    return;
  }
  if (name === 'open-library') {
    setPanel('add');
    return;
  }
  if (name === 'clear-search') {
    query = '';
    group = 'All';
    renderLeft();
    return;
  }
  if (name === 'add-hero') {
    add('hero');
    return;
  }
  if (name === 'properties') {
    setPanel('properties');
    return;
  }
  if (name === 'undo' || name === 'redo') {
    project = name === 'undo' ? history.undo(project) : history.redo(project);
    if (!selectedBlock()) selected = project.document.blocks[0]?.id || null;
    render();
    scheduleSave();
    toast(name === 'undo' ? 'Change undone' : 'Change redone');
    return;
  }
  if ((name === 'use-saved' || name === 'keep-mine') && conflict) {
    history.push(project);
    revision = conflict.revision;
    acknowledged = JSON.stringify(conflict.project);
    if (name === 'use-saved') project = structuredClone(conflict.project);
    conflict = undefined;
    modal.close();
    render();
    scheduleSave();
    return;
  }
  if (name === 'up' || name === 'down') {
    moveSelected(name === 'up' ? -1 : 1);
    return;
  }
  const b = selectedBlock();
  if (!b) return;
  if (name === 'visibility')
    mutate(
      () => {
        b.enabled = !b.enabled;
      },
      b.enabled ? 'Block hidden' : 'Block shown',
    );
  if (name === 'duplicate') {
    if (project.document.blocks.length >= 20) {
      toast('This campaign already has 20 blocks.');
      return;
    }
    mutate((p) => {
      const copy = structuredClone(b);
      copy.id = crypto.randomUUID();
      p.document.blocks.splice(p.document.blocks.indexOf(b) + 1, 0, copy);
      p.appearance[copy.id] = structuredClone(
        p.appearance[b.id] || defaultAppearance(),
      );
      selected = copy.id;
    }, 'Block duplicated');
  }
  if (name === 'delete')
    mutate((p) => {
      const index = p.document.blocks.indexOf(b);
      p.document.blocks.splice(index, 1);
      delete p.appearance[b.id];
      selected =
        p.document.blocks[Math.min(index, p.document.blocks.length - 1)]?.id ||
        null;
    }, 'Block deleted');
}
app.addEventListener('click', (event) => {
  const target = (event.target as Element).closest<HTMLElement>('button');
  if (!target || target.hasAttribute('disabled')) return;
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  if (target.dataset.action) action(target.dataset.action, target.dataset.id);
  if (target.dataset.left) {
    leftTab = target.dataset.left as typeof leftTab;
    renderPanels();
  }
  if (target.dataset.mobile) setPanel(target.dataset.mobile);
  if (target.dataset.inspector) {
    inspectorTab = target.dataset.inspector as typeof inspectorTab;
    renderPanels();
  }
  if (target.dataset.viewport) {
    viewport = target.dataset.viewport as typeof viewport;
    sizeCanvas();
    $('#stage').scrollTop = 0;
  }
  if (target.dataset.select) {
    select(target.dataset.select);
    frame.contentDocument
      ?.querySelector<HTMLElement>(`[data-id="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' });
    const el = frame.contentDocument?.querySelector<HTMLElement>(
      `section[data-id="${selected}"]`,
    );
    if (el) $('#stage').scrollTop = Math.max(0, el.offsetTop * scale - 50);
  }
  if (target.dataset.add) add(target.dataset.add as BlockType);
  if (target.dataset.starter) {
    const name = $<HTMLInputElement>('#new-name').value.trim();
    if (!name) {
      $<HTMLInputElement>('#new-name').reportValidity();
      return;
    }
    mutate(() => {
      project = starter(
        target.dataset.starter as 'studio' | 'launch' | 'blank',
        name,
      );
      selected =
        project.document.blocks.find((b) => b.type === 'hero')?.id || null;
      leftTab = project.document.blocks.length ? 'layers' : 'add';
      mobilePanel = 'canvas';
    }, 'Review campaign created');
    modal.close();
    $('#stage').scrollTop = 0;
  }
  if (target.dataset.art && selected) {
    mutate((p) => {
      (p.appearance[selected!] ||= defaultAppearance()).art = target.dataset
        .art as Appearance['art'];
      const b = selectedBlock();
      if (b?.type === 'hero') {
        b.data.visual = 'image';
        b.data.alt = `Abstract ${target.dataset.art} sample artwork`;
      }
    }, 'Sample image replaced');
    modal.close();
  }
  if (target.dataset.layout && selected)
    mutate((p) => {
      (p.appearance[selected!] ||= defaultAppearance()).layout = target.dataset
        .layout as Appearance['layout'];
    });
  if (target.dataset.tone && selected)
    mutate((p) => {
      (p.appearance[selected!] ||= defaultAppearance()).tone = target.dataset
        .tone as Appearance['tone'];
    });
  if (target.dataset.accent)
    mutate((p) => {
      p.document.theme.accent = target.dataset.accent!;
    });
  if (target.dataset.addItem || target.dataset.removeItem) {
    const b = selectedBlock();
    if (!b) return;
    const key = target.dataset.addItem || target.dataset.removeItem!;
    const field = definition(b.type).fields.find((f) => f.key === key)!;
    mutate(() => {
      const data = b.data as Record<string, unknown>;
      const items = data[key] as unknown[];
      if (target.dataset.addItem) {
        if (items.length < field.maxItems!)
          items.push(structuredClone(field.item));
      } else items.splice(Number(target.dataset.index), 1);
    });
  }
});
app.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id === 'block-search') {
    query = input.value;
    $('#library-results').innerHTML = libraryResults();
    return;
  }
  if (input.id === 'campaign-name') {
    if (!inlineStarted) {
      history.push(project);
      inlineStarted = true;
    }
    project.name = input.value;
    scheduleSave();
    return;
  }
  if (
    input.dataset.field &&
    input.type !== 'checkbox' &&
    input.tagName !== 'SELECT'
  ) {
    if (!inlineStarted) {
      history.push(project);
      inlineStarted = true;
    }
    setPath(input.dataset.field, input.value);
    autosizeFields();
    renderCanvas();
    scheduleSave();
  }
});
app.addEventListener('focusout', (event) => {
  const t = event.target as HTMLElement;
  if (t.matches('input,textarea')) {
    inlineStarted = false;
    updateStatus();
  }
});
app.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id === 'zoom') {
    zoom = input.value === 'fit' ? 'fit' : Number(input.value);
    sizeCanvas();
    return;
  }
  if (input.id === 'block-category') {
    group = input.value;
    $('#library-results').innerHTML = libraryResults();
    return;
  }
  if (
    input.dataset.field &&
    (input.tagName === 'SELECT' || input.type === 'checkbox')
  )
    mutate(() =>
      setPath(
        input.dataset.field!,
        input.type === 'checkbox' ? input.checked : input.value,
      ),
    );
  if (input.dataset.appearance && selected)
    mutate((p) => {
      (p.appearance[selected!] ||= defaultAppearance()).spacing =
        input.value as Appearance['spacing'];
    });
  if (input.dataset.theme)
    mutate((p) => {
      if (input.dataset.theme === 'typography')
        p.document.theme.typography = input.value as 'modern' | 'editorial';
      else p.document.theme.corners = input.value as 'soft' | 'square';
    });
});
modal.addEventListener(
  'close',
  () => dialogTrigger?.isConnected && dialogTrigger.focus(),
);
function keyboard(event: KeyboardEvent) {
  const t = event.target as HTMLElement;
  if (
    event.key === 'Tab' &&
    isMobile() &&
    mobilePanel !== 'canvas' &&
    !modal.open
  ) {
    const panel =
      mobilePanel === 'properties' ? $('.right-panel') : $('.left-panel');
    const focusable = [
      ...panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary',
      ),
      ...$('.mobile-nav').querySelectorAll<HTMLElement>('button'),
    ].filter((el) => el.getClientRects().length > 0);
    const index = focusable.indexOf(t);
    event.preventDefault();
    focusable[
      (index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length
    ]?.focus();
    return;
  }
  if (event.key === 'Escape') {
    if (preview) {
      preview = false;
      render();
    } else if (mobilePanel !== 'canvas') {
      setPanel('canvas');
    }
    return;
  }
  const editing = t.matches('input,textarea,select,[contenteditable]');
  if (
    event.altKey &&
    ['ArrowUp', 'ArrowDown'].includes(event.key) &&
    !editing
  ) {
    event.preventDefault();
    const section = t.closest<HTMLElement>('[data-id],[data-layer]');
    if (section) selected = section.dataset.id || section.dataset.layer!;
    moveSelected(event.key === 'ArrowUp' ? -1 : 1);
  }
  if (
    !editing &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'z'
  ) {
    event.preventDefault();
    action(event.shiftKey ? 'redo' : 'undo');
  }
}
document.addEventListener('keydown', keyboard);
frame.addEventListener('load', () => {
  const doc = frame.contentDocument!;
  canvasObserver?.disconnect();
  canvasObserver = new ResizeObserver(sizeCanvas);
  canvasObserver.observe(doc.body);
  doc.addEventListener('click', (event) => {
    if (preview || readOnly) return;
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const t = event.target as Element;
    const section = t.closest<HTMLElement>('section[data-id]');
    if (section && selected !== section.dataset.id) select(section.dataset.id!);
    const control = t.closest<HTMLElement>('[data-action]');
    if (control?.dataset.action === 'insert') {
      beforeId = control.dataset.before || null;
      setPanel('add');
    } else if (control?.dataset.action)
      action(control.dataset.action, control.dataset.id);
  });
  doc.addEventListener('focusin', (event) => {
    const t = event.target as HTMLElement;
    const section = t.closest<HTMLElement>('section[data-id]');
    if (section && selected !== section.dataset.id) select(section.dataset.id!);
    inlineStarted = false;
  });
  doc.addEventListener('input', (event) => {
    const t = event.target as HTMLElement;
    if (!t.dataset.field || readOnly) return;
    if (!inlineStarted) {
      history.push(project);
      inlineStarted = true;
    }
    setPath(t.dataset.field, t.innerText);
    scheduleSave();
    // Do not replace editable DOM during typing: caret, composition and native text undo survive.
  });
  doc.addEventListener('focusout', (event) => {
    if ((event.target as HTMLElement).dataset.field) {
      inlineStarted = false;
      // Keep pointer targets in place when clicking out of inline text.
      const b = selectedBlock();
      if (b) {
        $('#inspector')
          .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
            '[data-field]',
          )
          .forEach((input) => {
            let value: unknown = b.data;
            for (const key of input.dataset.field!.split('.'))
              value = (value as Record<string, unknown>)[key];
            if (input.type !== 'checkbox') input.value = String(value ?? '');
          });
        const subtitle = app.querySelector<HTMLElement>(
          `[data-layer="${b.id}"] .layer-select small`,
        );
        if (subtitle) subtitle.textContent = blockTitle(b);
      }
    }
  });
  doc.addEventListener('keydown', keyboard);
  doc.addEventListener('paste', (event) => {
    const t = event.target as HTMLElement;
    if (!t.isContentEditable) return;
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    const selection = doc.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = doc.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    t.dispatchEvent(new Event('input', { bubbles: true }));
  });
  bindDrag(doc, true);
  sizeCanvas();
});

// Pointer capture works for mouse, pen and touch. Only explicit handles/cards initiate dragging.
type Drag = {
  id?: string;
  type?: BlockType;
  x: number;
  y: number;
  active: boolean;
  valid: boolean;
  target: string | null;
  originFrame: boolean;
  pointerX: number;
  pointerY: number;
};
let drag: Drag | undefined;
let suppressClick = false;
let dragScroll: ReturnType<typeof setInterval> | undefined;
function point(event: PointerEvent, inFrame: boolean) {
  const rect = frame.getBoundingClientRect();
  return {
    x: inFrame ? rect.left + event.clientX * scale : event.clientX,
    y: inFrame ? rect.top + event.clientY * scale : event.clientY,
  };
}
function clearDrop() {
  document
    .querySelectorAll('.drop-before,.drop-after')
    .forEach((el) => el.classList.remove('drop-before', 'drop-after'));
  frame.contentDocument
    ?.querySelectorAll('.drop-target')
    .forEach((el) => el.classList.remove('drop-target'));
}
function dragMove(x: number, y: number) {
  if (!drag) return;
  drag.pointerX = x;
  drag.pointerY = y;
  $('#drag-ghost').style.transform = `translate(${x + 14}px,${y + 14}px)`;
  clearDrop();
  const layers = $('.left-panel').getBoundingClientRect();
  const stage = $('#stage').getBoundingClientRect();
  drag.valid =
    (x >= stage.left &&
      x <= stage.right &&
      y >= stage.top &&
      y <= stage.bottom) ||
    (leftTab === 'layers' &&
      x >= layers.left &&
      x <= layers.right &&
      y >= layers.top &&
      y <= layers.bottom);
  if (!drag.valid) return;
  if (
    leftTab === 'layers' &&
    x >= layers.left &&
    x < layers.right &&
    (!isMobile() || mobilePanel === 'layers')
  ) {
    const rows = [...document.querySelectorAll<HTMLElement>('[data-layer]')];
    const row = rows.find(
      (el) =>
        y <
        el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2,
    );
    drag.target = row?.dataset.layer || null;
    if (row) row.classList.add('drop-before');
    else $('[data-layer-end]').classList.add('drop-after');
  } else {
    const rect = frame.getBoundingClientRect();
    const localY = (y - rect.top) / scale;
    const sections = [
      ...frame.contentDocument!.querySelectorAll<HTMLElement>(
        'section[data-id]',
      ),
    ];
    const next = sections.find(
      (el) => localY < el.offsetTop + el.offsetHeight / 2,
    );
    drag.target = next?.dataset.id || null;
    frame
      .contentDocument!.querySelector<HTMLElement>(
        `.insertion[data-before="${drag.target || ''}"]`,
      )
      ?.classList.add('drop-target');
  }
}
function bindDrag(doc: Document, inFrame: boolean) {
  doc.addEventListener('pointerdown', (event) => {
    if (readOnly || preview || event.button !== 0) return;
    const t = (event.target as Element).closest<HTMLElement>(
      '[data-action="drag"],[data-drag-type]',
    );
    if (!t) return;
    const p = point(event, inFrame);
    drag = {
      id: t.dataset.id,
      type: t.dataset.dragType as BlockType | undefined,
      x: p.x,
      y: p.y,
      pointerX: p.x,
      pointerY: p.y,
      active: false,
      valid: false,
      target: null,
      originFrame: inFrame,
    };
    t.setPointerCapture(event.pointerId);
  });
  doc.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const p = point(event, inFrame);
    if (!drag.active && Math.hypot(p.x - drag.x, p.y - drag.y) > 7) {
      drag.active = true;
      suppressClick = true;
      $('#drag-ghost').hidden = false;
      $('#drag-ghost').innerHTML =
        `${icon('layers')} ${e(drag.type ? label(drag.type) : label(project.document.blocks.find((b) => b.id === drag!.id)!.type))}`;
      app.classList.add('is-dragging');
      if (isMobile() && drag.type) {
        mobilePanel = 'canvas';
        app.dataset.panel = 'canvas';
        $('.sheet-backdrop').hidden = true;
      }
      dragScroll = setInterval(() => {
        if (!drag?.active) return;
        const rect = $('#stage').getBoundingClientRect();
        if (drag.pointerY < rect.top + 55) $('#stage').scrollTop -= 18;
        else if (drag.pointerY > rect.bottom - 55) $('#stage').scrollTop += 18;
        dragMove(drag.pointerX, drag.pointerY);
      }, 35);
    }
    if (drag.active) {
      event.preventDefault();
      dragMove(p.x, p.y);
    }
  });
  doc.addEventListener('pointerup', () => {
    if (!drag) return;
    const finished = drag;
    drag = undefined;
    clearInterval(dragScroll);
    clearDrop();
    $('#drag-ghost').hidden = true;
    app.classList.remove('is-dragging');
    if (finished.active) {
      if (finished.valid) {
        if (finished.type) add(finished.type, finished.target);
        else reorder(finished.id!, finished.target);
      }
      setTimeout(() => {
        suppressClick = false;
      }, 50);
    }
  });
  doc.addEventListener('pointercancel', () => {
    drag = undefined;
    clearInterval(dragScroll);
    clearDrop();
    $('#drag-ghost').hidden = true;
    app.classList.remove('is-dragging');
    suppressClick = false;
  });
}
bindDrag(document, false);
window.addEventListener('resize', () => {
  sizeCanvas();
  syncSheetAccess();
  $('.sheet-backdrop').hidden =
    !isMobile() || mobilePanel === 'canvas' || preview;
});
window.addEventListener('beforeunload', (event) => {
  if (JSON.stringify(project) !== acknowledged) {
    event.preventDefault();
    event.returnValue = '';
  }
});
render();
