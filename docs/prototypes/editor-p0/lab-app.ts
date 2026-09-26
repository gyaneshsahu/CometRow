import {
  seed,
  devices,
  bands,
  breakpoint,
  createNode,
  placement,
  uid,
  units,
  clamp,
  snap,
  sectionHeight,
  nodeHeight,
  resolved,
  normalizeDocument,
  primaryScreen,
  geometryState,
  validateFile,
  type Device,
  type Kind,
  type Placement,
  type LabNode,
  type Style,
} from './lab-model.js';
import { History, type Command } from './lab-commands.js';
import {
  element,
  renderSection,
  measureSection,
  assetUrls,
  measureText,
} from './lab-render.js';
import { autoLayout } from './lab-auto-layout.js';
import { responsiveControls } from './lab-responsive-controls.js';
import * as storage from './lab-storage.js';
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const reviewCopy = new URLSearchParams(location.search).get('review') === '1';
const host = $('#lab');
host.innerHTML = `<header><div class="tools"><a class="brand" href="/editor-lab"><span aria-hidden="true">↗</span>CometRow</a><div>Editor Lab<div id="lab-status" role="status">Loading local draft…</div></div></div><button id="lab-add" class="primary">＋ Add Container</button><div class="tools"><button id="lab-undo">Undo</button><button id="lab-redo">Redo</button><button id="lab-preview">Preview</button><button id="lab-export">Export</button><button id="lab-import">Import</button></div></header><div id="lab-message" role="status">Isolated P0 review · Alt disables snapping · local browser storage</div><div class="lab-workspace"><aside class="lab-rail" aria-label="Live breakpoint previews"></aside><main class="lab-main"><div class="lab-toolbar"><strong id="lab-device">Desktop</strong><label>Zoom <select id="lab-zoom"><option value="fit">Fit</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option></select></label><span id="lab-origin"></span></div><div id="lab-space"><div class="lab-stage"></div></div><div id="lab-warning" role="status"></div></main><aside class="lab-inspector" aria-label="Properties and Layers"></aside></div><dialog class="lab-picker" aria-labelledby="lab-picker-title"><h2 id="lab-picker-title">Choose container type</h2><div class="tools"></div><button id="lab-cancel">Cancel</button></dialog>`;
let history = new History(seed(), measureText),
  device: Device = 'desktop',
  selected = '',
  zoom = 'fit',
  scale = 1,
  scope: Device | 'all' = device,
  saveTimer: ReturnType<typeof setTimeout>,
  pending: { x: number; y: number; change?: string } | undefined,
  gesture = false,
  saveBlocked = false;
const picker = $<HTMLDialogElement>('.lab-picker');
const names: Record<Device, string> = {
  mobile: 'Phone',
  tablet: 'Tablet',
  desktop: 'Desktop',
};
const doc = () => history.document;
const layout = () =>
  autoLayout(
    doc(),
    device,
    doc().breakpoints[device].previewWidthPx,
    measureText,
  ).layout;
const node = () => doc().nodes[selected];
const message = (text: string) => {
  $('#lab-message').textContent = text;
};
const error = (e: unknown) =>
  message(e instanceof Error ? e.message : String(e));
