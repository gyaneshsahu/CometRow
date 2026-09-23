import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import type { Config } from './config.js';
import { homePage, homeStyles } from './web/home.js';
import type { Pool } from 'pg';
import type { EmailService } from './shared/providers.js';
import { LocalEmail } from './notifications/local-email.js';
import { registerPhaseOne } from './web/routes.js';

export async function buildApp(
  config: Config,
  dependencies: {
    ready: () => Promise<void>;
    pool?: Pool;
    mail?: EmailService;
  },
) {
  const app = Fastify({
    bodyLimit: 64 * 1024,
    logger: {
      level: config.LOG_LEVEL,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ],
      // Request URLs can carry verification tokens; do not log URLs or IPs.
      serializers: {
        req: (request) => ({ method: request.method }),
        res: (reply) => ({ statusCode: reply.statusCode }),
      },
    },
    requestTimeout: 10000,
  });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: config.NODE_ENV === 'production' ? [] : null,
      },
    },
    hsts: config.NODE_ENV === 'production',
  });
  app.get('/', async (_request, reply) =>
    reply.type('text/html; charset=utf-8').send(homePage),
  );
  app.get('/styles.css', async (_request, reply) =>
    reply.type('text/css; charset=utf-8').send(homeStyles),
  );
  app.get('/health/live', async () => ({ status: 'ok', service: 'cometrow' }));
  app.get('/health/ready', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      await dependencies.ready();
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });
  app.setErrorHandler((error, request, reply) => {
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? error.statusCode
        : undefined;
    const code =
      typeof status === 'number' && status >= 400 && status < 500
        ? status
        : 500;
    if (code === 500)
      request.log.error({ requestId: request.id }, 'Request failed');
    reply.code(code).send({
      error: code === 500 ? 'Something went wrong' : 'Invalid request',
      requestId: request.id,
    });
  });
  if (dependencies.pool) {
    if (config.NODE_ENV === 'production' && !dependencies.mail)
      throw new Error(
        'Configure a production email adapter before deployment.',
      );
    const pool = dependencies.pool;
    await app.register(async (privateApp) => {
      await registerPhaseOne(
        privateApp,
        config,
        pool,
        dependencies.mail ?? new LocalEmail(),
      );
    });
  }
  return app;
}
