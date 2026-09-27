import { Ajv2020 } from 'ajv/dist/2020.js';
import standalone from 'ajv/dist/standalone/index.js';
import { _ } from 'ajv/dist/compile/codegen/index.js';
import type { Plugin } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import schema from '../docs/editor-lab/cometrow-editor-lab.schema.json' with { type: 'json' };
import { safeUrl } from '../docs/prototypes/editor-p0/lab-model.js';
export const campaignLabStoragePlugin: Plugin = {
  name: 'campaign-lab-storage',
  setup(build) {
    build.onResolve({ filter: /^\.\/lab-storage\.js$/ }, (args) => {
      if (/[\\/]editor-p0[\\/]lab-app\.ts$/.test(args.importer))
        return { path: resolve('src/composer/campaign-lab-storage.ts') };
    });
  },
};
// Compile the identical AJV schema at build time: production CSP needs no eval.
export const editorSchemaPlugin: Plugin = {
  name: 'editor-schema',
  setup(build) {
    build.onLoad({ filter: /[\\/]lab-model\.ts$/ }, async (args) => {
      const ajv = new Ajv2020({
        strict: false,
        allErrors: true,
        formats: { uri: { type: 'string', validate: safeUrl } },
        code: {
          source: true,
          esm: true,
          formats: _`({uri:{validate:safeUrl}})`,
        },
      });
      const validate = ajv.compile(schema);
      const compiled = standalone
        .default(ajv, validate)
        .replace('export const validate =', 'const validateSchema =')
        .replace(/export default \w+;/, '');
      const source = await readFile(args.path, 'utf8');
      // Compile the Lab's exact validator ahead of time; no runtime eval or
      // changes to the accepted source, model, commands or responsive engine.
      const contents = source
        .replace(/import \{ Ajv2020 \} from 'ajv\/dist\/2020.js';\r?\n/, '')
        .replace(/import schema from .*?;\r?\n/, '')
        .replace(
          /const ajv = new Ajv2020\([\s\S]*?const validateSchema = ajv.compile\(schema\);/,
          compiled,
        )
        .replace(
          'ajv.errorsText(validateSchema.errors)',
          "(validateSchema.errors || []).map(e => 'data' + e.instancePath + ' ' + e.message).join(', ')",
        );
      return {
        loader: 'ts',
        resolveDir: dirname(args.path),
        contents,
      };
    });
  },
};
