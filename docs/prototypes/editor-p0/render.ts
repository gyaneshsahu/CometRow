import {
  assets,
  resolved,
  destination,
  actionError,
  zonedTime,
  type Project,
  type Node,
  type Device,
} from './model.js';
export const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export function artwork(id: string) {
  const a = assets.find((a) => a.id === id) || assets[0]!;
  return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="800" height="600" fill="#edf2f3"/><circle cx="400" cy="300" r="210" fill="${a.color}"/><path d="M400 90v420M190 300h420" stroke="#fff" stroke-width="40"/><circle cx="610" cy="110" r="72" fill="#172338"/><rect x="72" y="408" width="140" height="140" rx="32" fill="#fff"/></svg>`;
}
const editable = (key: string, value: unknown, tag = 'span') =>
  `<${tag} data-content="${key}">${escape(value)}</${tag}>`;
export function contentHtml(n: Node, p: Project, preview: boolean): string {
  if (n.kind !== 'element') return '';
  const c = n.content;
  const t = (key: string, tag = 'span') => editable(key, c[key], tag);
  const link = (inner: string, className = '') =>
    n.action.kind !== 'none' && !actionError(n.action, p)
      ? `<a class="${className}" href="${escape(destination(n.action))}" ${n.action.newTab && ['url', 'maps', 'whatsapp'].includes(n.action.kind) ? 'target="_blank" rel="noopener noreferrer"' : ''} ${n.action.label ? `aria-label="${escape(n.action.label)}"` : ''}>${inner}</a>`
      : `<span class="${className}">${inner}</span>`;
  switch (n.type) {
    case 'heading':
      return link(
        t('text', /^h[1-6]$/.test(String(c.level)) ? String(c.level) : 'h2'),
      );
    case 'text':
    case 'eyebrow':
    case 'logo':
      return link(t('text', 'p'));
    case 'button':
      return link(t('text'), `campaign-button variant-${n.style.variant}`);
    case 'image':
      return `<figure><div class="image-box" role="${c.decorative ? 'presentation' : 'img'}" ${c.decorative ? 'aria-hidden="true"' : `aria-label="${escape(c.alt)}"`} style="aspect-ratio:${['1/1', '4/3', '3/4', '16/9'].includes(String(c.ratio)) ? c.ratio : '4/3'};--fit:${c.fit === 'contain' ? 'contain' : 'cover'};--fx:${Math.max(0, Math.min(100, Number(c.focalX)))}%;--fy:${Math.max(0, Math.min(100, Number(c.focalY)))}%">${link(`<img alt="" aria-hidden="true" src="data:image/svg+xml,${encodeURIComponent(artwork(String(c.asset)))}">`)}</div>${c.caption ? t('caption', 'figcaption') : ''}</figure>`;
    case 'price':
      return `${t('label', 'p')}<div class="price">${t('currency')} ${t('amount')} ${c.compare ? `<del>${t('compare')}</del>` : ''}</div>${t('unit', 'small')}${t('description', 'p')}${t('terms', 'small')}`;
    case 'coupon':
      return `${t('label', 'h3')}<div class="coupon-line">${t('code', 'strong')}<button type="button" data-copy="${escape(c.code)}" data-copied="${escape(c.copied)}">${t('button')}</button></div>${c.expiry ? t('expiry', 'small') : ''}${t('terms', 'p')}`;
    case 'countdown': {
      let remaining = 0;
      try {
        remaining = Math.max(
          0,
          zonedTime(String(c.target), String(c.timezone)) - Date.now(),
        );
      } catch {
        /* Validation stays in inspector. */
      }
      return `${t('text', 'p')}${remaining ? `<strong class="countdown" aria-label="Time remaining">${Math.floor(remaining / 86400000)}d ${Math.floor(remaining / 3600000) % 24}h ${Math.floor(remaining / 60000) % 60}m</strong>` : t('expired', 'strong')}<small>${t('target')} · ${t('timezone')}</small>`;
    }
    case 'quote':
      return `<blockquote>${t('text', 'p')}<footer>${t('author', 'strong')}${t('source', 'small')}</footer></blockquote>`;
    case 'feature':
      return `${t('title', 'h3')}${t('text', 'p')}`;
    case 'faq':
      return `<details ${c.open ? 'open' : ''}><summary>${t('question')}</summary>${t('answer', 'p')}</details>`;
    case 'contact':
      return `${t('label', 'strong')}${link(t('text', 'p'))}`;
    case 'event':
      return `${t('title', 'h2')}<p>${t('start')} – ${t('end')}</p>${t('timezone', 'small')}${t('venue', 'strong')}${t('address', 'p')}`;
    case 'form':
      return `${t('title', 'h2')}${t('description', 'p')}`;
    case 'field':
      return `<label>${t('label')} ${c.required ? '<span aria-hidden="true">*</span>' : ''}<input type="${['email', 'tel', 'text'].includes(String(c.fieldType)) ? c.fieldType : 'text'}" placeholder="${escape(c.placeholder)}" disabled aria-label="${escape(c.label)} — form design preview">${t('help', 'small')}</label>`;
    case 'divider':
      return '<hr>';
    case 'spacer':
      return `<div style="height:${Math.max(8, Math.min(120, Number(c.height) || 24))}px" ${preview ? '' : 'class="spacer-guide" aria-label="Spacer"'}></div>`;
    case 'legacy-value':
      return t('value', 'p');
    default:
      return '';
  }
}
export function nodeHtml(
  p: Project,
  id: string,
  device: Device,
  preview = false,
): string {
  const n = p.nodes[id]!;
  if (!n.visible && preview) return '';
  const { layout: l, style: s } = resolved(n, device);
  const textSize =
    device === 'phone' && !n.overrides.phone?.style?.size
      ? Math.min(s.size, 38)
      : s.size;
  const palette =
    s.tone === 'dark'
      ? 'background:#172338;color:#fff;'
      : s.tone === 'soft'
        ? 'background:#f1f4f5;'
        : s.tone === 'accent'
          ? `background:${p.theme.accent};color:#fff;`
          : '';
  const styles = `${palette}${s.background ? `background:${s.background};` : ''}${s.color ? `color:${s.color};` : ''}font-size:${textSize}px;font-weight:${s.weight};font-style:${s.italic ? 'italic' : 'normal'};line-height:${s.lineHeight};letter-spacing:${s.tracking}px;text-align:${s.align};border-radius:${s.radius}px;border:${s.border}px solid currentColor;opacity:${s.opacity / 100};${s.shadow !== 'none' ? `box-shadow:0 ${s.shadow === 'medium' ? 8 : 3}px 20px #17233818;` : ''}padding:${device === 'phone' ? Math.min(l.padding, 28) : l.padding}px;gap:${l.gap}px;max-width:${l.maxWidth}px;width:${l.width === 0 ? 'fit-content' : `${l.width}%`};align-self:${l.align};--content-width:${l.maxWidth}px;--gap:${l.gap}px;--columns:${l.columns};--split:${l.split}%;--align:${l.align};--justify:${l.justify};--reverse:${l.reverse ? 'column-reverse' : 'column'};`;
  const children = (l.reverse ? [...n.children].reverse() : n.children)
    .map((child) => nodeHtml(p, child, device, preview))
    .join('');
  const tag =
    n.kind === 'page' ? 'main' : n.kind === 'section' ? 'section' : 'div';
  const empty =
    !preview && n.kind !== 'element' && !n.children.length
      ? `<button class="empty-node" data-add-here="${n.id}">＋ ${n.kind === 'page' ? 'Add your first section' : 'Add an element here'}</button>`
      : '';
  const formFooter =
    n.type === 'form' && n.kind === 'element'
      ? `<div class="form-footer">${editable('privacy', n.content.privacy, 'p')}<button ${preview ? 'disabled' : 'type="button" aria-disabled="true"'}>${editable('submit', n.content.submit)}</button><small>Design preview only. No information is collected.</small></div>`
      : '';
  const decoration =
    !preview && n.kind !== 'page'
      ? `<button class="canvas-drag" data-drag="${n.id}" aria-label="Drag ${escape(n.name)}" title="Drag to move. Alt + Up/Down also moves this item.">⠿ Move</button>`
      : '';
  return `<${tag} id="${n.id}" data-node="${n.id}" data-kind="${n.kind}" data-type="${n.type}" data-display="${l.display}" data-anchor="${escape(l.anchor)}" class="node ${n.visible ? '' : 'node-hidden'}" style="${styles}" ${preview ? '' : `tabindex="0" aria-label="${escape(n.name)} · ${n.kind}"`}>${decoration}<div class="node-content">${contentHtml(n, p, preview)}</div><div class="node-children">${children}${empty}</div>${formFooter}</${tag}>`;
}
export function canvasHtml(
  p: Project,
  device: Device,
  preview = false,
): string {
  return `<!doctype html><html lang="${escape(p.nodes[p.root]!.content.language || 'en')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/canvas.css"><style>:root{--campaign-accent:${p.theme.accent};--campaign-radius:${p.theme.corners === 'square' ? 0 : 8}px}body{font-family:${p.theme.typography === 'editorial' ? 'Georgia,serif' : 'Inter,ui-sans-serif,system-ui,sans-serif'};background:${p.theme.preset === 'midnight' ? '#172338;color:#fff' : p.theme.preset === 'sage' ? '#f0f4ef' : '#fff'}}</style></head><body class="${preview ? 'preview' : 'editing'}">${nodeHtml(p, p.root, device, preview)}</body></html>`;
}
