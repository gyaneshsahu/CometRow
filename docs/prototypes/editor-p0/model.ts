import {
  documentSchema,
  type CampaignDocument,
} from '../../../src/composer/schema.js';

export type Kind = 'page' | 'section' | 'container' | 'element';
export type Device = 'phone' | 'tablet' | 'desktop';
export type Action = {
  kind: 'none' | 'url' | 'section' | 'phone' | 'email' | 'whatsapp' | 'maps';
  value: string;
  newTab: boolean;
  label: string;
};
export type Layout = {
  display: 'stack' | 'row' | 'grid' | 'overlay';
  columns: number;
  split: number;
  gap: number;
  padding: number;
  maxWidth: number;
  width: number;
  align: 'start' | 'center' | 'end' | 'stretch';
  justify: 'start' | 'center' | 'end' | 'space-between';
  reverse: boolean;
  anchor: string;
};
export type Style = {
  tone: 'page' | 'soft' | 'dark' | 'accent';
  size: number;
  weight: number;
  italic: boolean;
  lineHeight: number;
  tracking: number;
  color: string;
  background: string;
  radius: number;
  border: number;
  shadow: 'none' | 'subtle' | 'medium';
  opacity: number;
  align: 'left' | 'center' | 'right';
  variant: 'primary' | 'secondary' | 'text';
};
export type Node = {
  id: string;
  schemaVersion: 1;
  kind: Kind;
  type: string;
  name: string;
  parent: string | null;
  children: string[];
  content: Record<string, string | number | boolean>;
  layout: Layout;
  style: Style;
  overrides: Partial<
    Record<
      'phone' | 'tablet',
      { layout?: Partial<Layout>; style?: Partial<Style> }
    >
  >;
  action: Action;
  visible: boolean;
};
export type Project = {
  schemaVersion: 2;
  root: string;
  nodes: Record<string, Node>;
  theme: {
    preset: 'paper' | 'sage' | 'midnight';
    accent: string;
    typography: 'modern' | 'editorial';
    corners: 'soft' | 'square';
  };
  sourceV1?: CampaignDocument;
};
export type Bundle = { root: string; nodes: Record<string, Node> };
export type Command =
  | { type: 'add'; parent: string; bundle: Bundle; index?: number }
  | { type: 'move'; id: string; parent: string; index: number }
  | { type: 'content'; id: string; patch: Node['content'] }
  | { type: 'name'; id: string; value: string }
  | {
      type: 'layout';
      id: string;
      patch: Partial<Layout>;
      device?: 'phone' | 'tablet';
    }
  | {
      type: 'style';
      id: string;
      patch: Partial<Style>;
      device?: 'phone' | 'tablet';
    }
  | { type: 'reset'; id: string; device?: 'phone' | 'tablet' }
  | { type: 'action'; id: string; action: Action }
  | { type: 'theme'; patch: Partial<Project['theme']> }
  | { type: 'duplicate' | 'delete' | 'visibility'; id: string }
  | { type: 'apply-layout'; id: string; layout: string }
  | { type: 'replace'; document: Project };