function autosave() {
  if (reviewCopy) {
    $('#lab-status').textContent = 'Review copy - not saved';
    return;
  }
  clearTimeout(saveTimer);
  $('#lab-status').textContent = 'Unsaved changes';
  saveTimer = setTimeout(() => {
    if (saveBlocked) return;
    void storage
      .save(structuredClone(doc()))
      .then(() => {
        $('#lab-status').textContent = 'Saved locally';
      })
      .catch((e) => {
        $('#lab-status').textContent = 'Save failed — export a copy';
        error(e);
      });
  }, 300);
}
function commit(c: Command, key = '') {
  try {
    history.commit(c, key);
    render();
    autosave();
    return true;
  } catch (e) {
    error(e);
    return false;
  }
}
function confirmAction(
  text: string,
  title = 'Confirm replacement',
  accept = 'Replace',
  cancel = 'Cancel replacement',
): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = element('dialog');
    dialog.className = 'lab-confirm';
    dialog.setAttribute('aria-label', title);
    dialog.append(element('h2', title), element('p', text));
    let accepted = false;
    dialog.append(
      button(cancel, () => dialog.close()),
      button(accept, () => {
        accepted = true;
        dialog.close();
      }),
    );
    dialog.onclose = () => {
      dialog.remove();
      resolve(accepted);
    };
    document.body.append(dialog);
    dialog.showModal();
  });
}
async function deleteEverywhere(id: string) {
  if (!doc().nodes[id]) return;
  if (
    await confirmAction(
      'Delete this element from Phone, Tablet and Desktop? You can undo this.',
      'Delete everywhere',
      'Delete everywhere',
      'Cancel deletion',
    )
  ) {
    if (commit({ type: 'DeleteNode', id, confirmed: true })) {
      selected = '';
      render();
      $('#lab-add').focus();
    }
  }
}
function button(label: string, fn: () => void) {
  const b = element('button', label);
  b.type = 'button';
  b.onclick = fn;
  return b;
}
function field(
  parent: HTMLElement,
  label: string,
  value: string | number,
  change: (v: string) => void,
  options?: readonly string[],
) {
  const l = element('label', label);
  let input: HTMLInputElement | HTMLSelectElement;
  if (options) {
    input = element('select');
    for (const option of options) {
      const o = element('option', option);
      o.value = option;
      input.append(o);
    }
  } else {
    input = element('input');
    input.type = typeof value === 'number' ? 'number' : 'text';
  }
  input.value = String(value);
  input.onchange = () => change(input.value);
  input.onblur = () => {
    if (input.value !== String(value)) change(input.value);
  };
  l.append(input);
  parent.append(l);
  return input;
}
function numberField(
  parent: HTMLElement,
  label: string,
  value: number,
  min: number,
  max: number,
  change: (v: number) => void,
  step = 1,
) {
  const input = field(parent, label, value, (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) {
      input.setAttribute('aria-invalid', 'true');
      message(`${label} must be between ${min} and ${max}.`);
      return;
    }
    change(n);
  }) as HTMLInputElement;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
}
function check(
  parent: HTMLElement,
  label: string,
  value: boolean,
  fn: (v: boolean) => void,
) {
  const l = element('label', label),
    c = element('input');
  c.type = 'checkbox';
  c.checked = value;
  c.onchange = () => fn(c.checked);
  l.append(c);
  parent.append(l);
}
function group(parent: HTMLElement, title: string, open = false) {
  const d = element('details');
  d.open = open;
  d.append(element('summary', title));
  parent.append(d);
  return d;
}
function contentEdit(fn: (n: LabNode) => void) {
  const n = structuredClone(node()!);
  fn(n);
  commit({ type: 'UpdateNodeContent', id: n.id, node: n }, 'content-' + n.id);
}
function geometry(patch: Partial<Placement>) {
  const p = { ...structuredClone(layout().placements[selected]!), ...patch };
  commit({ type: 'ResizeNode', id: selected, device, placement: p });
}
function styleEdit(style: Style) {
  commit({ type: 'UpdateNodeStyle', id: selected, device: scope, style });
}
function inspector() {
  const panel = $('.lab-inspector');
  panel.replaceChildren();
  const props = group(panel, 'Properties', true),
    n = node();
  if (n) {
    props.append(element('h3', n.name));
    const tools = element('div');
    tools.className = 'tools';
    tools.append(
      button('Change type', () => openPicker({ x: 120, y: 120, change: n.id })),
      button('Duplicate', () => {
        const id = uid();
        if (commit({ type: 'DuplicateNode', id: n.id, newId: id })) {
          selected = id;
          render();
        }
      }),
      button('Delete everywhere', () => {
        void deleteEverywhere(n.id);
      }),
    );
    props.append(tools);
    const content = group(props, 'Content & accessibility', true);
    field(content, 'Name', n.name, (v) =>
      contentEdit((nn) => {
        nn.name = v;
      }),
    );
    if (n.type === 'heading' || n.type === 'paragraph') {
      const l = element('label', 'Text (shared across breakpoints)'),
        ta = element('textarea');
      ta.value = n.content.text;
      ta.maxLength = n.type === 'heading' ? 500 : 5000;
      let textTimer: ReturnType<typeof setTimeout>;
      const updateText = () => {
        clearTimeout(textTimer);
        const current = doc().nodes[n.id];
        if (
          !current ||
          (current.type !== 'heading' && current.type !== 'paragraph') ||
          current.content.text === ta.value
        )
          return;
        const copy = structuredClone(current);
        copy.content.text = ta.value;
        commit(
          { type: 'UpdateNodeContent', id: n.id, node: copy },
          'content-' + n.id,
        );
      };
      ta.onchange = updateText;
      ta.onblur = updateText;
      ta.oninput = () => {
        clearTimeout(textTimer);
        textTimer = setTimeout(updateText, 350);
      };
      l.append(ta);
      content.append(l);
      if (n.type === 'heading')
        numberField(content, 'Heading level', n.content.level, 1, 6, (v) =>
          contentEdit((nn) => {
            if (nn.type === 'heading') nn.content.level = v;
          }),
        );
    }
    if (n.type === 'button') {
      field(content, 'Button label', n.content.label, (v) =>
        contentEdit((nn) => {
          if (nn.type === 'button') nn.content.label = v;
        }),
      );
      field(content, 'Link URL', n.content.action.value, (v) =>
        contentEdit((nn) => {
          if (nn.type === 'button')
            nn.content.action = { ...nn.content.action, kind: 'url', value: v };
        }),
      );
      check(content, 'Open in new tab', !!n.content.action.newTab, (v) =>
        contentEdit((nn) => {
          if (nn.type === 'button') nn.content.action.newTab = v;
        }),
      );
    }
    if (n.type === 'image' || n.type === 'video') {
      content.append(
        button('Use bundled sample', () =>
          contentEdit((nn) => {
            if (nn.type === 'image' || nn.type === 'video')
              nn.content.assetId =
                nn.type === 'image' ? 'sample-image' : 'sample-video';
          }),
        ),
      );
      if (n.type === 'image') {
        const upload = element('input');
        upload.type = 'file';
        upload.accept = 'image/png,image/jpeg,image/webp,image/gif';
        const label = element('label', 'Upload image (up to 5 MB)');
        label.append(upload);
        content.append(label);
        upload.onchange = () => {
          const file = upload.files?.[0];
          if (!file) return;
          void (async () => {
            validateFile(file);
            const id = uid();
            await storage.upload(id, file);
            assetUrls.set(id, URL.createObjectURL(file));
            const nn = structuredClone(n);
            nn.content.assetId = id;
            commit({
              type: 'UpdateNodeContent',
              id: n.id,
              node: nn,
              asset: {
                id,
                kind: 'image',
                name: file.name.slice(0, 160),
                mimeType: file.type,
                source: { kind: 'local', blobKey: id },
              },
            });
          })().catch(error);
        };
        field(content, 'Image alt text', n.content.alt, (v) =>
          contentEdit((nn) => {
            if (nn.type === 'image') nn.content.alt = v;
          }),
        );
        check(content, 'Decorative image', n.content.decorative, (v) =>
          contentEdit((nn) => {
            if (nn.type === 'image') {
              nn.content.decorative = v;
              nn.content.alt = v ? '' : 'Describe this image';
            }
          }),
        );
        content.append(
          button(
            layout().placements[n.id]!.sectionBackground
              ? 'Detach from background'
              : 'Set as section background',
            () =>
              commit({
                type: layout().placements[n.id]!.sectionBackground
                  ? 'DetachImageFromBackground'
                  : 'SetImageAsBackground',
                id: n.id,
                device,
              }),
          ),
        );
      } else {
        field(
          content,
          'Video URL',
          doc().assets[n.content.assetId]!.source.kind === 'url'
            ? (doc().assets[n.content.assetId]!.source as { url: string }).url
            : '',
          (v) => {
            const id = uid(),
              nn = structuredClone(n);
            nn.content.assetId = id;
            commit({
              type: 'UpdateNodeContent',
              id: n.id,
              node: nn,
              asset: {
                id,
                kind: 'video',
                name: 'Video URL',
                mimeType: 'video/mp4',
                source: { kind: 'url', url: v },
              },
            });
          },
        );
        for (const key of ['controls', 'muted', 'autoplay', 'loop'] as const)
          check(content, key, n.content[key], (v) =>
            contentEdit((nn) => {
              if (nn.type === 'video') {
                nn.content[key] = v;
                if (nn.content.autoplay) nn.content.muted = true;
              }
            }),
          );
        check(content, 'Sample image poster', !!n.content.posterAssetId, (v) =>
          contentEdit((nn) => {
            if (nn.type === 'video')
              nn.content.posterAssetId = v ? 'sample-image' : null;
          }),
        );
      }
    }
    if (n.type === 'shape') {
      field(
        content,
        'Shape',
        n.content.shape,
        (v) =>
          contentEdit((nn) => {
            if (nn.type === 'shape')
              nn.content.shape = v as 'rectangle' | 'ellipse' | 'line';
          }),
        ['rectangle', 'ellipse', 'line'],
      );
      check(content, 'Decorative shape', n.content.decorative, (v) =>
        contentEdit((nn) => {
          if (nn.type === 'shape') nn.content.decorative = v;
        }),
      );
    }
    props.append(responsiveControls(doc(), n.id, commit));
    const p = layout().placements[n.id]!,
      geo = group(props, 'Position & dimensions', true);
    const fields = element('div');
    fields.className = 'lab-fields';
    geo.append(fields);
    numberField(fields, 'X (480 units)', p.x, 0, 479, (v) =>
      geometry({ x: v }),
    );
    numberField(fields, 'Y (px)', p.yPx, 0, 10000, (v) => geometry({ yPx: v }));
    numberField(fields, 'Width (480 units)', p.w, 1, 480, (v) =>
      geometry({ w: v }),
    );
    field(
      geo,
      'Height mode',
      p.height.mode,
      (v) =>
        geometry({
          height:
            v === 'auto'
              ? { mode: 'auto', minPx: 44 }
              : v === 'aspect'
                ? { mode: 'aspect', ratio: 16 / 9 }
                : { mode: 'fixed', px: 160 },
        }),
      ['auto', 'fixed', 'aspect'],
    );
    if (p.height.mode === 'fixed')
      numberField(geo, 'Height (px)', p.height.px, 44, 4000, (v) =>
        geometry({ height: { mode: 'fixed', px: v } }),
      );
    if (p.height.mode === 'auto')
      numberField(geo, 'Minimum height (px)', p.height.minPx, 44, 4000, (v) =>
        geometry({ height: { mode: 'auto', minPx: v } }),
      );
    if (p.height.mode === 'aspect')
      numberField(
        geo,
        'Aspect ratio',
        p.height.ratio,
        0.06,
        20,
        (v) => geometry({ height: { mode: 'aspect', ratio: v } }),
        0.01,
      );
    geo.append(
      button(p.hidden ? 'Show on this screen' : 'Hide on this screen', () =>
        commit({
          type: 'SetNodeVisibility',
          id: n.id,
          device,
          value: !p.hidden,
        }),
      ),
    );
    if (device !== primaryScreen(doc()))
      geo.append(
        button('Reset to Auto', () =>
          commit({ type: 'ResetNodeToAuto', id: n.id, device }),
        ),
      );
    check(geo, 'Locked on this breakpoint', p.locked, (v) =>
      commit({ type: 'LockNode', id: n.id, device, value: v }),
    );
    const styles = group(props, 'Style & crop', true);
    field(
      styles,
      'Apply styles to',
      scope === 'all' ? 'All breakpoints' : 'This breakpoint',
      (v) => {
        scope = v === 'All breakpoints' ? 'all' : device;
      },
      ['This breakpoint', 'All breakpoints'],
    );
    const st = resolved(n, device);
    field(styles, 'Font family', st.fontFamily ?? '', (v) =>
      styleEdit({ fontFamily: v }),
    );
    for (const [key, label, min, max, def, step] of [
      ['fontSizePx', 'Font size (px)', 8, 240, 18, 1],
      ['fontWeight', 'Font weight', 100, 900, 400, 100],
      ['lineHeight', 'Line height', 0.8, 3, 1.3, 0.1],
      ['letterSpacingPx', 'Letter spacing (px)', -10, 50, 0, 0.1],
      ['borderWidthPx', 'Border (px)', 0, 40, 0, 1],
      ['borderRadiusPx', 'Radius (px)', 0, 999, 0, 1],
      ['paddingPx', 'Padding (px)', 0, 256, 0, 1],
      ['opacity', 'Opacity', 0, 1, 1, 0.05],
    ] as const)
      numberField(
        styles,
        label,
        st[key] ?? def,
        min,
        max,
        (v) => styleEdit({ [key]: v }),
        step,
      );
    for (const [key, label] of [
      ['color', 'Text color'],
      ['backgroundColor', 'Fill color'],
      ['borderColor', 'Border color'],
    ] as const)
      field(styles, label, st[key] ?? 'transparent', (v) =>
        styleEdit({ [key]: v }),
      );
    field(
      styles,
      'Text alignment',
      st.textAlign ?? 'left',
      (v) => styleEdit({ textAlign: v as Style['textAlign'] }),
      ['left', 'center', 'right'],
    );
    if (n.type === 'image' || n.type === 'video') {
      field(
        styles,
        'Media fit',
        st.objectFit ?? 'cover',
        (v) => styleEdit({ objectFit: v as Style['objectFit'] }),
        ['cover', 'contain', 'fill', 'none'],
      );
      numberField(
        styles,
        'Focal X (%)',
        st.objectPositionX ?? 50,
        0,
        100,
        (v) => styleEdit({ objectPositionX: v }),
      );
      numberField(
        styles,
        'Focal Y (%)',
        st.objectPositionY ?? 50,
        0,
        100,
        (v) => styleEdit({ objectPositionY: v }),
      );
    }
  } else
    props.append(element('p', 'Add a container or select a layer to edit it.'));
  const section = group(props, 'Hero section', !n);
  const height = layout().height;
  field(
    section,
    'Section height',
    height.mode,
    (v) =>
      commit({
        type: 'SetSectionHeight',
        device,
        height:
          v === 'auto'
            ? { mode: 'auto', minPx: 640 }
            : { mode: 'fixed', px: 640 },
      }),
    ['auto', 'fixed'],
  );
  numberField(
    section,
    height.mode === 'auto'
      ? 'Minimum section height (px)'
      : 'Section height (px)',
    height.mode === 'auto' ? height.minPx : height.px,
    240,
    4000,
    (v) =>
      commit({
        type: 'SetSectionHeight',
        device,
        height:
          height.mode === 'auto'
            ? { mode: 'auto', minPx: v }
            : { mode: 'fixed', px: v },
      }),
  );
  const layers = group(panel, 'Layers', true);
  layers.append(
    element('small', 'Reading order is independent of visual bands.'),
  );
  const s = doc().sections[0]!;
  for (const [index, id] of s.readingOrder.entries()) {
    const nn = doc().nodes[id]!,
      p = layout().placements[id]!,
      row = element('div');
    row.className = 'lab-layer';
    const select = button(
      `${index + 1}. ${nn.name}${p.hidden ? ' · hidden' : ''}${p.locked ? ' · locked' : ''}`,
      () => {
        selected = id;
        render();
      },
    );
    select.setAttribute('aria-pressed', String(id === selected));
    row.append(select);
    field(
      row,
      'Visual band',
      p.layerBand,
      (v) =>
        commit({
          type: 'SetLayer',
          id,
          device,
          band: v as Placement['layerBand'],
          order: p.layerOrder,
        }),
      nn.type === 'button' ? ['interactive'] : bands,
    );
    numberField(row, 'Visual order', p.layerOrder, 0, 99, (v) =>
      commit({ type: 'SetLayer', id, device, band: p.layerBand, order: v }),
    );
    const tools = element('div');
    tools.className = 'tools';
    for (const [label, delta] of [
      ['Read earlier', -1],
      ['Read later', 1],
    ] as const) {
      const b = button(label, () => {
        const ids = [...s.readingOrder],
          to = index + delta;
        [ids[index], ids[to]] = [ids[to]!, ids[index]!];
        commit({ type: 'SetReadingOrder', ids });
      });
      b.disabled = index + delta < 0 || index + delta >= s.readingOrder.length;
      tools.append(b);
    }
    tools.append(
      button(p.locked ? 'Unlock' : 'Lock', () =>
        commit({ type: 'LockNode', id, device, value: !p.locked }),
      ),
      button(p.hidden ? 'Show on this screen' : 'Hide on this screen', () =>
        commit({ type: 'SetNodeVisibility', id, device, value: !p.hidden }),
      ),
    );
    row.append(tools);
    layers.append(row);
  }
}
function renderRail() {
  const rail = $('.lab-rail');
  rail.replaceChildren();
  for (const bp of devices) {
    const b = button(names[bp], () => {
      device = bp;
      scope = device;
      render();
    });
    b.className = 'lab-thumbnail';
    b.setAttribute('aria-pressed', String(bp === device));
    b.setAttribute('aria-label', names[bp]);
    const mini = element('div');
    mini.className = 'lab-mini';
    mini.setAttribute('aria-hidden', 'true');
    const width = doc().breakpoints[bp].previewWidthPx,
      r = renderSection(doc(), bp);
    r.inert = true;
    r.removeAttribute('id');
    mini.append(r);
    b.append(mini);
    const card = element('div');
    card.className = 'lab-rail-card';
    card.dataset.screen = bp;
    const badges = element('div');
    badges.className = 'lab-rail-badges';
    if (bp === device) badges.append(element('span', 'Open'));
    if (bp === primaryScreen(doc()))
      badges.append(element('strong', 'Primary'));
    else if (node())
      badges.append(element('span', geometryState(doc(), selected, bp)));
    card.append(b, badges);
    if (bp !== primaryScreen(doc())) {
      const setPrimary = button('Set as Primary', async () => {
        if (
          await confirmAction(
            'Use ' +
              names[bp] +
              ' as Primary? Its layout and all Custom geometry will be preserved. The previous Primary becomes Custom. Only Auto geometry will regenerate.',
            'Change Primary',
            'Set as Primary',
            'Cancel change',
          )
        )
          commit({ type: 'SetPrimaryScreen', device: bp, confirmed: true });
      });
      setPrimary.setAttribute('aria-label', 'Set ' + names[bp] + ' as Primary');
      card.append(setPrimary);
    }
    if (bp !== primaryScreen(doc())) {
      const ps = Object.values(doc().sections[0]!.layouts[bp].placements);
      const auto = ps.filter((p) => p.geometryMode === 'auto').length;
      card.append(
        element(
          'small',
          `${auto} Auto / ${ps.length - auto} Custom - badge describes selected element`,
        ),
      );
    }
    rail.append(card);
    const result = measureSection(r, doc(), bp);
    const k = Math.min((b.clientWidth - 16) / width, 130 / result.height);
    r.style.transform = `scale(${k})`;
    mini.style.height = result.height * k + 'px';
  }
}
function render() {
  const active = document.activeElement;
  const activeLabel = active?.closest('label')?.firstChild?.textContent;
  const caret =
    active instanceof HTMLTextAreaElement
      ? [active.selectionStart, active.selectionEnd]
      : undefined;
  const scroll = $('.lab-inspector').scrollTop;
  $('#lab-device').textContent = names[device];
  $('#lab-origin').textContent = layout().origin + ' layout';
  $<HTMLButtonElement>('#lab-undo').disabled = !history.past.length;
  $<HTMLButtonElement>('#lab-redo').disabled = !history.future.length;
  renderRail();
  const stage = $('.lab-stage'),
    width = doc().breakpoints[device].previewWidthPx;
  stage.replaceChildren();
  const root = renderSection(doc(), device);
  root.inert = true;
  root.id = 'editor-' + doc().sections[0]!.id;
  stage.append(root);
  const result = measureSection(root, doc(), device);
  scale =
    zoom === 'fit'
      ? Math.min(1, Math.max(100, $('.lab-main').clientWidth - 40) / width)
      : Number(zoom);
  stage.style.width = width + 'px';
  stage.style.height = result.height + 'px';
  stage.style.transform = `scale(${scale})`;
  $('#lab-space').style.height = result.height * scale + 40 + 'px';
  $('#lab-space').style.width = width * scale + 'px';
  const overlay = element('div');
  overlay.className = 'lab-overlay';
  overlay.style.setProperty(
    '--columns',
    String(doc().breakpoints[device].visibleGuideColumns),
  );
  stage.append(overlay);
  for (const id of doc().sections[0]!.readingOrder) {
    const p = layout().placements[id]!;
    if (p.hidden) continue;
    const rendered = root.querySelector<HTMLElement>(`[data-node="${id}"]`)!;
    if (!p.locked) {
      const hit = element('button');
      hit.className = 'lab-hit';
      hit.setAttribute('aria-label', 'Select ' + doc().nodes[id]!.name);
      Object.assign(hit.style, {
        left: rendered.offsetLeft + 'px',
        top: rendered.offsetTop + 'px',
        width: rendered.offsetWidth + 'px',
        height: rendered.offsetHeight + 'px',
        zIndex: rendered.style.zIndex,
      });
      hit.onpointerdown = (e) => startGesture(e, id);
      hit.onclick = () => {
        selected = id;
        inspector();
        renderRail();
        selectionOverlay();
      };
      hit.onkeydown = (e) => {
        if (e.key.startsWith('Arrow')) {
          e.preventDefault();
          selected = id;
          const q = structuredClone(p),
            step = e.altKey ? 1 : 8;
          q.x += e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          q.yPx +=
            e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
          commit({ type: 'MoveNode', id, device, placement: q });
          $(
            '.lab-hit[aria-label="Select ' + doc().nodes[id]!.name + '"]',
          )?.focus();
        }
      };
      hit.oncontextmenu = (e) => {
        e.preventDefault();
        selected = id;
        openPicker({ x: p.x, y: p.yPx, change: id }, e.clientX, e.clientY);
      };
      overlay.append(hit);
    }
  }
  $('#lab-warning').textContent = result.warnings.join(' ');
  inspector();
  $('.lab-inspector').scrollTop = scroll;
  selectionOverlay();
  if (activeLabel) {
    const label = [...document.querySelectorAll('.lab-inspector label')].find(
      (l) => l.firstChild?.textContent === activeLabel,
    );
    const control = label?.querySelector<HTMLElement>('input,textarea,select');
    control?.focus({ preventScroll: true });
    if (caret && control instanceof HTMLTextAreaElement)
      control.setSelectionRange(caret[0]!, caret[1]!);
  }
}
function selectionOverlay() {
  document.querySelector('.lab-selection')?.remove();
  const p = layout().placements[selected],
    el = $('.lab-stage').querySelector<HTMLElement>(
      `[data-node="${selected}"]`,
    );
  if (!p || !el) return;
  const sel = element('div');
  sel.className = 'lab-selection';
  Object.assign(sel.style, {
    left: el.offsetLeft + 'px',
    top: el.offsetTop + 'px',
    width: el.offsetWidth + 'px',
    height: el.offsetHeight + 'px',
    zIndex: '499',
  });
  if (!p.locked)
    for (const h of ['se', 'e', 's']) {
      const handle = element('button');
      handle.className = 'lab-handle';
      handle.dataset.handle = h;
      handle.setAttribute(
        'aria-label',
        'Resize ' + h + '; alternatively use inspector dimensions',
      );
      handle.onpointerdown = (e) => startGesture(e, selected, h);
      sel.append(handle);
    }
  $('.lab-overlay').append(sel);
}
function openPicker(
  value: NonNullable<typeof pending>,
  x?: number,
  y?: number,
) {
  pending = value;
  picker.style.left =
    Math.max(8, Math.min(innerWidth - 340, x ?? innerWidth / 2 - 165)) + 'px';
  picker.style.top = Math.max(8, Math.min(innerHeight - 330, y ?? 160)) + 'px';
  picker.showModal();
}
for (const kind of [
  'heading',
  'paragraph',
  'image',
  'video',
  'button',
  'shape',
] as Kind[])
  picker.querySelector('.tools')!.append(
    button(kind[0]!.toUpperCase() + kind.slice(1), async () => {
      if (!pending) return;
      const { x, y, change } = pending;
      if (
        change &&
        !(await confirmAction(
          'Changing type replaces this container content. Continue?',
        ))
      )
        return;
      const n = createNode(kind, change ?? uid());
      const ok = change
        ? commit({ type: 'ChangeNodeType', id: change, node: n })
        : commit({
            type: 'AddNode',
            node: n,
            placement: placement(kind, x, y),
            device,
          });
      if (ok) {
        selected = n.id;
        pending = undefined;
        picker.close();
        render();
      }
    }),
  );
