import { escape as e, richText } from '../../../src/composer/render.js';
import type { ContentBlock } from '../../../src/composer/schema.js';
import { defaultAppearance, label, type Project } from './model.js';

const paths: Record<string, string> = {
  back: '<path d="m14 6-6 6 6 6M8 12h12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 5 5 3-3 4 4"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
  phone:
    '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  tablet:
    '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/>',
  desktop:
    '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4M7 21h10"/>',
  undo: '<path d="M8 4 3 9l5 5M3 9h11a7 7 0 0 1 0 14" transform="translate(0 -2)"/>',
  redo: '<path d="m16 4 5 5-5 5M21 9H10a7 7 0 0 0 0 14" transform="translate(0 -2)"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  hidden:
    '<path d="m3 3 18 18M9 5a12 12 0 0 1 13 7 19 19 0 0 1-4 5M6 6a21 21 0 0 0-4 6s4 7 10 7a11 11 0 0 0 4-1"/>',
  drag: '<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  up: '<path d="m5 14 7-7 7 7"/>',
  down: '<path d="m5 10 7 7 7-7"/>',
  close: '<path d="M6 6L18 18M6 18L18 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  expand: '<path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6"/>',
  type: '<path d="M3 5V3h18v2M12 3v18M8 21h8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2M12 17v1"/>',
  palette:
    '<circle cx="12" cy="12" r="9"/><path d="M12 3c-5 7 5 6 2 12s-6 4-7 3"/>',
  canvas:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18M8 8v13"/>',
};
export const icon = (name: string) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.type}</svg>`;
export function art(kind = 'orbit') {
  const shape =
    kind === 'arch'
      ? '<rect width="500" height="560" fill="#d9e3cf"/><path d="M90 510V245a160 160 0 0 1 320 0v265Z" fill="#3e5b48"/><path d="M165 510V250a85 85 0 0 1 170 0v260Z" fill="#efd8bc"/><circle cx="350" cy="145" r="70" fill="#de653d"/><path d="M0 510h500v50H0Z" fill="#bdcbaa"/>'
      : kind === 'wave'
        ? '<rect width="500" height="560" fill="#e9cfc0"/><path d="M-50 80Q180 400 550 0v200Q220 570-50 240Z" fill="#68444d"/><path d="M-50 270Q180 590 550 190v150Q220 710-50 440Z" fill="#ef894f"/><circle cx="385" cy="435" r="73" fill="#f5e8bf"/>'
        : '<rect width="500" height="560" fill="#ddd5ef"/><ellipse cx="257" cy="487" rx="164" ry="24" fill="#3b245d" opacity=".12"/><circle cx="258" cy="265" r="164" fill="#7460a7"/><circle cx="258" cy="265" r="93" fill="#ddd5ef"/><path d="M94 265a164 164 0 0 0 328 0h-71a93 93 0 0 1-186 0Z" fill="#554282"/><circle cx="180" cy="372" r="101" fill="#ee8257"/><path d="M79 372a101 101 0 0 0 202 0Z" fill="#ce6646"/><circle cx="360" cy="140" r="50" fill="#f8e9c8"/>';
  return `<svg class="artwork" viewBox="0 0 500 560" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Bundled abstract ${kind} sample artwork">${shape}</svg>`;
}
export function thumbnail(type: string) {
  return `<div class="thumbnail thumb-${type}" aria-hidden="true">${type === 'hero' || type === 'media' ? `<div class="mini-copy"><i></i><b></b><b></b><i></i></div><div class="mini-art">${art('orbit')}</div>` : type === 'cta' || type === 'offer' ? '<b></b><i></i><span></span>' : type === 'benefits' || type === 'testimonials' ? '<b></b><div class="mini-cols"><i></i><i></i><i></i></div>' : '<b></b><i></i><i></i><i></i>'}</div>`;
}
export function canvasHtml(
  project: Project,
  selected: string | null,
  preview: boolean,
) {
  const editable = (
    block: ContentBlock,
    field: string,
    text: string,
    tag = 'p',
    css = '',
  ) =>
    `<${tag} class="editable ${css}" ${preview ? '' : `contenteditable="plaintext-only" role="textbox" aria-label="${e(label(block.type))} ${e(field)}" spellcheck="true" data-field="${e(field)}"`} data-placeholder="Add ${e(field)}">${e(text)}</${tag}>`;
  const media = (id: string, kind: string, alt: string) =>
    `<div class="visual">${art(kind)}${preview ? '' : `<button class="replace" data-action="media" data-id="${id}">${icon('image')} Replace sample image</button>`}<span class="sample-label">Sample artwork</span><span class="sr-only">${e(alt)}</span></div>`;
  const render = (b: ContentBlock) => {
    const appearance = project.appearance[b.id] || defaultAppearance();
    switch (b.type) {
      case 'brand':
        return `<div class="brand-name">${b.data.logo ? '<span class="brand-emblem" aria-hidden="true">✳</span>' : ''}${editable(b, 'name', b.data.name, 'strong')}</div>${editable(b, 'tagline', b.data.tagline, 'span', 'brand-tagline')}`;
      case 'hero':
        return `<div class="hero-grid"><div class="hero-copy">${editable(b, 'eyebrow', b.data.eyebrow, 'p', 'eyebrow')}${editable(b, 'headline', b.data.headline, 'h1')}${editable(b, 'description', b.data.description, 'p', 'lead')}</div>${b.data.visual !== 'none' ? media(b.id, appearance.art, b.data.alt) : ''}</div>`;
      case 'cta':
        return `<div class="cta-copy">${editable(b, 'heading', b.data.heading, 'h2')}${editable(b, 'description', b.data.description)}</div><div class="campaign-button">${editable(b, 'label', b.data.label, 'span')}${icon('arrow')}</div>`;
      case 'information':
        return `${editable(b, 'heading', b.data.heading, 'h2')}<div class="story-body" ${preview ? '' : `data-action="properties" data-id="${b.id}"`}>${richText(b.data.body)}</div>`;
      case 'benefits':
        return `${editable(b, 'heading', b.data.heading, 'h2')}<div class="benefit-grid">${b.data.items.map((item, i) => `<article><span class="number">0${i + 1}</span>${editable(b, `items.${i}.title`, item.title, 'h3')}${editable(b, `items.${i}.description`, item.description)}</article>`).join('')}</div>`;
      case 'event':
        return `<div>${editable(b, 'heading', b.data.heading, 'h2')}<p class="date">${e(b.data.startsAt.replace('T', ' · '))} <span>${e(b.data.timezone)}</span></p></div><div>${editable(b, 'venue', b.data.venue, 'h3')}${editable(b, 'address', b.data.address)}</div>`;
      case 'offer':
        return `${editable(b, 'heading', b.data.heading, 'h2')}${editable(b, 'price', b.data.price, 'strong', 'price')}${editable(b, 'description', b.data.description)}${editable(b, 'terms', b.data.terms, 'small')}`;
      case 'testimonials':
        return `${editable(b, 'heading', b.data.heading, 'h2')}${b.data.items.map((item, i) => `<blockquote>${editable(b, `items.${i}.quote`, item.quote, 'p')}${editable(b, `items.${i}.author`, item.author, 'strong')}${editable(b, `items.${i}.source`, item.source, 'small')}</blockquote>`).join('')}`;
      case 'media':
        return `${editable(b, 'heading', b.data.heading, 'h2')}<div class="gallery">${b.data.items.map((item) => media(b.id, appearance.art, item.alt)).join('')}</div>`;
      case 'actions':
        return `${editable(b, 'heading', b.data.heading, 'h2')}<div class="links">${b.data.items.map((item, i) => `<span class="campaign-button">${editable(b, `items.${i}.label`, item.label, 'span')}${icon('arrow')}</span>`).join('')}</div>`;
      case 'contact':
        return `${editable(b, 'name', b.data.name, 'h2')}${editable(b, 'email', b.data.email)}${editable(b, 'phone', b.data.phone)}${editable(b, 'address', b.data.address)}`;
      case 'footer':
        return `${editable(b, 'identity', b.data.identity)}${editable(b, 'note', b.data.note, 'small')}`;
    }
  };
  const insertion = (id: string | null) =>
    preview
      ? ''
      : `<div class="insertion" data-before="${id || ''}"><button data-action="insert" data-before="${id || ''}" aria-label="Add a block ${id ? `before ${e(label(project.document.blocks.find((b) => b.id === id)!.type))}` : 'at the end'}">${icon('plus')}</button></div>`;
  return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/canvas.css"><style>:root{--accent:${/^#[0-9a-f]{6}$/i.test(project.document.theme.accent) ? project.document.theme.accent : '#5743ad'}}</style></head><body class="${preview ? 'preview' : 'editing'}" data-font="${project.document.theme.typography}" data-corners="${project.document.theme.corners}"><main aria-label="Campaign canvas">${project.document.blocks
    .filter((b) => !preview || b.enabled)
    .map((b) => {
      const a = project.appearance[b.id] || defaultAppearance();
      return `${insertion(b.id)}<section tabindex="${preview ? '-1' : '0'}" aria-label="${e(label(b.type))} section" data-id="${b.id}" data-type="${b.type}" data-layout="${a.layout}" data-tone="${a.tone}" data-spacing="${a.spacing}" class="section section-${b.type} ${selected === b.id && !preview ? 'selected' : ''} ${b.enabled ? '' : 'hidden-block'}">${preview ? '' : `<div class="section-tools"><span>${e(label(b.type))}${b.enabled ? '' : ' · Hidden'}</span><button data-action="drag" data-id="${b.id}" aria-label="Drag ${e(label(b.type))}" title="Drag to reorder. Alt + arrow keys also work." class="drag-handle">${icon('drag')}</button><button data-action="duplicate" data-id="${b.id}" aria-label="Duplicate ${e(label(b.type))}" title="Duplicate">${icon('copy')}</button><button data-action="visibility" data-id="${b.id}" aria-label="${b.enabled ? 'Hide' : 'Show'} ${e(label(b.type))}" title="${b.enabled ? 'Hide' : 'Show'}">${icon(b.enabled ? 'eye' : 'hidden')}</button><button data-action="delete" data-id="${b.id}" aria-label="Delete ${e(label(b.type))}" title="Delete">${icon('trash')}</button></div>`}<div class="block-body">${render(b)}</div></section>`;
    })
    .join(
      '',
    )}${insertion(null)}${project.document.blocks.length ? '' : `<div class="empty-canvas"><div class="empty-symbol">${icon('plus')}</div><h1>Your story starts here.</h1><p>Add a Hero to make your first impression.</p><button data-action="add-hero" class="empty-add">${icon('plus')} Add a Hero</button><button data-action="open-library" class="empty-secondary">Explore all blocks</button></div>`}</main></body></html>`;
}
