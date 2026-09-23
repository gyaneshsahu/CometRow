import './composer.css';
import { Autosave, type SaveResult } from './autosave.js';
import {
  blockLibrary,
  definition,
  newBlock,
  blockTitle,
  type Field,
} from './library.js';
import {
  documentSchema,
  documentShape,
  type CampaignDocument,
  type BlockType,
  type ContentBlock,
  type DraftSnapshot,
} from './schema.js';
import { escape as e, renderDocument } from './render.js';
import { pilotLimits } from '../shared/limits.js';

type Boot = DraftSnapshot & {
  title: string;
  readonly: boolean;
  csrf: string;
  nonce: string;
  base: string;
  userId: string;
  workspaceName: string;
};
const boot = JSON.parse(
  document.querySelector('#composer-data')!.textContent!,
) as Boot;
const root = document.querySelector<HTMLElement>('#composer-root')!;
const backupKey = `cometrow-draft:${boot.userId}:${boot.base}`;
let selected: string | null = null;
let screen: 'outline' | 'edit' | 'design' | 'preview' = 'outline';
let conflictAnnounced = false;
let mode: 'content' | 'design' = 'content';
let device: 'phone' | 'tablet' | 'desktop' = 'phone';
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let removed: { block: ContentBlock; index: number } | undefined;
let recovery: { document: CampaignDocument; revision: number } | undefined;
let storageAvailable = true;
let lastPreview = '';
let lastFocused: HTMLElement | null = null;

root.innerHTML = `<a class="skip" href="#block-editor">Skip to editor</a><header class="composer-header"><a class="composer-brand" href="/app" aria-label="CometRow home"><span aria-hidden="true">↗</span><b>CometRow</b></a><div class="campaign-heading"><a href="${boot.base}">Campaign overview</a><h1>${e(boot.title)}</h1></div><div class="save-cluster"><div><span id="save-status" role="status" aria-live="polite"></span><small id="save-explanation"></small></div><span class="save-control" tabindex="0" id="save-tooltip"><button id="save-now" class="btn" aria-describedby="save-explanation" ${boot.readonly ? 'hidden' : ''}>Save now</button></span></div></header>
<nav class="builder-nav" aria-label="Campaign builder"><div class="panel-tabs"><button id="content-tab" aria-pressed="true">Build</button><button id="design-tab" aria-pressed="false">Design</button><button id="show-preview" aria-pressed="false">Preview campaign</button></div><div class="revision-info"><span id="revision-status"></span><span>Private draft</span></div></nav>
<div id="state-banner" class="state-banner" role="status" tabindex="-1"></div><div class="composer-layout"><section class="outline-panel" aria-label="Campaign structure"><div id="outline-content" tabindex="-1"></div></section><section id="block-editor" class="editor-panel" tabindex="-1" aria-label="Block editor"></section><section class="preview-panel" aria-label="Live campaign preview"><div class="preview-toolbar"><div><p class="eyebrow">LIVE PREVIEW</p><h2 id="preview-title">Campaign opening</h2><p id="preview-context">Your first impression, in context.</p></div><button id="show-content" class="btn secondary">Back to builder</button></div><div class="device-tabs" aria-label="Preview size">${(['phone', 'tablet', 'desktop'] as const).map((name) => `<button data-device="${name}" aria-pressed="${name === device}">${name[0]!.toUpperCase() + name.slice(1)}</button>`).join('')}</div><div id="preview-error" role="status"></div><div class="preview-scroll"><div id="preview-stage"><iframe id="campaign-preview" title="Responsive campaign preview" sandbox="allow-same-origin" scrolling="no"></iframe></div></div><div class="preview-bottom"><span id="preview-dimensions"></span><a href="${boot.base}/preview" target="_blank" rel="noopener">Open saved preview ↗</a></div><p class="preview-scope">${boot.readonly ? 'Read-only campaign' : 'Changes appear here as you edit.'} No publishing or external navigation.</p></section></div>
<dialog id="block-library" aria-labelledby="library-title"><div class="dialog-head"><div><p class="eyebrow">BLOCK LIBRARY</p><h2 id="library-title">What would you like to add?</h2></div><button id="close-library" class="btn secondary">Close</button></div><p class="helper">Choose a building block for your campaign. You can change its position anytime.</p><div class="library-grid">${blockLibrary.map((entry) => `<button class="library-card" data-add="${entry.type}"><span class="library-category">${e(entry.group)}</span><strong>${e(entry.name)}</strong><small>${e(entry.description)}</small><span class="library-add">Add block +</span></button>`).join('')}</div><p class="helper">Media uses placeholders. Uploads and embeds come later.</p></dialog><div id="undo-toast" role="status"></div>`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  root.querySelector<T>(selector)!;
const iframe = $<HTMLIFrameElement>('#campaign-preview');
const saver = new Autosave(
  boot,
  async (request): Promise<SaveResult> => {
    const response = await fetch(`${boot.base}/draft`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ...request, _csrf: boot.csrf }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json();
    if (response.ok) return { kind: 'saved', snapshot: data };
    if (response.status === 409 && data.latest)
      return { kind: 'conflict', latest: data.latest };
    const message = String(
      data.error ||
        'Saving is temporarily unavailable. Your changes are kept in this tab.',
    );
    if (response.status === 429 || response.status >= 500)
      return { kind: 'retry', message };
    return {
      kind: 'blocked',
      message:
        response.status === 401
          ? 'Your session expired. Download your copy, sign in again, then return to recover this tab’s changes.'
          : message,
    };
  },
  onSaveChange,
  () => crypto.randomUUID(),
);

