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
    ['/assets/visual-preview.js', 'visual-preview.js', 'text/javascript'],
    ['/assets/visual-preview.css', 'visual-preview.css', 'text/css'],
    ['/assets/campaign-lab.js', 'campaign-lab.js', 'text/javascript'],
    ['/assets/campaign-lab.css', 'campaign-lab.css', 'text/css'],
    ['/campaign-preview.css', 'campaign-preview.css', 'text/css'],
  ]) {
    app.get(url!, async (_request, reply) =>
      reply.type(type!).send(await readFile(`dist/public/${file}`, 'utf8')),
    );
  }
  for (const [url, file, type] of [
    ['/lab/sample.svg', 'lab-sample.svg', 'image/svg+xml'],
    ['/lab/sample.webm', 'lab-sample.webm', 'video/webm'],
  ]) {
    app.get(url!, async (_request, reply) =>
      reply
        .type(type!)
        .send(await readFile(`docs/prototypes/editor-p0/${file}`)),
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
  for (const view of ['preview', 'customize'])
    app.get(`${base}/${view}`, async (request, reply) => {
      const { workspace, campaign } = request.params as {
        workspace: string;
        campaign: string;
      };
      const actor = await user(request);
      const result = await service.read(actor.id, workspace, campaign);
      const campaignBase = `/w/${workspace}/campaigns/${campaign}`;
      if (view === 'customize') {
        if (result.readonly) return reply.redirect(`${campaignBase}/preview`);
        // Development-only Lab query switches must never disable campaign saves.
        if (Object.keys(request.query as object).length)
          return reply.redirect(`${campaignBase}/customize`);
      }
      const nonce = randomBytes(18).toString('base64');
      reply.header(
        'Content-Security-Policy',
        `default-src 'none'; style-src 'self' 'nonce-${nonce}'; script-src 'self'; img-src 'self'; media-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
      );
      if (view === 'preview')
        return reply
          .type('text/html')
          .send(renderDocument(result.document, nonce, result.title));
      const bundle = 'campaign-lab';
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
          `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(result.title)} · CometRow composer</title><link rel="stylesheet" href="/assets/${bundle}.css"><script type="module" src="/assets/${bundle}.js"></script></head><body><div id="lab"></div><script id="composer-data" type="application/json">${boot}</script><noscript>Enable JavaScript to edit. <a href="/w/${workspace}/campaigns/${campaign}/preview">Open saved preview</a></noscript></body></html>`,
        );
    });
}
