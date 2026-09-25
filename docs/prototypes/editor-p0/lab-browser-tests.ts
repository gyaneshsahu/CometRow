import { showResponsiveDemo, responsiveChecks } from './lab-responsive-demo.js';
import {
  seed,
  createNode,
  placement,
  devices,
  breakpoint,
  validate,
} from './lab-model.js';
import { History } from './lab-commands.js';
import { renderSection, measureSection } from './lab-render.js';
if (new URLSearchParams(location.search).has('demo')) {
  await showResponsiveDemo();
} else {
  const output = document.querySelector('pre')!;
  let passed = 0;
  const results: string[] = [];
  function assert(ok: unknown, label: string) {
    if (!ok) throw Error(label);
    passed++;
    results.push('PASS ' + label);
    output.textContent = results.join('\n');
  }
  const h = new History(seed());
  for (const type of [
    'image',
    'heading',
    'paragraph',
    'button',
    'video',
    'shape',
  ] as const)
    h.commit({
      type: 'AddNode',
      node: createNode(type, 'node-' + type),
      placement: placement(type),
      device: 'desktop',
    });
  h.commit({
    type: 'SetImageAsBackground',
    id: 'node-image',
    device: 'desktop',
  });
  const heading = h.document.nodes['node-heading']!;
  if (heading.type === 'heading')
    heading.content.text =
      'Entdecke außergewöhnliche Möglichkeiten für gemeinschaftliche Zukunftsgestaltung und unvergessliche Erlebnisse.';
  const paragraph = h.document.nodes['node-paragraph']!;
  if (paragraph.type === 'paragraph')
    paragraph.content.text = 'A longer story with room to grow. '.repeat(40);
  for (const b of devices) {
    h.commit({
      type: 'ResizeNode',
      id: 'node-button',
      device: b,
      placement: {
        ...h.document.sections[0]!.layouts[b].placements['node-button']!,
        x: 0,
        w: 480,
        yPx: 500,
      },
    });
    h.commit({
      type: 'UpdateNodeStyle',
      id: 'node-button',
      device: b,
      style: { fontSizePx: 36 },
    });
  }
  try {
    const responsiveResults = await responsiveChecks();
    for (const result of responsiveResults)
      assert(true, result.replace('PASS ', ''));
    for (const width of [
      320, 360, 390, 430, 639, 640, 768, 1023, 1024, 1200, 1440,
    ]) {
      const b = breakpoint(width),
        root = renderSection(h.document, b, width);
      document.body.append(root);
      measureSection(root, h.document, b);
      const text = root.querySelector<HTMLElement>(
          '[data-node="node-heading"]',
        )!,
        para = root.querySelector<HTMLElement>('[data-node="node-paragraph"]')!,
        button = root.querySelector<HTMLElement>('a')!;
      assert(
        root.scrollWidth <= width,
        `${width}px: no horizontal section overflow`,
      );
      assert(
        text.scrollHeight <= text.clientHeight + 1,
        `${width}px: long heading preserves all copy`,
      );
      assert(para.offsetHeight > 44, `${width}px: long paragraph auto-grows`);
      assert(
        button.offsetHeight >= 44 &&
          button.scrollHeight <= button.clientHeight + 1,
        `${width}px: 200% button text remains usable`,
      );
      assert(
        measureSection(root, h.document, b).warnings.some((w) =>
          w.includes('overlaps'),
        ) ===
          (b === 'desktop'),
        `${width}px: authored overlaps warned; Auto collisions resolved`,
      );
      root.remove();
    }
    const section = h.document.sections[0]!;
    for (const b of devices) {
      const root = renderSection(h.document, b);
      document.body.append(root);
      assert(
        [...root.children]
          .map((e) => (e as HTMLElement).dataset.node)
          .join() === section.readingOrder.join(),
        `${b}: DOM reading order`,
      );
      root.remove();
    }
    validate(JSON.parse(JSON.stringify(h.document)));
    assert(true, 'JSON sample round-trip');
    for (let i = 0; i < 44; i++) {
      const type = (
        ['heading', 'paragraph', 'image', 'button', 'video', 'shape'] as const
      )[i % 6]!;
      h.commit({
        type: 'AddNode',
        node: createNode(type),
        placement: placement(type, 20 + i, 20 + i * 8),
        device: 'desktop',
      });
    }
    const start = performance.now();
    for (const b of devices) {
      const root = renderSection(h.document, b);
      document.body.append(root);
      measureSection(root, h.document, b);
      assert(root.children.length === 50, `${b}: 50 mixed DOM nodes`);
      root.remove();
    }
    results.push(
      `INFO 50-node three-surface render: ${Math.round(performance.now() - start)} ms`,
    );
    const frame = document.querySelector('iframe')!;
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.src = '/editor-lab?test=1&run=' + Date.now();
    });
    const page = () => frame.contentDocument!;
    const wait = async () => {
      await new Promise((r) => setTimeout(r, 450));
      for (
        let attempt = 0;
        attempt < 100 &&
        (page().querySelector('#lab-status')?.textContent ===
          'Unsaved changes' ||
          !!page().querySelector('.lab-confirm'));
        attempt++
      )
        await new Promise((r) => setTimeout(r, 100));
    };
    await wait();
    const click = (label: string) => {
      const b = [...page().querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.firstChild?.textContent === label,
      );
      if (!b) throw Error('Button missing: ' + label);
      b.click();
    };
    const field = (label: string, value: string) => {
      const l = [...page().querySelectorAll('label')].find(
        (l) => l.firstChild?.textContent === label,
      );
      const input = l?.querySelector<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >('input,select,textarea');
      if (!input) throw Error('Field missing: ' + label);
      input.value = value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const add = (type: string) => {
      click('＋ Add Container');
      click(type);
    };
    // Test database is separate from the founder's draft, and is reset through undoable UI import semantics below.
    const errors: string[] = [];
    frame.contentWindow!.addEventListener('error', (e) =>
      errors.push(e.message),
    );
    frame.contentWindow!.addEventListener('unhandledrejection', (e) =>
      errors.push(String(e.reason)),
    );
    add('Image');
    click('Set as section background');
    assert(
      !page().querySelector('.lab-hit[aria-label="Select image"]'),
      'background lock removes pointer target',
    );
    const background = page().querySelector<HTMLElement>('.lab-stage img')!;
    assert(
      background.style.width === '100%' &&
        background.style.objectFit === 'cover',
      'background fills hero with cover',
    );
    field('Focal X (%)', '25');
    assert(
      page()
        .querySelector<HTMLElement>('.lab-stage img')!
        .style.objectPosition.startsWith('25%'),
      'focal point changes crop',
    );
    click('Detach from background');
    click('Undo');
    click('Redo');
    click('Undo');
    assert(
      !page().querySelector('.lab-hit[aria-label="Select image"]'),
      'detach undo redo undo coherent',
    );
    add('Heading');
    field('Text (shared across breakpoints)', 'Founder review heading');
    field('Font family', 'Georgia, serif');
    field('Font size (px)', '42');
    field('Text color', '#ffffff');
    field('X (480 units)', '30');
    field('Y (px)', '80');
    assert(
      page().querySelector('.lab-stage h1')?.textContent ===
        'Founder review heading',
      'heading editable and semantic',
    );
    add('Paragraph');
    field(
      'Text (shared across breakpoints)',
      'Long German-like gemeinschaftliche Zukunftsgestaltung '.repeat(20),
    );
    field('Y (px)', '200');
    assert(
      page().querySelector<HTMLElement>('.lab-stage p')!.offsetHeight > 44,
      'paragraph auto height grows',
    );
    add('Button');
    field('Button label', 'Start exploring');
    field('Link URL', 'https://example.com/review');
    field('Fill color', '#172338');
    field('Radius (px)', '24');
    field('Y (px)', '500');
    assert(
      page().querySelector<HTMLAnchorElement>('.lab-stage a')!.href ===
        'https://example.com/review',
      'button URL uses real anchor',
    );
    const desktop =
      page().querySelector<HTMLElement>('.lab-stage a')!.style.cssText;
    click('Tablet');
    field('X (480 units)', '35');
    const tablet =
      page().querySelector<HTMLElement>('.lab-stage a')!.style.cssText;
    click('Phone');
    field('Width (480 units)', '480');
    field('X (480 units)', '0');
    field('Y (px)', '560');
    assert(
      page().querySelector<HTMLElement>('.lab-stage a')!.style.width === '100%',
      'mobile full-width button',
    );
    click('Desktop');
    assert(
      page().querySelector<HTMLElement>('.lab-stage a')!.style.cssText ===
        desktop,
      'mobile/tablet leave desktop untouched',
    );
    click('Tablet');
    assert(
      page().querySelector<HTMLElement>('.lab-stage a')!.style.cssText ===
        tablet,
      'mobile leaves tablet untouched',
    );
    click('Phone');
    field('Apply styles to', 'All breakpoints');
    field('Radius (px)', '20');
    click('Desktop');
    assert(
      page().querySelector<HTMLElement>('.lab-stage a')!.style.borderRadius ===
        '20px',
      'all-breakpoint style propagated',
    );
    click('＋ Add Container');
    click('Cancel');
    assert(
      !page().querySelector('dialog[open]'),
      'picker cancel removes temporary state',
    );
    await wait();
    const before = page().querySelector('.lab-stage')!.textContent;
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.contentWindow!.location.reload();
    });
    await wait();
    assert(
      page().querySelector('.lab-stage')!.textContent === before,
      'IndexedDB reload preserves content',
    );
    assert(
      page().querySelectorAll('.lab-mini .lab-section').length === 3,
      'three read-only thumbnails',
    );
    assert(
      page().querySelectorAll('.lab-stage').length === 1,
      'single editable canvas',
    );
    click('Preview');
    assert(
      !page().querySelector('.lab-preview .lab-overlay'),
      'preview has no editing overlays',
    );
    click('Exit preview');
    assert(
      errors.length === 0,
      'no browser errors during scripted founder flow',
    );
    // Exercise 50 nodes in the actual editor, not just the standalone renderer.
    const uiStart = performance.now();
    for (let i = 0; i < 46; i++)
      add(
        ['Heading', 'Paragraph', 'Image', 'Button', 'Video', 'Shape'][i % 6]!,
      );
    assert(
      page().querySelectorAll('.lab-stage .lab-node').length === 50,
      '50-node editor remains rendered',
    );
    field('X (480 units)', '21');
    const selectedName = page().querySelector('.lab-inspector h3')!.textContent;
    assert(!!selectedName, '50-node editor selection and inspector respond');
    click('Phone');
    click('Desktop');
    assert(
      page().querySelectorAll('.lab-mini').length === 3,
      '50-node live thumbnails remain present',
    );
    results.push(
      `INFO 46 UI additions plus move and breakpoint switches: ${Math.round(performance.now() - uiStart)} ms`,
    );
    await wait();
    const run = new URL(frame.src).searchParams.get('run');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('cometrow-editor-lab-1-test-' + run);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const readDraft = () =>
      new Promise<unknown>((resolve, reject) => {
        const r = db
          .transaction('documents')
          .objectStore('documents')
          .get('draft');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    const saved = await readDraft();
    validate(saved);
    assert(
      Object.keys(saved.nodes).length === 50,
      'debounced autosave contains all 50 nodes',
    );
    assert(
      saved.sections[0]!.layouts.mobile.origin === 'user' &&
        saved.sections[0]!.layouts.tablet.origin === 'user',
      'manual edits persist map origins',
    );
    const serialized = JSON.stringify(saved);
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.contentWindow!.location.reload();
    });
    await wait();
    assert(
      JSON.stringify(await readDraft()) === serialized,
      'reload preserves complete document, maps, styles, bands and locks',
    );
    const video = page().querySelector<HTMLVideoElement>('.lab-stage video')!;
    if (video.readyState === 0)
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(Error('Bundled video failed'));
        setTimeout(
          () =>
            video.readyState
              ? resolve()
              : reject(Error('Video metadata timeout')),
          5000,
        );
      });
    assert(
      video.videoWidth === 640 && video.duration > 0,
      'bundled video decodes locally',
    );
    // Scoped responsive inheritance flow in the actual editor and isolated database.
    const badge = (screen: string) =>
      page().querySelector(`[data-screen="${screen}"] .lab-rail-badges`)!
        .textContent!;
    add('Shape');
    assert(
      badge('desktop').includes('Primary') && badge('mobile').includes('Auto'),
      'new element has Primary and Auto badges',
    );
    field('X (480 units)', '33');
    click('Phone');
    assert(
      badge('mobile').includes('Open') && badge('desktop').includes('Primary'),
      'opening Phone does not change Primary',
    );
    field('X (480 units)', '51');
    assert(
      badge('mobile').includes('Custom'),
      'non-primary geometry edit is Custom',
    );
    click('Hide on this screen');
    assert(badge('mobile').includes('Hidden'), 'local hide is shown on rail');
    click('Show on this screen');
    click('Reset to Auto');
    assert(badge('mobile').includes('Auto'), 'selected reset restores Auto');
    page()
      .querySelector<HTMLButtonElement>('[aria-label="Set Phone as Primary"]')!
      .click();
    click('Cancel change');
    await wait();
    assert(
      badge('desktop').includes('Primary'),
      'cancel Primary change preserves Desktop',
    );
    page()
      .querySelector<HTMLButtonElement>('[aria-label="Set Phone as Primary"]')!
      .click();
    page()
      .querySelector<HTMLButtonElement>('dialog[open] button:last-child')!
      .click();
    await wait();
    assert(
      badge('mobile').includes('Primary') &&
        badge('desktop').includes('Custom'),
      'confirmed Phone Primary protects old Desktop',
    );
    field('X (480 units)', '61');
    click('Desktop');
    click('Reset to Auto');
    await wait();
    const responsive = await readDraft();
    validate(responsive);
    const addedId = responsive.sections[0]!.childIds.at(-1)!;
    assert(
      responsive.primaryScreen === 'mobile' &&
        responsive.sections[0]!.layouts.mobile.placements[addedId]!.x === 61 &&
        responsive.sections[0]!.layouts.desktop.placements[addedId]!
          .geometryMode === 'auto',
      'reset uses Phone Primary and persists metadata',
    );
    page()
      .querySelector('.lab-inspector input')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
      );
    assert(
      !page().querySelector('dialog[open]'),
      'Delete inside a field does not delete the element',
    );
    click('Delete everywhere');
    click('Cancel deletion');
    await wait();
    assert(
      page().querySelectorAll('.lab-stage .lab-node').length === 51,
      'cancel global deletion retains node',
    );
    page().body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    assert(
      !!page().querySelector('dialog[open]'),
      'keyboard Delete opens confirmation',
    );
    page()
      .querySelector<HTMLButtonElement>('dialog[open] button:last-child')!
      .click();
    await wait();
    const deleted = await readDraft();
    validate(deleted);
    assert(
      !deleted.nodes[addedId] &&
        devices.every(
          (b) => !deleted.sections[0]!.layouts[b].placements[addedId],
        ),
      'confirmed deletion removes all placements',
    );
    click('Undo');
    await wait();
    assert(
      page().querySelectorAll('.lab-stage .lab-node').length === 51,
      'global deletion is one undo',
    );

    click('51. shape');
    field('New group name', 'Related features');
    click('Create row group');
    await wait();
    const grouped = await readDraft();
    validate(grouped);
    const responsiveGroup = grouped.sections[0]!.responsive!.groups[0]!;
    assert(
      responsiveGroup.layout === 'row' &&
        responsiveGroup.children.includes(addedId),
      'UI creates a responsive row containing the selection',
    );
    add('Shape');
    field('Responsive group', responsiveGroup.id);
    field('Responsive role', 'content');
    await wait();
    const joined = await readDraft();
    validate(joined);
    assert(
      joined.sections[0]!.responsive!.groups[0]!.children.length === 2,
      'UI joins related elements without moving Primary geometry',
    );
    const relationshipJson = JSON.stringify(joined.sections[0]!.responsive);
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.contentWindow!.location.reload();
    });
    await wait();
    const reloadedGroups = await readDraft();
    validate(reloadedGroups);
    assert(
      JSON.stringify(reloadedGroups.sections[0]!.responsive) ===
        relationshipJson,
      'relationships and ordered membership survive reload',
    );
    const savedCopy = JSON.stringify(await readDraft());
    const normalUrl = frame.src,
      reviewUrl = new URL(normalUrl);
    reviewUrl.searchParams.set('review', '1');
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.src = reviewUrl.href;
    });
    await wait();
    add('Shape');
    assert(
      page().querySelector('#lab-status')!.textContent!.includes('Review copy'),
      'review copy is clearly identified',
    );
    await wait();
    assert(
      JSON.stringify(await readDraft()) === savedCopy,
      'review copy edits never overwrite the stored draft',
    );
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.src = normalUrl;
    });
    await wait();

    const legacy = structuredClone(saved);
    delete legacy.primaryScreen;
    for (const b of devices)
      for (const p of Object.values(legacy.sections[0]!.layouts[b].placements))
        delete p.geometryMode;
    const legacyJson = JSON.stringify(legacy);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      tx.objectStore('documents').put(legacy, 'draft');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.contentWindow!.location.reload();
    });
    await wait();
    assert(
      JSON.stringify(await readDraft()) === legacyJson,
      'legacy load does not rewrite saved record',
    );
    assert(
      badge('desktop').includes('Primary'),
      'legacy document defaults to Desktop Primary',
    );
    add('Shape');
    await wait();
    const upgraded = await readDraft();
    validate(upgraded);
    assert(
      ['mobile', 'tablet'].every((b) =>
        Object.keys(legacy.nodes).every(
          (id) =>
            upgraded.sections[0]!.layouts[b as 'mobile' | 'tablet'].placements[
              id
            ]!.geometryMode === 'custom',
        ),
      ),
      'all legacy non-primary placements are protected Custom',
    );
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const r = db.transaction('documents').objectStore('documents').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    assert(
      records.some((record) => JSON.stringify(record) === legacyJson),
      'first save retains exact legacy backup',
    );
    // Corruption recovery uses only this run's separate test database.
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      tx.objectStore('documents').put({ schemaVersion: 'broken' }, 'draft');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.contentWindow!.location.reload();
    });
    await wait();
    assert(
      page()
        .querySelector('#lab-message')!
        .textContent!.includes('recovery copy preserved'),
      'corrupt record falls back with recovery notice',
    );
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const r = db
        .transaction('documents')
        .objectStore('documents')
        .getAllKeys();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    assert(
      keys.some((k) => String(k).startsWith('recovery-')),
      'recoverable corrupt record is retained',
    );
    db.close();
    results.push(
      `\nPASS: ${passed} assertions. Pointer capture and file chooser are verified separately with real browser input.`,
    );
    output.textContent = results.join('\n');
    document.title = 'PASS — Editor Lab browser tests';
  } catch (e) {
    output.textContent = results.join('\n') + '\nFAIL ' + String(e);
    document.title = 'FAIL — Editor Lab browser tests';
  }
}
