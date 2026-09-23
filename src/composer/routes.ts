import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { User } from '../identity/service.js';
import { ComposerService } from './service.js';
import { escape, renderDocument } from './render.js';

export function registerComposer(
  app: FastifyInstance,
  pool: Pool,
  user: (request: FastifyRequest) => Promise<User>,
  csrf: (request: FastifyRequest) => string,
) {
  const service = new ComposerService(pool);
  const base = '/w/:workspace/campaigns/:campaign';
  for (const [url, file, type] of [
    ['/assets/workspace.js', 'workspace.js', 'text/javascript'],
    ['/assets/composer.js', 'composer.js', 'text/javascript'],
    ['/assets/composer.css', 'composer.css', 'text/css'],
    ['/campaign-preview.css', 'campaign-preview.css', 'text/css'],
  ]) {
    app.get(url!, async (_request, reply) =>
      reply.type(type!).send(await readFile(`dist/public/${file}`, 'utf8')),
    );
  }
  app.get(`${base}/draft`, async (request) => {
    const { workspace, campaign } = request.params as {
      workspace: string;
      campaign: string;
    };
    const result = await service.read(
      (await user(request)).id,
      workspace,
      campaign,
    );
    return { document: result.document, revision: result.revision };
  });
  app.post(`${base}/draft`, { bodyLimit: 160 * 1024 }, async (request) => {
    const { workspace, campaign } = request.params as {
      workspace: string;
      campaign: string;
    };
    const { _csrf: ignored, ...input } = request.body as Record<
      string,
      unknown
    >;
    void ignored;
    return service.save((await user(request)).id, workspace, campaign, input);
  });
  for (const view of ['compose', 'preview'])
    app.get(`${base}/${view}`, async (request, reply) => {
      const { workspace, campaign } = request.params as {
        workspace: string;
        campaign: string;
      };
      const actor = await user(request);
      const result = await service.read(actor.id, workspace, campaign);
      const nonce = randomBytes(18).toString('base64');
      reply.header(
        'Content-Security-Policy',
        `default-src 'none'; style-src 'self' 'nonce-${nonce}'; script-src ${view === 'compose' ? "'self'" : "'none'"}; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
      );
      if (view === 'preview')
        return reply
          .type('text/html')
          .send(renderDocument(result.document, nonce, result.title));
      const boot = JSON.stringify({
        ...result,
        workspace: undefined,
        workspaceName: result.workspace.name,
        userId: actor.id,
        csrf: csrf(request),
        nonce,
        base: `/w/${workspace}/campaigns/${campaign}`,
      }).replaceAll('<', '\\u003c');
      return reply
        .type('text/html')
        .send(
          `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(result.title)} · CometRow composer</title><link rel="stylesheet" href="/assets/composer.css"><script type="module" src="/assets/composer.js"></script></head><body><main id="composer-root"></main><script id="composer-data" type="application/json">${boot}</script><noscript>Enable JavaScript to edit. <a href="/w/${workspace}/campaigns/${campaign}/preview">Open saved preview</a></noscript></body></html>`,
        );
    });
}