$('#lab-cancel').onclick = () => {
  pending = undefined;
  picker.close();
};
picker.oncancel = () => {
  pending = undefined;
};
picker.onclose = () => $('#lab-add').focus();
$('#lab-add').onclick = () => {
  if (!gesture)
    openPicker({ x: 120, y: Math.round(sectionHeight(doc(), device) / 3) });
};
function startGesture(e: PointerEvent, id?: string, handle?: string) {
  if (e.button !== 0) return;
  e.preventDefault();
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);
  const startX = e.clientX,
    startY = e.clientY,
    rect = $('.lab-stage').getBoundingClientRect();
  let moved = false,
    frame = 0,
    last = e;
  const initial = id ? structuredClone(layout().placements[id]!) : undefined;
  let next = initial;
  const content = id
    ? $('.lab-stage').querySelector<HTMLElement>(`[data-node="${id}"]`)
    : null;
  const measuredPlacements = Object.entries(layout().placements)
    .filter(([other, p]) => other !== id && !p.hidden && !p.sectionBackground)
    .map(([other, p]) => {
      const el = $('.lab-stage').querySelector<HTMLElement>(
        `[data-node="${other}"]`,
      );
      return p.height.mode === 'auto' && el
        ? { ...p, height: { mode: 'auto' as const, minPx: el.offsetHeight } }
        : p;
    });
  const ghost = element('div');
  ghost.className = 'lab-ghost';
  ghost.textContent = id ? (handle ? 'Resize' : 'Move') : 'Container';
  document.body.append(ghost);
  if (id) {
    selected = id;
    inspector();
    renderRail();
    if (!handle) selectionOverlay();
  }
  const paint = () => {
    frame = 0;
    const dx = (last.clientX - startX) / scale,
      dy = (last.clientY - startY) / scale;
    ghost.style.transform = `translate(${last.clientX + 12}px,${last.clientY + 12}px)`;
    if (initial && id) {
      let q = structuredClone(initial);
      if (handle) {
        if (handle.includes('e'))
          q.w += units(dx, doc().breakpoints[device].previewWidthPx);
        if (handle.includes('s'))
          q.height = {
            mode: 'fixed',
            px: Math.round((content?.offsetHeight ?? 44) + dy),
          };
      } else {
        q.x += units(dx, doc().breakpoints[device].previewWidthPx);
        q.yPx += Math.round(dy);
      }
      const result = snap(
        q.height.mode === 'auto' && content
          ? { ...q, height: { mode: 'auto', minPx: content.offsetHeight } }
          : q,
        measuredPlacements,
        last.altKey,
        doc().breakpoints[device].previewWidthPx,
        sectionHeight(doc(), device),
        handle,
      );
      result.placement.height = q.height;
      q = clamp(
        result.placement,
        layout().height.mode === 'auto'
          ? Math.max(
              sectionHeight(doc(), device),
              q.yPx + nodeHeight(q, doc().breakpoints[device].previewWidthPx),
            )
          : sectionHeight(doc(), device),
        doc().breakpoints[device].previewWidthPx,
      );
      next = q;
      ghost.textContent =
        result.guides.join(' · ') || `${q.x}, ${q.yPx} · ${q.w} units`;
      if (content) {
        if (handle)
          content.style.transform = `scale(${q.w / initial.w},${q.height.mode === 'fixed' ? q.height.px / content.offsetHeight : 1})`;
        else
          content.style.transform = `translate(${((q.x - initial.x) / 480) * doc().breakpoints[device].previewWidthPx}px,${q.yPx - initial.yPx}px)`;
        content.style.transformOrigin = 'top left';
      }
      document.querySelectorAll('.lab-guide').forEach((el) => el.remove());
      const match = result.guides
        .find((g) => g.startsWith('Vertical'))
        ?.match(/Vertical guide ([\d.]+)/);
      if (match) {
        const guide = element('div');
        guide.className = 'lab-guide';
        guide.style.left = (Number(match[1]) / 480) * 100 + '%';
        $('.lab-overlay').append(guide);
      }
      const horizontal = result.guides
        .find((g) => g.startsWith('Horizontal'))
        ?.match(/Horizontal guide ([\d.]+)/);
      if (horizontal) {
        const guide = element('div');
        guide.className = 'lab-guide';
        Object.assign(guide.style, {
          top: horizontal[1] + 'px',
          height: '1px',
          width: '100%',
          bottom: 'auto',
        });
        $('.lab-overlay').append(guide);
      }
    }
  };
  target.onpointermove = (ev) => {
    last = ev;
    if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 3) moved = true;
    gesture = moved;
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const finish = (ev: PointerEvent, cancel = false) => {
    if (frame) cancelAnimationFrame(frame);
    last = ev;
    if (moved && !cancel) paint();
    ghost.remove();
    target.onpointermove = null;
    target.onpointerup = null;
    target.onpointercancel = null;
    if (target.hasPointerCapture(ev.pointerId))
      target.releasePointerCapture(ev.pointerId);
    if (!cancel && moved) {
      if (id && next)
        commit({
          type: handle ? 'ResizeNode' : 'MoveNode',
          id,
          device,
          placement: next,
        });
      else if (
        ev.clientX >= rect.left &&
        ev.clientX <= rect.right &&
        ev.clientY >= rect.top &&
        ev.clientY <= rect.bottom
      )
        openPicker(
          {
            x: Math.min(
              479,
              Math.max(
                0,
                units(
                  (ev.clientX - rect.left) / scale,
                  doc().breakpoints[device].previewWidthPx,
                ),
              ),
            ),
            y: Math.max(0, Math.round((ev.clientY - rect.top) / scale)),
          },
          ev.clientX,
          ev.clientY,
        );
    }
    if (cancel || id) render();
    setTimeout(() => {
      gesture = false;
    }, 0);
  };
  target.onpointerup = (ev) => finish(ev);
  target.onpointercancel = (ev) => finish(ev, true);
}
$('#lab-add').onpointerdown = (e) => startGesture(e);
$('#lab-zoom').onchange = () => {
  zoom = $<HTMLSelectElement>('#lab-zoom').value;
  render();
};
$('#lab-undo').onclick = () => {
  history.undo();
  render();
  autosave();
};
$('#lab-redo').onclick = () => {
  history.redo();
  render();
  autosave();
};
$('#lab-preview').onclick = () => {
  host.hidden = true;
  const view = element('div');
  view.className = 'lab-preview';
  const draw = () => {
    const width =
      device === 'desktop'
        ? window.innerWidth
        : Math.min(window.innerWidth, doc().breakpoints[device].previewWidthPx);
    const b = breakpoint(width),
      root = renderSection(doc(), b, width);
    view.replaceChildren(root);
    measureSection(root, doc(), b);
  };
  document.body.append(view);
  draw();
  if (!reviewCopy) window.addEventListener('resize', draw);
  if (reviewCopy) {
    const widths = [320, 360, 390, 430, 639, 640, 768, 1023, 1024, 1200, 1440];
    const controls = element('div');
    field(
      controls,
      'Review width',
      doc().breakpoints[device].previewWidthPx,
      (value) => {
        const width = Number(value),
          b = breakpoint(width);
        const next = renderSection(doc(), b, width);
        view.replaceChildren(next);
        measureSection(next, doc(), b);
      },
      widths.map(String),
    );
    controls.style.cssText =
      'position:fixed;bottom:12px;right:12px;z-index:2000;background:white;padding:8px;border:1px solid #d6dfef;';
    document.body.append(controls);
    view.addEventListener('review-close', () => controls.remove(), {
      once: true,
    });
  }
  const exit = button('Exit preview', () => {
    window.removeEventListener('resize', draw);
    view.dispatchEvent(new Event('review-close'));
    view.remove();
    exit.remove();
    host.hidden = false;
    $('#lab-preview').focus();
  });
  exit.className = 'lab-exit';
  document.body.append(exit);
  exit.focus();
};
$('#lab-export').onclick = () => {
  if (Object.values(doc().assets).some((a) => a.source.kind === 'local'))
    message(
      'Export contains device-local image references. Images remain in this browser; JSON alone does not transfer them.',
    );
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(doc(), null, 2)], { type: 'application/json' }),
    ),
    a = element('a');
  a.href = url;
  a.download = 'cometrow-editor-lab.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('#lab-import').onclick = () => {
  const input = element('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    void (async () => {
      if (file.size > 2e6) throw Error('JSON must be under 2 MB');
      const value: unknown = JSON.parse(await file.text());
      const normalized = normalizeDocument(value);
      await loadAssets(normalized);
      if (commit({ type: 'ImportDocument', document: normalized })) {
        selected = '';
        render();
      }
    })().catch(error);
  };
  input.click();
};
async function loadAssets(d: ReturnType<typeof seed>) {
  for (const a of Object.values(d.assets))
    if (a.source.kind === 'local') {
      const blob = await storage.read('assets', a.source.blobKey);
      if (!(blob instanceof Blob))
        throw Error('Missing device-local image: ' + a.name);
      assetUrls.set(a.source.blobKey, URL.createObjectURL(blob));
    }
}
window.addEventListener('resize', () => {
  if (!gesture) render();
});
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'Delete' &&
    selected &&
    !host.hidden &&
    !document.querySelector('dialog[open]') &&
    !(
      e.target instanceof Element &&
      e.target.closest('input,textarea,select,[contenteditable]')
    )
  ) {
    e.preventDefault();
    void deleteEverywhere(selected);
    return;
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key === 'z' &&
    !(
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
  ) {
    e.preventDefault();
    if (e.shiftKey) history.redo();
    else history.undo();
    render();
    autosave();
  }
  if (e.key === 'Escape')
    document.querySelector<HTMLButtonElement>('.lab-exit')?.click();
});
try {
  const saved = await storage.read('documents', 'draft');
  if (saved) {
    try {
      const normalized = normalizeDocument(saved);
      await loadAssets(normalized);
      history = new History(normalized, measureText);
    } catch (e) {
      await storage.preserveCorrupt(saved);
      message(
        'Saved draft could not load; recovery copy preserved. ' + String(e),
      );
    }
  }
  $('#lab-status').textContent = reviewCopy
    ? 'Review copy - not saved'
    : 'Saved locally';
} catch (e) {
  saveBlocked = true;
  $('#lab-status').textContent = 'Storage unavailable — use JSON export';
  error(e);
}
render();
