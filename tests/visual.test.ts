import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  createVisual,
  resolveVisual,
  visualSchema,
  ENGINE_VERSION,
} from '../src/composer/visual/document.js';
import { execute, History } from '../docs/prototypes/editor-p0/lab-commands.js';
import {
  createNode,
  placement,
  validate,
  uid,
} from '../docs/prototypes/editor-p0/lab-model.js';
import { autoLayout } from '../docs/prototypes/editor-p0/lab-auto-layout.js';
import { build } from 'esbuild';
import {
  editorSchemaPlugin,
  campaignLabStoragePlugin,
} from '../scripts/editor-schema-plugin.js';
import {
  newVisualDocument,
  documentSchema,
  emptyDocument,
} from '../src/composer/schema.js';
import { renderDocument } from '../src/composer/render.js';
test('campaign bundle runs the accepted Lab sources with only campaign storage substituted', async () => {
  const result = await build({
    entryPoints: ['src/composer/campaign-lab.ts'],
    bundle: true,
    write: false,
    outdir: 'dist/test-memory',
    format: 'esm',
    target: 'es2022',
    metafile: true,
    plugins: [editorSchemaPlugin, campaignLabStoragePlugin],
  });
  const inputs = Object.keys(result.metafile!.inputs).map((p) =>
    p.replaceAll('\\', '/'),
  );
  for (const name of [
    'app',
    'model',
    'commands',
    'auto-layout',
    'render',
    'layout-graph',
    'responsive-controls',
  ])
    assert.ok(
      inputs.includes(`docs/prototypes/editor-p0/lab-${name}.ts`),
      name,
    );
  assert.ok(inputs.includes('src/composer/campaign-lab-storage.ts'));
  assert.ok(!inputs.includes('docs/prototypes/editor-p0/lab-storage.ts'));
  assert.ok(!inputs.some((p) => p.startsWith('src/editor/')));
  // Standalone validators retain small pure helpers, never the eval compiler.
  assert.ok(!inputs.some((p) => p.includes('node_modules/ajv/dist/compile/')));
});