function persist() {
  if (boot.readonly || recovery) return;
  try {
    if (saver.unsaved)
      sessionStorage.setItem(
        backupKey,
        JSON.stringify({ document: saver.document, revision: saver.revision }),
      );
    else sessionStorage.removeItem(backupKey);
  } catch {
    storageAvailable = false;
  }
}
function onSaveChange() {
  persist();
  const labels = {
    saved: '✓ All changes saved',
    dirty: 'Unsaved changes',
    saving: 'Saving…',
    invalid: 'Check highlighted fields',
    retry: 'Waiting to reconnect',
    conflict: 'Review conflicting changes',
    blocked: 'Saving paused',
  };
  $('#save-status').textContent = boot.readonly
    ? 'Read-only preview'
    : labels[saver.state];
  $('#save-status').dataset.state = saver.state;
  const saveButton = $<HTMLButtonElement>('#save-now');
  saveButton.disabled = !['dirty', 'retry'].includes(saver.state);
  const saveLabels = {
    saved: 'Saved',
    dirty: 'Save now',
    saving: 'Saving…',
    invalid: 'Fix fields to save',
    retry: 'Retry save',
    conflict: 'Resolve conflict below',
    blocked: 'Saving paused',
  };
  saveButton.textContent = saveLabels[saver.state];
  const explanation = boot.readonly
    ? 'Changes are restricted by your role or campaign status.'
    : saver.state === 'saved'
      ? 'Autosave on · No pending changes'
      : saver.state === 'dirty'
        ? 'Autosave on · Saving shortly'
        : saver.state === 'saving'
          ? 'Sending this draft securely…'
          : saver.state === 'conflict'
            ? 'No changes will save until you choose a version.'
            : saver.state === 'invalid'
              ? 'Correct the highlighted fields to continue.'
              : 'Your unsaved changes stay in this tab.';
  $('#save-explanation').textContent = explanation;
  $('#save-tooltip').title = explanation;
  saveButton.title = explanation;
  $('#revision-status').textContent = `Draft revision ${saver.revision}`;
  renderBanner();
  if (saver.state === 'conflict' && !conflictAnnounced) {
    conflictAnnounced = true;
    $('#state-banner').focus();
    $('#state-banner').scrollIntoView({ block: 'start' });
  }
  if (saver.state !== 'conflict') conflictAnnounced = false;
  clearTimeout(saveTimer);
  if (!boot.readonly && !recovery && saver.state === 'dirty')
    saveTimer = setTimeout(() => void saver.flush(), 800);
  if (!boot.readonly && !recovery && saver.state === 'retry')
    saveTimer = setTimeout(() => void saver.flush(), 15000);
}
function edit(document: CampaignDocument) {
  if (boot.readonly) return;
  saver.edit(document);
  renderOutline();
  showValidation();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 180);
}
function summary(doc: CampaignDocument) {
  return (
    doc.blocks
      .filter((entry) => entry.enabled)
      .map((entry) => blockTitle(entry))
      .join(' · ') || 'Empty campaign'
  );
}
function renderBanner() {
  const banner = $('#state-banner');
  if (recovery)
    banner.innerHTML = `<strong>There are unsaved changes from this tab.</strong><p>Recover your work, or continue with the saved campaign.</p><div><button class="btn small" data-recovery="restore">Recover my changes</button><button class="btn secondary small" data-recovery="discard">Use saved campaign</button></div>`;
  else if (saver.state === 'conflict' && saver.latest)
    banner.innerHTML = `<strong>This campaign has a newer saved version.</strong><p>Your work is safe here. Compare both previews before choosing. Keeping yours will replace the saved document only if it has not changed again.</p><div class="conflict-versions"><div><b>Your version · based on revision ${saver.revision}</b><p>${e(summary(saver.document))}</p><button class="btn secondary small" data-compare="local">Preview my version</button></div><div><b>Saved version · revision ${saver.latest.revision}</b><p>${e(summary(saver.latest.document))}</p><button class="btn secondary small" data-compare="saved">Preview saved version</button></div></div><div><button class="btn small" data-resolve="local">Keep my version</button><button class="btn secondary small" data-resolve="saved">Use saved version · discard mine</button><button class="text-button" data-download>Download my copy</button></div>`;
  else if (['retry', 'blocked'].includes(saver.state))
    banner.innerHTML = `<strong>${saver.state === 'retry' ? 'Your changes have not reached the server yet.' : 'Saving is paused.'}</strong><p>${e(saver.message)}</p><div>${saver.state === 'retry' ? '<button class="btn small" data-retry>Retry now</button>' : '<a class="btn small" href="/login" target="_blank" rel="noopener">Sign in in a new tab</a><button class="btn secondary small" data-reload>Reload & recover</button>'}<button class="text-button" data-download>Download my copy</button></div>`;
  else if (saver.state === 'invalid') {
    const result = documentSchema.safeParse(saver.document);
    banner.innerHTML = `<strong>Check your campaign before saving.</strong><p>${
      !result.success
        ? e(
            result.error.issues
              .slice(0, 4)
              .map(
                (issue) =>
                  `${issue.path[0] === 'blocks' && typeof issue.path[1] === 'number' ? `Block ${issue.path[1] + 1}: ` : ''}${issue.message}`,
              )
              .join(' '),
          )
        : ''
    }</p>`;
  } else if (!storageAvailable)
    banner.innerHTML =
      '<strong>Browser backup is unavailable.</strong><p>Keep this tab open until saving completes.</p>';
  else if (boot.readonly)
    banner.innerHTML =
      '<strong>This campaign is read-only.</strong><p>Viewers can inspect the saved campaign. Archived campaigns must be returned to drafts before editing.</p>';
  else banner.innerHTML = '';
  banner.hidden = !banner.innerHTML;
  banner.setAttribute(
    'role',
    saver.state === 'conflict' || saver.state === 'invalid'
      ? 'alert'
      : 'status',
  );
}
function renderOutline() {
  $('#content-tab').setAttribute(
    'aria-pressed',
    String(screen === 'outline' || screen === 'edit'),
  );
  $('#design-tab').setAttribute('aria-pressed', String(screen === 'design'));
  $('#show-preview').setAttribute('aria-pressed', String(screen === 'preview'));
  $('#outline-content').innerHTML =
    `<div class="outline-heading"><div><p class="eyebrow">CAMPAIGN STRUCTURE</p><h2>Build your story</h2><p class="helper">Select a block to edit. Arrange your story in the order it should be read.</p></div><span class="block-count">${saver.document.blocks.length} / ${pilotLimits.blocksPerCampaign} blocks</span></div>${!boot.readonly ? `<button id="open-library" class="btn add-block" ${saver.document.blocks.length >= pilotLimits.blocksPerCampaign ? 'disabled' : ''}>Add a block +</button>` : ''}<ol class="block-list">${saver.document.blocks.map((entry, index) => `<li class="${entry.id === selected ? 'selected' : ''}"><button class="select-block" data-select="${entry.id}" aria-label="${boot.readonly ? 'View' : 'Edit'} ${e(definition(entry.type).name)}: ${e(blockTitle(entry))}"><span class="block-number">${String(index + 1).padStart(2, '0')}</span><span class="block-copy"><strong>${e(definition(entry.type).name)}</strong><small>${e(blockTitle(entry))}</small><span class="block-badge">${entry.enabled ? 'Visible' : 'Hidden'}</span></span><span class="edit-label">${boot.readonly ? 'View' : 'Edit'}</span></button>${!boot.readonly ? `<div class="order-controls"><button data-move="${index}:-1" title="Move this block one position earlier" aria-label="Move ${e(definition(entry.type).name)} up" ${index === 0 ? 'disabled' : ''}>Move up</button><button data-move="${index}:1" title="Move this block one position later" aria-label="Move ${e(definition(entry.type).name)} down" ${index === saver.document.blocks.length - 1 ? 'disabled' : ''}>Move down</button></div>` : ''}</li>`).join('')}</ol>${!saver.document.blocks.length && !boot.readonly ? '<div class="editor-empty"><h3>A clear story starts with a few good blocks.</h3><p>Add a block above, or start with brand, hero, information, action and footer.</p><button class="btn secondary" id="start-essentials">Start with the essentials</button></div>' : ''}<div class="builder-note"><strong>One campaign, every screen</strong><p>Your blocks adapt automatically. Use Preview campaign to review the entire story.</p></div>`;
}
function fieldHtml(
  spec: Field,
  data: Record<string, unknown>,
  prefix: string,
): string {
  const path = `${prefix}.${spec.key}`;
  const value = data[spec.key];
  const id = `field-${path.replaceAll('.', '-')}`;
  if (spec.fields) {
    const list = value as Record<string, unknown>[];
    return `<fieldset class="repeater"><legend>${e(spec.label)}</legend>${spec.help ? `<p class="helper">${e(spec.help)}</p>` : ''}${list.map((item, index) => `<div class="repeat-item"><div class="repeat-head"><strong>${e(spec.label)} ${index + 1}</strong><div><button type="button" class="icon-button" data-item-move="${path}:${index}:-1" aria-label="Move ${e(spec.label)} ${index + 1} up" ${index === 0 || boot.readonly ? 'disabled' : ''}>Up</button><button type="button" class="icon-button" data-item-move="${path}:${index}:1" aria-label="Move ${e(spec.label)} ${index + 1} down" ${index === list.length - 1 || boot.readonly ? 'disabled' : ''}>Down</button><button type="button" class="icon-button" data-item-remove="${path}:${index}" aria-label="Remove ${e(spec.label)} ${index + 1}" ${boot.readonly ? 'disabled' : ''}>Remove</button></div></div>${spec.fields!.map((child) => fieldHtml(child, item, `${path}.${index}`)).join('')}</div>`).join('')}<button type="button" class="btn secondary small" data-item-add="${path}" ${list.length >= spec.maxItems! || boot.readonly ? 'disabled' : ''}>＋ Add ${e(spec.label.toLowerCase())}</button><p class="field-error" data-error="${path}"></p></fieldset>`;
  }
  const attrs = `id="${id}" data-field="${path}" ${boot.readonly ? 'disabled' : ''} aria-describedby="${id}-help ${id}-error" ${spec.max ? `maxlength="${spec.max}"` : ''}`;
  let control: string;
  if (spec.kind === 'select')
    control = `<select ${attrs}>${spec.options!.map((option) => `<option value="${e(option)}" ${value === option ? 'selected' : ''}>${e(option[0]!.toUpperCase() + option.slice(1))}</option>`).join('')}</select>`;
  else if (spec.kind === 'textarea')
    control = `<textarea ${attrs} rows="${spec.key === 'body' ? '9' : '3'}">${e(value)}</textarea>`;
  else if (spec.kind === 'checkbox')
    control = `<input type="checkbox" ${attrs} ${value ? 'checked' : ''}>`;
  else
    control = `<input ${attrs} type="${spec.kind === 'datetime-local' ? 'datetime-local' : 'text'}" ${spec.kind === 'url' || spec.kind === 'email' ? `inputmode="${spec.kind}"` : ''} value="${e(value)}">`;
  return `<div class="field ${spec.kind === 'checkbox' ? 'checkbox-field' : ''}"><label for="${id}">${e(spec.label)}</label>${control}<small class="helper" id="${id}-help">${e(spec.help || '')}</small><p class="field-error" id="${id}-error" data-error="${path}"></p></div>`;
}
function renderFields(
  fields: Field[],
  data: Record<string, unknown>,
  prefix: string,
) {
  const sections = [
    ...new Set(fields.map((field) => field.section).filter(Boolean)),
  ];
  return (
    fields
      .filter((field) => !field.section)
      .map((field) => fieldHtml(field, data, prefix))
      .join('') +
    sections
      .map(
        (section) =>
          `<details class="field-section"><summary>${e(section)}</summary><div>${fields
            .filter((field) => field.section === section)
            .map((field) => fieldHtml(field, data, prefix))
            .join('')}</div></details>`,
      )
      .join('')
  );
}
function renderEditor() {
  root.dataset.screen = screen;
  $('.skip').setAttribute(
    'href',
    screen === 'outline'
      ? '#outline-content'
      : screen === 'preview'
        ? '#campaign-preview'
        : '#block-editor',
  );
  const host = $('#block-editor');
  if (mode === 'design') {
    const theme = saver.document.theme;
    host.innerHTML = `<button class="text-button" data-all-blocks>← All blocks</button><p class="eyebrow">CAMPAIGN DESIGN</p><h2>A consistent look, everywhere.</h2><p class="editor-description">One design, thoughtfully adapted to every screen.</p><fieldset ${boot.readonly ? 'disabled' : ''}><legend>Palette</legend><div class="theme-options">${['sage', 'paper', 'midnight'].map((preset) => `<button class="theme-card ${preset}" data-theme="${preset}" aria-pressed="${theme.preset === preset}"><span aria-hidden="true">Aa</span>${preset[0]!.toUpperCase() + preset.slice(1)}</button>`).join('')}</div></fieldset>${fieldHtml({ key: 'accent', label: 'Brand accent', max: 7, help: 'Six-digit hex color, for example #375b37. Button text adjusts for contrast.' }, theme, 'theme')}${fieldHtml({ key: 'typography', label: 'Typography', kind: 'select', options: ['modern', 'editorial'] }, theme, 'theme')}${fieldHtml({ key: 'corners', label: 'Corners', kind: 'select', options: ['soft', 'square'] }, theme, 'theme')}<div class="editor-note">A little consistency goes a long way. Your design applies to every block.</div>`;
  } else {
    const entry = saver.document.blocks.find((block) => block.id === selected);
    if (!entry) {
      host.innerHTML = `<div class="editor-empty"><span>✳</span><p class="eyebrow">FROM IDEA TO EXPERIENCE</p><h2>What’s your story?</h2><p>Add a block and make it yours. A strong headline and one clear action are a great place to start.</p>${!boot.readonly ? '<button class="btn primary" data-library>Add your first block ＋</button><button class="text-button" id="start-essentials">Start with the essentials</button>' : ''}</div>`;
      return;
    }
    const entryIndex = saver.document.blocks.indexOf(entry);
    const spec = definition(entry.type);
    host.innerHTML = `<div class="editor-navigation"><button class="text-button" data-all-blocks>← All blocks</button><span>${entryIndex + 1} of ${saver.document.blocks.length}</span><button class="text-button" data-next-block ${entryIndex === saver.document.blocks.length - 1 ? 'disabled' : ''}>Next block →</button></div><div class="editor-heading"><div><p class="eyebrow">BLOCK ${String(entryIndex + 1).padStart(2, '0')}</p><h2>${e(spec.name)}</h2></div><span class="block-badge">${entry.enabled ? 'Visible' : 'Hidden'}</span></div><p class="editor-description">${e(spec.description)}</p><label class="visibility"><input type="checkbox" id="block-enabled" ${entry.enabled ? 'checked' : ''} ${boot.readonly ? 'disabled' : ''}> Show this block in the campaign</label><button class="btn secondary mobile-section-preview" data-section-preview>Preview this block</button><div class="block-fields">${renderFields(spec.fields, entry.data as Record<string, unknown>, `blocks.${entryIndex}.data`)}</div>${!boot.readonly ? '<div class="editor-actions"><button class="text-button danger" id="remove-block">Remove this block</button></div>' : ''}`;
  }
  showValidation();
}
function showValidation() {
  const result = documentSchema.safeParse(saver.document);
  root.querySelectorAll<HTMLElement>('[data-error]').forEach((element) => {
    element.textContent = '';
  });
  root
    .querySelectorAll<HTMLElement>('[aria-invalid]')
    .forEach((element) => element.removeAttribute('aria-invalid'));
  if (result.success) {
    $('#preview-error').textContent = '';
    return;
  }
  $('#preview-error').textContent =
    'Preview shows the last valid version. Fix the highlighted fields to update it.';
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    const error = root.querySelector<HTMLElement>(
      `[data-error="${CSS.escape(path)}"]`,
    );
    if (error) {
      error.textContent = issue.message;
      const details = error.closest('details');
      if (details) details.open = true;
      root
        .querySelector(`[data-field="${CSS.escape(path)}"]`)
        ?.setAttribute('aria-invalid', 'true');
    }
  }
  const summary = result.error.issues
    .map(
      (issue) =>
        `${issue.path[0] === 'blocks' && typeof issue.path[1] === 'number' ? `Block ${issue.path[1] + 1}: ` : ''}${issue.message}`,
    )
    .slice(0, 4)
    .join(' ');
  $('#preview-error').textContent =
    `${summary} Preview shows the last valid version.`;
}
function updatePreview(doc = saver.document, full = screen === 'preview') {
  const parsed = documentSchema.safeParse(doc);
  if (!parsed.success) return;
  const entry = parsed.data.blocks.find((block) => block.id === selected);
  const view = structuredClone(parsed.data);
  if (!full)
    view.blocks =
      (screen === 'edit' || screen === 'preview') && entry
        ? [{ ...entry, enabled: true }]
        : view.blocks.filter((block) => block.enabled).slice(0, 2);
  $('#preview-title').textContent = full
    ? 'Full campaign preview'
    : screen === 'edit' && entry
      ? `${definition(entry.type).name} preview`
      : 'Campaign opening';
  $('#preview-context').textContent = full
    ? 'One document, adapted to the screen you choose.'
    : screen === 'edit'
      ? 'Focused on the block you’re editing. Review the full campaign from the top navigation.'
      : 'Your opening blocks. Select a block to shape the rest of your story.';
  const key = JSON.stringify(view);
  if (key === lastPreview) {
    fitPreview();
    return;
  }
  lastPreview = key;
  iframe.onload = fitPreview;
  iframe.srcdoc = renderDocument(
    view,
    boot.nonce,
    boot.title,
    `${location.origin}/campaign-preview.css`,
  );
}
function fitPreview() {
  const widths = { phone: 390, tablet: 768, desktop: 1200 };
  const width = widths[device];
  const available = $('.preview-scroll').clientWidth - 40;
  if (available <= 0) return;
  const scale = Math.min(1, available / width);
  iframe.style.width = `${width}px`;
  iframe.style.height = '1px';
  const height = Math.max(
    180,
    iframe.contentDocument?.body.scrollHeight ?? 500,
  );
  iframe.style.height = `${height}px`;
  iframe.style.transform = `scale(${scale})`;
  $('#preview-stage').style.width = `${width * scale}px`;
  $('#preview-stage').style.height = `${height * scale}px`;
  $('#preview-dimensions').textContent =
    `${width} px · ${device[0]!.toUpperCase() + device.slice(1)}${scale < 1 ? ' · Scaled to fit' : ''}`;
}
function navigate(next: typeof screen) {
  screen = next;
  mode = next === 'design' ? 'design' : 'content';
  renderOutline();
  renderEditor();
  updatePreview();
  window.scrollTo({ top: 0 });
}
function atPath(document: CampaignDocument, path: string) {
  let value: unknown = document;
  for (const key of path.split('.'))
    value = (value as Record<string, unknown>)[key];
  return value;
}
function setPath(document: CampaignDocument, path: string, value: unknown) {
  const keys = path.split('.');
  const last = keys.pop()!;
  (atPath(document, keys.join('.')) as Record<string, unknown>)[last] = value;
}
function openLibrary() {
  lastFocused = document.activeElement as HTMLElement;
  $<HTMLDialogElement>('#block-library').showModal();
}
function closeLibrary() {
  $<HTMLDialogElement>('#block-library').close();
  lastFocused?.focus();
}
function download() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(saver.document, null, 2)], {
      type: 'application/json',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cometrow-draft-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
root.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  if (boot.readonly) return;
  if (input.dataset.field) {
    const copy = structuredClone(saver.document);
    setPath(
      copy,
      input.dataset.field,
      input.type === 'checkbox' ? input.checked : input.value,
    );
    edit(copy);
  }
  if (input.id === 'block-enabled') {
    const copy = structuredClone(saver.document);
    copy.blocks.find((entry) => entry.id === selected)!.enabled = input.checked;
    edit(copy);
  }
});
root.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>(
    'button,[data-select]',
  );
  if (!button || (button as HTMLButtonElement).disabled) return;
  const data = button.dataset;
  if (data.select) {
    selected = data.select;
    navigate('edit');
    $('#block-editor').focus({ preventScroll: true });
    return;
  }
  if ('allBlocks' in data || button.id === 'content-tab') {
    navigate('outline');
    return;
  }
  if (button.id === 'design-tab') {
    navigate('design');
    return;
  }
  if ('nextBlock' in data) {
    selected =
      saver.document.blocks[
        saver.document.blocks.findIndex((block) => block.id === selected) + 1
      ]?.id ?? selected;
    navigate('edit');
    $('#block-editor').focus({ preventScroll: true });
    return;
  }
  if (button.id === 'show-content') {
    navigate(selected ? 'edit' : 'outline');
    return;
  }
  if (button.id === 'show-preview') {
    navigate('preview');
    return;
  }
  if ('sectionPreview' in data) {
    screen = 'preview';
    root.dataset.screen = screen;
    renderOutline();
    updatePreview(saver.document, false);
    $('#preview-title').textContent = 'Selected block preview';
    $('#preview-context').textContent =
      'This block only. Choose Preview campaign above to see the complete story.';
    window.scrollTo({ top: 0 });
    return;
  }
  if (data.device) {
    device = data.device as typeof device;
    root
      .querySelectorAll('[data-device]')
      .forEach((item) =>
        item.setAttribute(
          'aria-pressed',
          String((item as HTMLElement).dataset.device === device),
        ),
      );
    fitPreview();
    return;
  }
  if (button.id === 'close-library') {
    closeLibrary();
    return;
  }
  if ('compare' in data && saver.latest) {
    screen = 'preview';
    root.dataset.screen = screen;
    renderOutline();
    updatePreview(
      data.compare === 'saved' ? saver.latest.document : saver.document,
      true,
    );
    $('#preview-error').textContent =
      data.compare === 'saved'
        ? `Saved version · revision ${saver.latest.revision}`
        : `Your version · based on revision ${saver.revision}`;
    $('.preview-panel').scrollIntoView({ block: 'start' });
    return;
  }
  if ('download' in data) {
    download();
    return;
  }
  if (boot.readonly) return;
  if (button.id === 'open-library' || 'library' in data) {
    openLibrary();
    return;
  }
  if (button.id === 'save-now' || 'retry' in data) {
    clearTimeout(saveTimer);
    void saver.flush();
    return;
  }
  if ('reload' in data) {
    persist();
    location.reload();
    return;
  }
  if (data.recovery) {
    const local = recovery;
    recovery = undefined;
    if (data.recovery === 'restore' && local) {
      saver.edit(local.document);
      if (local.revision !== saver.revision) {
        saver.latest = { document: boot.document, revision: boot.revision };
        saver.state = 'conflict';
      }
    }
    onSaveChange();
    renderOutline();
    renderEditor();
    updatePreview();
    return;
  }
  if (data.resolve) {
    saver.resolve(data.resolve as 'local' | 'saved');
    selected = saver.document.blocks[0]?.id ?? null;
    renderOutline();
    renderEditor();
    updatePreview();
    return;
  }
  const copy = structuredClone(saver.document);
  if (data.add) {
    if (copy.blocks.length >= pilotLimits.blocksPerCampaign) return;
    const entry = newBlock(data.add as BlockType, crypto.randomUUID());
    copy.blocks.push(entry);
    selected = entry.id;
    screen = 'edit';
    mode = 'content';
    closeLibrary();
  } else if (button.id === 'start-essentials') {
    if (copy.blocks.length) return;
    copy.blocks = (
      ['brand', 'hero', 'information', 'cta', 'footer'] as BlockType[]
    ).map((type) => newBlock(type, crypto.randomUUID()));
    selected = copy.blocks[0]!.id;
    screen = 'edit';
  } else if (data.move) {
    const [index, delta] = data.move.split(':').map(Number);
    const item = copy.blocks.splice(index!, 1)[0]!;
    copy.blocks.splice(index! + delta!, 0, item);
  } else if (button.id === 'remove-block') {
    const index = copy.blocks.findIndex((entry) => entry.id === selected);
    removed = { block: copy.blocks[index]!, index };
    copy.blocks.splice(index, 1);
    selected = copy.blocks[Math.min(index, copy.blocks.length - 1)]?.id ?? null;
    $('#undo-toast').innerHTML =
      '<span>Block removed.</span><button id="undo-remove">Undo</button>';
  } else if (button.id === 'undo-remove' && removed) {
    if (copy.blocks.length >= pilotLimits.blocksPerCampaign) return;
    copy.blocks.splice(removed.index, 0, removed.block);
    selected = removed.block.id;
    removed = undefined;
    $('#undo-toast').innerHTML = '';
  } else if (data.theme) {
    copy.theme.preset = data.theme as CampaignDocument['theme']['preset'];
    copy.theme.accent =
      data.theme === 'midnight'
        ? '#c6eb8f'
        : data.theme === 'paper'
          ? '#7f4732'
          : '#375b37';
  } else if (data.itemAdd) {
    const selectedBlock = copy.blocks.find((entry) => entry.id === selected)!;
    const spec = definition(selectedBlock.type).fields.find(
      (entry) => entry.key === data.itemAdd!.split('.').at(-1),
    )!;
    const list = atPath(copy, data.itemAdd) as unknown[];
    if (list.length >= spec.maxItems!) return;
    list.push(structuredClone(spec.item));
  } else if (data.itemRemove || data.itemMove) {
    const [path, rawIndex, rawDelta] = (data.itemRemove ||
      data.itemMove)!.split(':');
    const list = atPath(copy, path!) as unknown[];
    const index = Number(rawIndex);
    const item = list.splice(index, 1)[0];
    if (rawDelta) list.splice(index + Number(rawDelta), 0, item);
  } else return;
  if (!copy.blocks.length) screen = 'outline';
  edit(copy);
  renderEditor();
  updatePreview();
  if (
    data.add ||
    button.id === 'start-essentials' ||
    button.id === 'remove-block' ||
    button.id === 'undo-remove'
  )
    $('#block-editor').focus({ preventScroll: true });
  if (data.move) {
    const [index, delta] = data.move.split(':').map(Number);
    const moved = copy.blocks[index! + delta!]!;
    root.querySelector<HTMLElement>(`[data-select="${moved.id}"]`)?.focus();
  }
  if (data.itemAdd || data.itemRemove || data.itemMove)
    $('#block-editor').focus({ preventScroll: true });
});
$<HTMLDialogElement>('#block-library').addEventListener('close', () =>
  lastFocused?.focus(),
);
window.addEventListener('beforeunload', (event) => {
  if (saver.unsaved) {
    persist();
    event.preventDefault();
  }
});
window.addEventListener('online', () => {
  if (saver.state === 'retry') void saver.flush();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && saver.state === 'dirty')
    void saver.flush();
});
new ResizeObserver(fitPreview).observe($('.preview-scroll'));
try {
  const saved = sessionStorage.getItem(backupKey);
  if (saved && !boot.readonly) {
    const parsed = JSON.parse(saved);
    const shape = documentShape.safeParse(parsed.document);
    if (
      shape.success &&
      Number.isInteger(parsed.revision) &&
      JSON.stringify(shape.data) !== JSON.stringify(boot.document)
    )
      recovery = { document: shape.data, revision: parsed.revision };
  }
} catch {
  storageAvailable = false;
}
root.dataset.screen = screen;
renderOutline();
renderEditor();
onSaveChange();
updatePreview();
fitPreview();
