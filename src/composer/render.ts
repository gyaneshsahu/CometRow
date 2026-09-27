import {
  documentSchema,
  type CampaignDocument,
  type ContentBlock,
} from './schema.js';

export const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
export function accentText(color: string) {
  const rgb = [1, 3, 5]
    .map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  const luminance = rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  return (luminance + 0.05) / 0.05 >= 4.5 ? '#000000' : '#ffffff';
}
const title = (value: string) => (value ? `<h2>${escape(value)}</h2>` : '');
const paragraph = (value: string) =>
  value ? `<p>${escape(value).replaceAll('\n', '<br>')}</p>` : '';
const action = (label: string, primary = false) =>
  label
    ? `<button type="button" disabled class="${primary ? 'primary-action' : 'secondary-action'}" title="Links are inactive in this private preview">${escape(label)} <span aria-hidden="true">↗</span></button>`
    : '';
export function richText(value: string) {
  const inline = (line: string) =>
    escape(line)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return value
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((part) =>
      part.split('\n').every((line) => line.startsWith('- '))
        ? `<ul>${part
            .split('\n')
            .map((line) => `<li>${inline(line.slice(2))}</li>`)
            .join('')}</ul>`
        : `<p>${inline(part).replaceAll('\n', '<br>')}</p>`,
    )
    .join('');
}
const slot = (kind: string, ratio: string, alt: string, caption = '') =>
  `<figure><div class="media-slot ${ratio}" role="img" aria-label="${escape(alt || `${kind} placeholder`)}"><span aria-hidden="true">${kind === 'video' ? '▷' : '▧'}</span><strong>${kind === 'video' ? 'Video' : 'Image'} placeholder</strong><small>${escape(alt || 'Your media will appear here')}</small></div>${caption ? `<figcaption>${escape(caption)}</figcaption>` : ''}</figure>`;

function renderBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'visual-section':
      return `<div class="shared-visual-preview"></div><script type="application/json" data-visual-document>${JSON.stringify(block.data).replaceAll('<', '\\u003c')}</script>`;
    case 'brand':
      return `<div class="brand-row">${block.data.logo ? `<span class="logo-slot" aria-label="Logo placeholder">${escape(block.data.name.slice(0, 2).toUpperCase() || '◇')}</span>` : ''}<div><strong>${escape(block.data.name || 'Your brand')}</strong>${paragraph(block.data.tagline)}</div></div>`;
    case 'hero':
      return `<div class="hero-layout ${block.data.visual !== 'none' ? 'with-visual' : ''}"><div>${block.data.eyebrow ? `<p class="eyebrow">${escape(block.data.eyebrow)}</p>` : ''}<h1>${escape(block.data.headline || 'Your story starts here.')}</h1>${paragraph(block.data.description)}</div>${block.data.visual !== 'none' ? slot(block.data.visual, block.data.ratio, block.data.alt) : ''}</div>`;
    case 'media':
      return `${title(block.data.heading)}<div class="gallery">${block.data.items.map((item) => slot(item.kind, item.ratio, item.alt, item.caption)).join('')}</div>${block.data.items.length ? '' : '<p class="placeholder-copy">Add media slots to plan your gallery.</p>'}`;
    case 'information':
      return `${title(block.data.heading)}<div class="prose">${richText(block.data.body)}</div>`;
    case 'benefits':
      return `${title(block.data.heading)}<div class="benefits">${block.data.items.map((item, i) => `<article><span class="detail-number">${String(i + 1).padStart(2, '0')}</span><h3>${escape(item.title)}</h3>${paragraph(item.description)}</article>`).join('')}</div>`;
    case 'event':
      return `${title(block.data.heading)}<div class="event-grid">${block.data.startsAt ? `<div><span class="eyebrow">WHEN</span><p><time datetime="${block.data.startsAt}">${escape(block.data.startsAt.replace('T', ' · '))}</time>${block.data.endsAt ? `<br>Until ${escape(block.data.endsAt.replace('T', ' · '))}` : ''}<br><small>${escape(block.data.timezone)}</small></p></div>` : ''}<div><span class="eyebrow">WHERE</span><h3>${escape(block.data.venue)}</h3>${paragraph(block.data.address)}${block.data.mapUrl ? action('Get directions') : ''}</div></div>`;
    case 'offer':
      return `${title(block.data.heading)}<div class="offer-card"><strong class="price">${escape(block.data.price)}</strong>${paragraph(block.data.description)}${block.data.code ? `<p class="coupon">Use code <strong>${escape(block.data.code)}</strong></p>` : ''}${block.data.terms ? `<small>${escape(block.data.terms)}</small>` : ''}</div>`;
    case 'testimonials':
      return `${title(block.data.heading)}<div class="quotes">${block.data.items.map((item) => `<blockquote><span aria-hidden="true">“</span><p>${escape(item.quote)}</p><footer><strong>${escape(item.author)}</strong>${item.source ? `<cite>${escape(item.source)}</cite>` : ''}</footer></blockquote>`).join('')}</div>`;
    case 'cta':
      return `<div class="cta-card">${title(block.data.heading)}${paragraph(block.data.description)}${action(block.data.label || 'Your next step', true)}</div>`;
    case 'actions':
      return `${title(block.data.heading)}<div class="action-list">${block.data.items.map((item) => action(item.label)).join('')}</div>`;
    case 'contact':
      return `${title(block.data.name)}<address>${paragraph(block.data.address)}${block.data.email ? paragraph(block.data.email) : ''}${block.data.phone ? paragraph(block.data.phone) : ''}${block.data.website ? action('Visit website') : ''}</address>`;
    case 'footer':
      return `<div class="campaign-footer">${paragraph(block.data.identity)}<div class="legal-links">${block.data.legalLinks.map((item) => action(item.label)).join('')}${action('Report campaign')}</div>${paragraph(block.data.note)}</div>`;
  }
}
export function renderDocument(
  raw: CampaignDocument,
  nonce: string,
  titleText = 'Campaign preview',
  cssUrl = '/campaign-preview.css',
) {
  const doc = documentSchema.parse(raw);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(titleText)} · Private preview</title><link rel="stylesheet" href="${escape(cssUrl)}"><style nonce="${escape(nonce)}">:root{--accent:${doc.theme.accent};--on-accent:${accentText(doc.theme.accent)}}</style></head><body data-theme="${doc.theme.preset}" data-font="${doc.theme.typography}" data-corners="${doc.theme.corners}"><main class="campaign-page">${
    doc.blocks
      .filter((block) => block.enabled)
      .map(
        (block) =>
          `<section class="block block-${block.type}" id="block-${block.id}">${renderBlock(block)}</section>`,
      )
      .join('') ||
    '<div class="empty-campaign"><span aria-hidden="true">✳</span><h1>A little space.<br>A lot of possibility.</h1><p>Add your first block to start telling your story.</p></div>'
  }</main>${doc.schemaVersion === 2 ? `<link rel="stylesheet" href="${escape(cssUrl.startsWith('http') ? new URL('/assets/visual-preview.css', cssUrl).href : '/assets/visual-preview.css')}"><script type="module" src="${escape(cssUrl.startsWith('http') ? new URL('/assets/visual-preview.js', cssUrl).href : '/assets/visual-preview.js')}"></script>` : ''}<div class="preview-note">Private draft preview · Links are inactive · Nothing is published</div></body></html>`;
}