test('CSP build-time Lab validator accepts and rejects the same documents as the source validator', async () => {
  const result = await build({
    entryPoints: ['docs/prototypes/editor-p0/lab-model.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
    plugins: [editorSchemaPlugin],
  });
  const compiled = await import(
    'data:text/javascript;base64,' +
      Buffer.from(result.outputFiles[0]!.text).toString('base64')
  );
  const valid = createVisual(randomUUID()).document;
  const badVersion = { ...valid, schemaVersion: 'unknown' };
  const unsafeMedia = structuredClone(valid);
  unsafeMedia.assets['sample-image']!.source = {
    kind: 'url',
    url: 'javascript:alert(1)',
  };
  for (const candidate of [valid, badVersion, unsafeMedia]) {
    let expected = true;
    try {
      validate(candidate);
    } catch {
      expected = false;
    }
    if (expected) assert.doesNotThrow(() => compiled.validate(candidate));
    else assert.throws(() => compiled.validate(candidate));
  }
});
test('production adapter round-trips shared commands, relationships, Custom and history without changing Primary', () => {
  let d = createVisual(randomUUID()).document;
  const ids = [uid(), uid(), uid(), uid()];
  for (const [i, kind] of (
    ['paragraph', 'heading', 'button', 'button'] as const
  ).entries()) {
    const p = placement(kind, [60, 60, 60, 230][i]!, [40, 120, 240, 240][i]!);
    p.w = i > 1 ? 140 : 350;
    d = execute(d, {
      type: 'AddNode',
      node: createNode(kind, ids[i]!),
      placement: p,
      device: 'desktop',
    });
  }
  const primary = structuredClone(d.sections[0]!.layouts.desktop);
  const h = new History(d);
  h.commit({
    type: 'MoveNode',
    id: ids[1]!,
    device: 'mobile',
    placement: {
      ...d.sections[0]!.layouts.mobile.placements[ids[1]!]!,
      x: 20,
      w: 400,
      yPx: 170,
    },
  });
  const custom = structuredClone(
    h.document.sections[0]!.layouts.mobile.placements[ids[1]!]!,
  );
  h.commit({
    type: 'SetResponsiveRelationships',
    relationships: {
      roles: {},
      groups: [
        { id: uid(), name: 'Actions', layout: 'row', children: ids.slice(2) },
      ],
    },
  });
  const saved = resolveVisual(h.document),
    loaded = visualSchema.parse(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(loaded, saved);
  assert.equal(loaded.layoutEngineVersion, ENGINE_VERSION);
  assert.deepEqual(loaded.document.sections[0]!.layouts.desktop, primary);
  assert.deepEqual(
    loaded.document.sections[0]!.layouts.mobile.placements[ids[1]!]!,
    custom,
  );
  for (const bp of ['mobile', 'tablet', 'desktop'] as const)
    assert.deepEqual(
      loaded.resolved[bp].layout,
      autoLayout(
        loaded.document,
        bp,
        loaded.document.breakpoints[bp].previewWidthPx,
      ).layout,
    );
  h.undo();
  h.redo();
  assert.deepEqual(resolveVisual(h.document), saved);
});
test('campaign envelope keeps V1 strict and accepts repeatable shared visual sections', () => {
  assert.equal(documentSchema.parse(emptyDocument()).schemaVersion, 1);
  const v = newVisualDocument(randomUUID());
  v.blocks.push(newVisualDocument(randomUUID()).blocks[0]!);
  assert.equal(documentSchema.safeParse(v).success, true);
  assert.equal(
    documentSchema.safeParse({ ...v, schemaVersion: 1 }).success,
    false,
  );
});
test('adapter rejects unsupported engines, incomplete snapshots, invalid relationships and media uploads', () => {
  const v = createVisual(randomUUID());
  const d = execute(v.document, {
    type: 'AddNode',
    node: createNode('heading', 'heading'),
    device: 'desktop',
    placement: placement('heading'),
  });
  const good = resolveVisual(d);

  const future = { ...good, layoutEngineVersion: 'future' };
  const missing = structuredClone(good);
  delete missing.resolved.mobile.styles.heading;
  const cycle = structuredClone(good);
  cycle.document.sections[0]!.responsive = {
    groups: [
      { id: 'cycle', name: 'Cycle', layout: 'row', children: ['cycle'] },
    ],
    roles: {},
  };
  const media = structuredClone(good);
  media.document.assets['sample-image']!.source = {
    kind: 'url',
    url: 'https://example.com/photo.jpg',
  };
  for (const bad of [future, missing, cycle, media])
    assert.equal(visualSchema.safeParse(bad).success, false);
});
test('private preview boots the same renderer from escaped shared document data', () => {
  const d = newVisualDocument(randomUUID());
  const html = renderDocument(d, 'nonce');
  assert.match(html, /data-visual-document/);
  assert.match(html, /visual-preview.js/);
  assert.doesNotMatch(
    renderDocument(emptyDocument(), 'nonce'),
    /visual-preview.js/,
  );
});
test('existing recreated V2 draft is adapted without dropping placements, roles or content', () => {
  const id = randomUUID(),
    n = randomUUID(),
    p = {
      geometryMode: 'custom',
      x: 50,
      yPx: 80,
      w: 300,
      height: { mode: 'auto', minPx: 44 },
      layerBand: 'content',
      layerOrder: 0,
      hidden: false,
      locked: false,
      sectionBackground: false,
    };
  const l = {
    height: { mode: 'auto', minPx: 640 },
    origin: 'user',
    placements: { [n]: p },
  };
  const r = {
    height: 640,
    styles: { [n]: { fontSizePx: 48 } },
    heights: { [n]: 63 },
  };
  const old = {
    layoutEngineVersion: 'visual/1',
    primaryScreen: 'desktop',
    nodes: {
      [n]: {
        id: n,
        name: 'Title',
        type: 'heading',
        content: { text: 'Original title', level: 1 },
        baseStyle: { fontSizePx: 48 },
        styleOverrides: {},
      },
    },
    section: {
      id,
      childIds: [n],
      readingOrder: [n],
      bottomPaddingPx: 32,
      responsive: { roles: { [n]: 'content' }, groups: [] },
      layouts: { mobile: l, tablet: l, desktop: l },
    },
    resolved: { mobile: r, tablet: r, desktop: r },
  };
  const value = visualSchema.parse(old);
  assert.deepEqual(
    value.document.sections[0]!.layouts.desktop.placements['n' + n],
    p,
  );
  assert.equal(
    (value.document.nodes['n' + n] as { content: { text: string } }).content
      .text,
    'Original title',
  );
  assert.equal(
    value.document.sections[0]!.responsive!.roles['n' + n],
    'content',
  );
});
