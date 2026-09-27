import {
  editorSchemaPlugin,
  campaignLabStoragePlugin,
} from './editor-schema-plugin.js';
import { build } from 'esbuild';
await build({
  plugins: [editorSchemaPlugin, campaignLabStoragePlugin],
  entryPoints: {
    'visual-preview': 'src/composer/visual/preview-client.ts',
    'campaign-lab': 'src/composer/campaign-lab.ts',
    composer: 'src/composer/client.ts',
    workspace: 'src/web/workspace-client.ts',
    'workspace-style': 'src/web/workspace.css',
    'campaign-preview': 'src/composer/preview.css',
  },
  outdir: 'dist/public',
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: false,
  logLevel: 'info',
});
