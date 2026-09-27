import { documentSchema, type CampaignDocument } from './schema.js';

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
function renderBlock(block: CampaignDocument['blocks'][number]): string {
  return `<div class="shared-visual-preview"></div><script type="application/json" data-visual-document>${JSON.stringify(block.data).replaceAll('<', '\\u003c')}</script>`;
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
  }</main>${`<link rel="stylesheet" href="${escape(cssUrl.startsWith('http') ? new URL('/assets/visual-preview.css', cssUrl).href : '/assets/visual-preview.css')}"><script type="module" src="${escape(cssUrl.startsWith('http') ? new URL('/assets/visual-preview.js', cssUrl).href : '/assets/visual-preview.js')}"></script>`}<div class="preview-note">Private draft preview · Links are inactive · Nothing is published</div></body></html>`;
}