export const defaultLayout = (): Layout => ({
  display: 'stack',
  columns: 1,
  split: 50,
  gap: 20,
  padding: 0,
  maxWidth: 1120,
  width: 100,
  align: 'stretch',
  justify: 'start',
  reverse: false,
  anchor: 'center',
});
export const defaultStyle = (): Style => ({
  tone: 'page',
  size: 16,
  weight: 400,
  italic: false,
  lineHeight: 1.5,
  tracking: 0,
  color: '',
  background: '',
  radius: 0,
  border: 0,
  shadow: 'none',
  opacity: 100,
  align: 'left',
  variant: 'primary',
});
export const anchors = [
  'top left',
  'top center',
  'top right',
  'center left',
  'center',
  'center right',
  'bottom left',
  'bottom center',
  'bottom right',
];
export const layouts = [
  ['single', 'Single column', 'A clear vertical reading order'],
  ['split', 'Two columns · 50/50', 'Balanced content side by side'],
  ['wide-left', 'Two columns · 60/40', 'Give the first column more room'],
  ['wide-right', 'Two columns · 40/60', 'Give the second column more room'],
  ['three', 'Three columns', 'Features, comparisons and proof'],
  ['narrow', 'Centered narrow', 'Focused copy with a comfortable measure'],
  ['grid', 'Card grid', 'Responsive cards in three columns'],
  ['overlay', 'Hero overlay', 'Contained background and anchored foreground'],
] as const;
export const assets = [
  {
    id: 'sample-studio',
    name: 'Studio forms',
    filename: 'studio-forms.svg',
    mime: 'image/svg+xml',
    width: 800,
    height: 600,
    bytes: 476,
    state: 'bundled sample',
    scope: 'review workspace',
    alt: 'Blue geometric forms on a pale background',
    color: '#315ad8',
  },
  {
    id: 'sample-sun',
    name: 'Warm shapes',
    filename: 'warm-shapes.svg',
    mime: 'image/svg+xml',
    width: 800,
    height: 600,
    bytes: 476,
    state: 'bundled sample',
    scope: 'review workspace',
    alt: 'Warm circular forms on a pale background',
    color: '#b65b32',
  },
  {
    id: 'sample-leaf',
    name: 'Garden forms',
    filename: 'garden-forms.svg',
    mime: 'image/svg+xml',
    width: 800,
    height: 600,
    bytes: 476,
    state: 'bundled sample',
    scope: 'review workspace',
    alt: 'Green geometric forms on a pale background',
    color: '#35624a',
  },
];
export const node = (
  kind: Kind,
  type: string,
  name: string,
  content: Node['content'] = {},
): Node => ({
  id: crypto.randomUUID(),
  schemaVersion: 1,
  kind,
  type,
  name,
  parent: null,
  children: [],
  content,
  layout: defaultLayout(),
  style: defaultStyle(),
  overrides: {},
  action: { kind: 'none', value: '', newTab: false, label: '' },
  visible: true,
});
function attach(nodes: Record<string, Node>, parent: Node, child: Node) {
  child.parent = parent.id;
  parent.children.push(child.id);
  nodes[child.id] = child;
  return child;
}
export function blank(name = 'Untitled campaign'): Project {
  const page = node('page', 'page', name, { language: 'en' });
  page.layout.padding = 0;
  return {
    schemaVersion: 2,
    root: page.id,
    nodes: { [page.id]: page },
    theme: {
      preset: 'paper',
      accent: '#315ad8',
      typography: 'modern',
      corners: 'soft',
    },
  };
}
export const elements = [
  ['heading', 'Heading', 'A clear headline', 'Text', 'title headline'],
  ['text', 'Paragraph', 'Tell your story', 'Text', 'body rich text'],
  ['eyebrow', 'Eyebrow', 'A short introduction', 'Text', 'overline badge'],
  [
    'button',
    'Button',
    'Give visitors a next step',
    'Actions',
    'link shop call email whatsapp maps',
  ],
  ['image', 'Image', 'Place a labelled sample asset', 'Media', 'picture photo'],
  ['logo', 'Logo', 'Your campaign identity', 'Media', 'brand sponsor'],
  [
    'price',
    'Price',
    'An honest price and optional comparison',
    'Conversion',
    'offer cost',
  ],
  [
    'coupon',
    'Coupon',
    'A code visitors can copy',
    'Conversion',
    'discount promo',
  ],
  [
    'countdown',
    'Countdown',
    'A real date and timezone',
    'Conversion',
    'timer event',
  ],
  [
    'form',
    'Form UI',
    'Design fields; no data submission',
    'Conversion',
    'signup newsletter rsvp booking lead capture',
  ],
  ['quote', 'Testimonial', 'Quote with its attribution', 'Proof', 'review'],
  [
    'feature',
    'Feature item',
    'Title and supporting copy',
    'Proof',
    'benefit trust statistic',
  ],
  ['faq', 'FAQ item', 'A question and answer', 'Proof', 'accordion help'],
  [
    'contact',
    'Contact detail',
    'A labelled contact method',
    'Information',
    'email phone address hours location',
  ],
  [
    'event',
    'Event details',
    'Date, timezone and venue',
    'Information',
    'date location',
  ],
  ['divider', 'Divider', 'A quiet dividing line', 'Structure', 'separator'],
  ['spacer', 'Spacer', 'Adjustable breathing room', 'Structure', 'space'],
  [
    'container',
    'Container',
    'Group and arrange elements',
    'Structure',
    'columns grid stack row',
  ],
] as const;
export function element(type: string): Node {
  const title = elements.find((e) => e[0] === type)?.[1] || type;
  const contents: Record<string, Node['content']> = {
    heading: { text: 'Make room for your next idea.', level: 'h1' },
    text: {
      text: 'A considered experience, created for curious people. Make this story your own.',
    },
    eyebrow: { text: 'SOMETHING GOOD STARTS HERE' },
    button: { text: 'Discover more' },
    logo: { text: 'fieldnotes' },
    image: {
      asset: assets[0]!.id,
      alt: assets[0]!.alt,
      decorative: false,
      caption: '',
      ratio: '4/3',
      fit: 'cover',
      focalX: 50,
      focalY: 50,
    },
    price: {
      label: 'A little investment in yourself',
      currency: 'EUR',
      amount: '35',
      compare: '',
      unit: 'per person',
      description: 'Materials and refreshments included.',
      terms: 'All taxes included.',
    },
    coupon: {
      label: 'A little welcome gift',
      code: 'HELLO10',
      button: 'Copy code',
      copied: 'Code copied',
      expiry: '',
      terms: 'Illustrative offer. Add your own terms.',
    },
    countdown: {
      text: 'We begin in',
      target: '2026-10-17T14:00',
      timezone: 'Europe/Berlin',
      expired: 'This event has started.',
      after: 'message',
    },
    form: {
      title: 'Save your place',
      description: 'Form design preview · submissions are not connected.',
      submit: 'Reserve my place',
      privacy: 'Your details are used only for this event.',
      privacyUrl: 'https://example.com/privacy',
      success: 'Thank you for your interest.',
      error: 'Please check the highlighted fields.',
    },
    quote: {
      text: 'I came for a workshop and left with a new perspective.',
      author: 'Alex M.',
      source: 'Illustrative quote · replace with a genuine review',
    },
    feature: {
      title: 'Room to explore',
      text: 'Good materials, open minds and a fresh perspective.',
    },
    faq: {
      question: 'Do I need any experience?',
      answer: 'No experience needed. Just bring your curiosity.',
      open: false,
    },
    contact: { label: 'Say hello', text: 'hello@example.com' },
    event: {
      title: 'Meet us at the studio',
      start: '2026-10-17T14:00',
      end: '2026-10-17T18:00',
      timezone: 'Europe/Berlin',
      venue: 'Fieldnotes Studio',
      address: '12 Gartenstraße, Berlin',
    },
    spacer: { height: 24 },
    field: {
      label: 'Your email',
      fieldType: 'email',
      help: '',
      placeholder: 'you@example.com',
      required: true,
    },
  };
  const n = node(
    type === 'container' ? 'container' : 'element',
    type,
    title,
    contents[type] || {},
  );
  if (type === 'heading') {
    n.style.size = 44;
    n.style.weight = 650;
    n.style.lineHeight = 1.1;
  }
  if (type === 'eyebrow') {
    n.style.size = 12;
    n.style.weight = 650;
    n.style.tracking = 1;
  }
  if (type === 'logo') {
    n.style.size = 24;
    n.style.weight = 700;
  }
  if (['image', 'button', 'coupon', 'price', 'quote', 'feature'].includes(type))
    n.style.radius = 12;
  if (['coupon', 'price', 'quote', 'feature'].includes(type)) {
    n.style.tone = 'soft';
    n.layout.padding = 24;
  }
  if (type === 'button') {
    n.layout.width = 0;
    n.action = {
      kind: 'url',
      value: 'https://example.com',
      newTab: false,
      label: '',
    };
  }
  return n;
}
export function elementBundle(type: string): Bundle {
  const n = element(type);
  const nodes = { [n.id]: n };
  if (type === 'form') {
    for (const [label, fieldType] of [
      ['Your name', 'text'],
      ['Your email', 'email'],
    ]) {
      const f = element('field');
      f.content.label = label!;
      f.content.fieldType = fieldType!;
      attach(nodes, n, f);
    }
  }
  return { root: n.id, nodes };
}
export const sections = [
  [
    'hero',
    'Split hero',
    'A strong opening with copy and media',
    'Opening',
    'headline introduction',
  ],
  [
    'centered',
    'Centered hero',
    'A focused opening statement',
    'Opening',
    'hero',
  ],
  [
    'brand',
    'Brand introduction',
    'Campaign identity and a short welcome',
    'Framing',
    'logo header',
  ],
  [
    'information',
    'Story',
    'Space for a thoughtful narrative',
    'Opening',
    'rich text paragraph',
  ],
  [
    'benefits',
    'Benefits grid',
    'Three clear reasons to take part',
    'Product',
    'features proof',
  ],
  [
    'offer',
    'Price & offer',
    'Price, coupon and a clear next step',
    'Product',
    'discount product shop',
  ],
  [
    'testimonials',
    'Testimonials',
    'Honest quotes with attribution',
    'Trust',
    'reviews',
  ],
  [
    'faq',
    'Frequently asked questions',
    'Answers that remove hesitation',
    'Trust',
    'faq help',
  ],
  [
    'event',
    'Date & location',
    'Event details and directions',
    'Conversion',
    'maps event countdown',
  ],
  [
    'form',
    'RSVP form UI',
    'Design a sign-up without collecting data',
    'Conversion',
    'newsletter signup booking lead capture',
  ],
  [
    'cta',
    'Call to action',
    'One focused next step',
    'Conversion',
    'button link',
  ],
  [
    'actions',
    'Action links',
    'Useful routes for your visitors',
    'Conversion',
    'social website',
  ],
  [
    'contact',
    'Contact',
    'Make the conversation easy',
    'Framing',
    'email phone address',
  ],
  [
    'footer',
    'Identity & legal',
    'Your identity and useful legal links',
    'Framing',
    'copyright footer',
  ],
  [
    'media',
    'Gallery',
    'A responsive row of sample visuals',
    'Opening',
    'image pictures',
  ],
  [
    'blank',
    'Blank section',
    'An empty space for your composition',
    'Structure',
    'container layout',
  ],
] as const;
export function sectionBundle(type: string): Bundle {
  const root = node(
    'section',
    type,
    sections.find((s) => s[0] === type)?.[1] || type,
  );
  root.layout.padding = 40;
  const nodes: Record<string, Node> = { [root.id]: root };
  const body = attach(nodes, root, node('container', 'container', 'Content'));
  const add = (type: string, parent = body, content: Node['content'] = {}) => {
    const b = elementBundle(type);
    Object.assign(nodes, b.nodes);
    const n = b.nodes[b.root]!;
    Object.assign(n.content, content);
    return attach(nodes, parent, n);
  };
  if (type === 'hero') {
    body.layout.display = 'row';
    body.layout.columns = 2;
    const copy = attach(
      nodes,
      body,
      node('container', 'container', 'Copy column'),
    );
    add('eyebrow', copy, { text: 'OPEN STUDIO · BERLIN' });
    add('heading', copy);
    add('text', copy);
    add('button', copy, { text: 'Explore the studio' });
    const media = attach(
      nodes,
      body,
      node('container', 'container', 'Media column'),
    );
    add('image', media);
  } else if (type === 'centered') {
    body.layout.maxWidth = 720;
    add('eyebrow');
    add('heading');
    add('text');
    add('button');
    Object.values(nodes).forEach((n) => (n.style.align = 'center'));
  } else if (type === 'brand') {
    body.layout.display = 'row';
    body.layout.justify = 'space-between';
    add('logo');
    add('text', body, { text: 'Good ideas start here.' });
    root.layout.padding = 24;
  } else if (type === 'information') {
    add('heading', body, {
      text: 'An afternoon, just for possibility.',
      level: 'h2',
    });
    add('text');
  } else if (
    type === 'benefits' ||
    type === 'testimonials' ||
    type === 'media'
  ) {
    add('heading', body, {
      text:
        type === 'benefits'
          ? 'A little space. A lot of possibility.'
          : type === 'media'
            ? 'A glimpse of what is possible.'
            : 'Leave with more than you came for.',
      level: 'h2',
    });
    const grid = attach(
      nodes,
      body,
      node('container', 'container', 'Responsive grid'),
    );
    grid.layout.display = 'grid';
    grid.layout.columns = 3;
    for (let i = 0; i < 3; i++) {
      const n = add(
        type === 'benefits' ? 'feature' : type === 'media' ? 'image' : 'quote',
        grid,
      );
      if (type === 'benefits')
        n.content.title = [
          'Make something',
          'Meet your people',
          'Leave inspired',
        ][i]!;
      if (type === 'media') n.content.asset = assets[i]!.id;
    }
  } else if (type === 'offer') {
    add('price');
    add('coupon');
    add('button', body, { text: 'Choose your place' });
  } else if (type === 'faq') {
    add('heading', body, {
      text: 'A few things you might wonder.',
      level: 'h2',
    });
    add('faq');
    add('faq', body, {
      question: 'What should I bring?',
      answer: 'Everything you need is included.',
    });
  } else if (type === 'event') {
    add('event');
    const b = add('button', body, { text: 'Get directions' });
    b.action = {
      kind: 'maps',
      value: 'Fieldnotes Studio, Berlin',
      newTab: true,
      label: '',
    };
    add('countdown');
  } else if (type === 'form') add('form');
  else if (type === 'cta') {
    add('heading', body, { text: 'Your next idea is waiting.', level: 'h2' });
    add('text', body, { text: 'A small gathering. A fresh perspective.' });
    add('button', body, { text: 'Reserve your spot' });
    root.style.tone = 'soft';
  } else if (type === 'actions') {
    add('heading', body, { text: 'Keep in touch.', level: 'h2' });
    add('button');
    const b = add('button', body, { text: 'Email the studio' });
    b.action = {
      kind: 'email',
      value: 'hello@example.com',
      newTab: false,
      label: '',
    };
  } else if (type === 'contact') {
    add('heading', body, { text: 'Say hello.', level: 'h2' });
    add('contact');
    add('contact', body, { label: 'Find us', text: '12 Gartenstraße, Berlin' });
  } else if (type === 'footer') {
    add('logo');
    add('text', body, {
      text: 'Fieldnotes · fictional studio for this review',
    });
    add('button', body, { text: 'Privacy information' }).style.variant = 'text';
    add('text', body, { text: '© 2026 Fieldnotes. Made for curious minds.' });
    root.layout.padding = 24;
  }
  for (const n of Object.values(nodes))
    if (n.type === 'heading' && n.content.level === 'h2') n.style.size = 30;
  return { root: root.id, nodes };
}
export function template(kind: 'blank' | 'event' | 'launch'): Project {
  let p = blank(
    kind === 'event'
      ? 'Fieldnotes · Open studio'
      : kind === 'launch'
        ? 'A considered launch'
        : 'Untitled campaign',
  );
  for (const type of kind === 'blank'
    ? []
    : kind === 'event'
      ? ['brand', 'hero', 'benefits', 'event', 'form', 'footer']
      : ['brand', 'hero', 'benefits', 'offer', 'testimonials', 'faq', 'footer'])
    p = execute(p, {
      type: 'add',
      parent: p.root,
      bundle: sectionBundle(type),
    });
  return p;
}
export function descendants(p: Project, id: string): string[] {
  return [id, ...p.nodes[id]!.children.flatMap((c) => descendants(p, c))];
}
export function compatible(parent: Node, child: Node): boolean {
  return parent.kind === 'page'
    ? child.kind === 'section'
    : child.kind === 'section' || child.kind === 'page'
      ? false
      : parent.type === 'form' && parent.kind === 'element'
        ? child.type === 'field'
        : child.type === 'field'
          ? false
          : parent.kind === 'section' || parent.kind === 'container';
}
export function resolved(n: Node, device: Device) {
  const o = device === 'desktop' ? undefined : n.overrides[device];
  const layout = { ...n.layout, ...o?.layout };
  if (
    device === 'phone' &&
    !o?.layout?.display &&
    ['row', 'grid'].includes(layout.display)
  ) {
    layout.display = 'stack';
    layout.columns = 1;
  }
  return { layout, style: { ...n.style, ...o?.style } };
}
export function destination(a: Action): string {
  if (a.kind === 'none') return '';
  if (a.kind === 'url') return a.value;
  if (a.kind === 'section') return `#${a.value}`;
  if (a.kind === 'phone') return `tel:${a.value}`;
  if (a.kind === 'email') return `mailto:${a.value}`;
  if (a.kind === 'whatsapp')
    return `https://wa.me/${a.value.replace(/\D/g, '')}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.value)}`;
}
export function actionError(a: Action, p?: Project): string | undefined {
  if (a.kind === 'none') return;
  if (!a.value.trim()) return 'Enter a destination.';
  if (a.kind === 'url') {
    try {
      const u = new URL(a.value);
      if (
        !['http:', 'https:'].includes(u.protocol) ||
        !u.hostname ||
        u.username ||
        u.password ||
        /\s/.test(a.value)
      )
        throw Error();
    } catch {
      return 'Use a complete http:// or https:// URL, without spaces or credentials.';
    }
  }
  if (a.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.value))
    return 'Enter a valid email address.';
  if (
    ['phone', 'whatsapp'].includes(a.kind) &&
    !/^\+?[\d ()-]{5,24}$/.test(a.value)
  )
    return 'Enter a valid telephone number.';
  if (a.kind === 'section' && p?.nodes[a.value]?.kind !== 'section')
    return 'Choose an existing campaign section.';
}
export function errors(p: Project): { id: string; message: string }[] {
  const result: { id: string; message: string }[] = [];
  const push = (id: string, message: string) => result.push({ id, message });
  for (const n of Object.values(p.nodes)) {
    if (!n.name.trim()) push(n.id, 'Give this item a name.');
    const err = actionError(n.action, p);
    if (err) push(n.id, err);
    if (
      ['heading', 'button', 'logo'].includes(n.type) &&
      !String(n.content.text || '').trim()
    )
      push(n.id, 'Text is required.');
    if (
      n.type === 'image' &&
      !n.content.decorative &&
      !String(n.content.alt || '').trim()
    )
      push(n.id, 'Describe the image or mark it decorative.');
    if (
      n.kind === 'element' &&
      (n.type === 'countdown' || n.type === 'event')
    ) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: String(n.content.timezone) });
      } catch {
        push(n.id, 'Enter an IANA timezone such as Europe/Berlin.');
      }
      if (
        !Number.isFinite(
          Date.parse(String(n.content.target || n.content.start)),
        )
      )
        push(n.id, 'Enter a valid date and time.');
    }
    if (
      n.type === 'price' &&
      (!/^\d+(\.\d{1,2})?$/.test(String(n.content.amount)) ||
        !/^[A-Z]{3}$/.test(String(n.content.currency)))
    )
      push(n.id, 'Use a nonnegative amount and a three-letter currency.');
    if (n.type === 'coupon' && !String(n.content.code || '').trim())
      push(n.id, 'Enter the coupon code.');
  }
  return result;
}
export function assertStructure(p: Project): void {
  if (p.schemaVersion !== 2 || p.nodes[p.root]?.kind !== 'page')
    throw Error('Unsupported document version or missing page.');
  const seen = new Set<string>();
  const visit = (id: string, parent: string | null, depth: number) => {
    const n = p.nodes[id];
    if (
      !n ||
      seen.has(id) ||
      n.id !== id ||
      n.parent !== parent ||
      n.schemaVersion !== 1 ||
      depth > 12
    )
      throw Error('Invalid or cyclic campaign structure.');
    seen.add(id);
    if (n.children.length > 100)
      throw Error('A container supports at most 100 items.');
    if (n.kind === 'page' && n.children.length > 20)
      throw Error('This campaign supports up to 20 sections.');
    for (const child of n.children) {
      if (!p.nodes[child] || !compatible(n, p.nodes[child]!))
        throw Error('This item does not fit that container.');
      visit(child, id, depth + 1);
    }
    for (const l of [
      n.layout,
      ...Object.values(n.overrides).map((o) => ({ ...n.layout, ...o.layout })),
    ])
      if (
        l.gap < 0 ||
        l.gap > 120 ||
        l.padding < 0 ||
        l.padding > 120 ||
        l.width < 0 ||
        l.width > 100 ||
        l.split < 20 ||
        l.split > 80 ||
        l.maxWidth < 160 ||
        l.maxWidth > 1440 ||
        l.columns < 1 ||
        l.columns > 4 ||
        !anchors.includes(l.anchor)
      )
        throw Error('Layout values exceed the safe bounds.');
    for (const s of [
      n.style,
      ...Object.values(n.overrides).map((o) => ({ ...n.style, ...o.style })),
    ])
      if (
        s.size < 10 ||
        s.size > 96 ||
        s.radius < 0 ||
        s.radius > 80 ||
        s.opacity < 20 ||
        s.opacity > 100 ||
        s.border < 0 ||
        s.border > 8 ||
        s.lineHeight < 1 ||
        s.lineHeight > 2.5 ||
        s.tracking < 0 ||
        s.tracking > 8 ||
        [s.color, s.background].some((c) => c && !/^#[\da-f]{6}$/i.test(c))
      )
        throw Error('Style values exceed the safe bounds.');
  };
  visit(p.root, null, 0);
  if (seen.size !== Object.keys(p.nodes).length || seen.size > 800)
    throw Error('Unreachable nodes or the 800 item limit was exceeded.');
  if (!/^#[\da-f]{6}$/i.test(p.theme.accent))
    throw Error('Choose a valid campaign accent.');
}
export function execute(
  project: Project,
  command: Command,
  role: 'editor' | 'viewer' = 'editor',
): Project {
  if (role === 'viewer')
    throw Error('Read only: an Editor or Owner can make changes.');
  if (command.type === 'replace') {
    assertStructure(command.document);
    return structuredClone(command.document);
  }
  const p = structuredClone(project);
  const n = 'id' in command ? p.nodes[command.id] : undefined;
  if ('id' in command && !n) throw Error('The selected item no longer exists.');
  if (command.type === 'add') {
    const b = structuredClone(command.bundle);
    const parent = p.nodes[command.parent]!;
    if (!parent || !compatible(parent, b.nodes[b.root]!))
      throw Error('Choose a compatible container first.');
    for (const id of Object.keys(b.nodes))
      if (p.nodes[id])
        throw Error('An item with this identity already exists.');
    Object.assign(p.nodes, b.nodes);
    p.nodes[b.root]!.parent = parent.id;
    parent.children.splice(command.index ?? parent.children.length, 0, b.root);
  } else if (command.type === 'move') {
    if (
      n!.kind === 'page' ||
      descendants(p, n!.id).includes(command.parent) ||
      !p.nodes[command.parent] ||
      !compatible(p.nodes[command.parent]!, n!)
    )
      throw Error('Cannot move this item into that container.');
    const old = p.nodes[n!.parent!]!;
    old.children = old.children.filter((id) => id !== n!.id);
    const parent = p.nodes[command.parent]!;
    parent.children.splice(Math.max(0, command.index), 0, n!.id);
    n!.parent = parent.id;
  } else if (command.type === 'content')
    Object.assign(n!.content, command.patch);
  else if (command.type === 'name') n!.name = command.value;
  else if (command.type === 'layout') {
    if (command.device) {
      const o = (n!.overrides[command.device] ||= {});
      o.layout = { ...o.layout, ...command.patch };
    } else Object.assign(n!.layout, command.patch);
  } else if (command.type === 'style') {
    if (command.device) {
      const o = (n!.overrides[command.device] ||= {});
      o.style = { ...o.style, ...command.patch };
    } else Object.assign(n!.style, command.patch);
  } else if (command.type === 'reset') {
    if (command.device) delete n!.overrides[command.device];
    else n!.style = defaultStyle();
  } else if (command.type === 'theme') Object.assign(p.theme, command.patch);
  else if (command.type === 'action') n!.action = command.action;
  else if (command.type === 'visibility') n!.visible = !n!.visible;
  else if (command.type === 'delete') {
    if (n!.kind === 'page') throw Error('The page cannot be deleted.');
    p.nodes[n!.parent!]!.children = p.nodes[n!.parent!]!.children.filter(
      (id) => id !== n!.id,
    );
    descendants(p, n!.id).forEach((id) => delete p.nodes[id]);
  } else if (command.type === 'duplicate') {
    if (n!.kind === 'page') throw Error('Duplicate a section or element.');
    const ids = descendants(p, n!.id);
    const map = Object.fromEntries(ids.map((id) => [id, crypto.randomUUID()]));
    for (const id of ids) {
      const c = structuredClone(p.nodes[id]!);
      c.id = map[id]!;
      c.children = c.children.map((child) => map[child]!);
      c.parent = map[c.parent!] || c.parent;
      if (c.action.kind === 'section' && map[c.action.value])
        c.action.value = map[c.action.value]!;
      p.nodes[c.id] = c;
    }
    p.nodes[map[n!.id]!]!.name += ' copy';
    const parent = p.nodes[n!.parent!]!;
    parent.children.splice(parent.children.indexOf(n!.id) + 1, 0, map[n!.id]!);
  } else if (command.type === 'apply-layout') {
    if (!['section', 'container'].includes(n!.kind))
      throw Error('Select a section or container to apply a layout.');
    const type = command.layout;
    if (!layouts.some((l) => l[0] === type)) throw Error('Unsupported layout.');
    n!.layout.display =
      type === 'overlay'
        ? 'overlay'
        : ['single', 'narrow'].includes(type)
          ? 'stack'
          : type === 'grid'
            ? 'grid'
            : 'row';
    n!.layout.columns = ['three', 'grid'].includes(type)
      ? 3
      : ['single', 'narrow', 'overlay'].includes(type)
        ? 1
        : 2;
    n!.layout.split =
      type === 'wide-left' ? 60 : type === 'wide-right' ? 40 : 50;
    n!.layout.maxWidth = type === 'narrow' ? 680 : 1120;
  }
  assertStructure(p);
  return p;
}
export class History {
  past: Project[] = [];
  future: Project[] = [];
  push(p: Project) {
    this.past.push(structuredClone(p));
    this.past = this.past.slice(-80);
    this.future = [];
  }
  undo(p: Project) {
    const prev = this.past.pop();
    if (!prev) return p;
    this.future.push(structuredClone(p));
    return prev;
  }
  redo(p: Project) {
    const next = this.future.pop();
    if (!next) return p;
    this.past.push(structuredClone(p));
    return next;
  }
}

// Pure, non-destructive migration proof. Original source remains exact, with every
// scalar represented by its source path. Production semantic mapping is a gate.
export function migrateV1(input: CampaignDocument): Project {
  const source = documentSchema.parse(input);
  const p = blank('Migrated review copy');
  p.root = 'migration-page';
  const page = Object.values(p.nodes)[0]!;
  page.id = p.root;
  p.nodes = { [page.id]: page };
  p.theme = structuredClone(source.theme);
  p.sourceV1 = structuredClone(source);
  for (const block of source.blocks) {
    const section = node('section', block.type, block.type);
    section.id = block.id;
    section.visible = block.enabled;
    section.layout.padding = 32;
    attach(p.nodes, page, section);
    const walk = (value: unknown, path: string, parent: Node) => {
      if (value && typeof value === 'object') {
        const c = node(
          'container',
          'container',
          path.split('.').pop() || 'Content',
        );
        c.id = `${block.id}:${path}`;
        attach(p.nodes, parent, c);
        Object.entries(value).forEach(([key, v]) =>
          walk(v, `${path}.${key}`, c),
        );
      } else {
        const leaf = node(
          'element',
          'legacy-value',
          path.split('.').pop() || 'Value',
          { sourcePath: path, value: value as string | boolean | number },
        );
        leaf.id = `${block.id}:${path}`;
        attach(p.nodes, parent, leaf);
      }
    };
    walk(block.data, 'data', section);
  }
  assertStructure(p);
  return p;
}

export function zonedTime(value: string, timezone: string): number {
  const naive = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(naive)) return NaN;
  let result = naive;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(result));
    const part = (key: string) => parts.find((p) => p.type === key)!.value;
    const local = Date.parse(
      `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}Z`,
    );
    result += naive - local;
  }
  return result;
}
