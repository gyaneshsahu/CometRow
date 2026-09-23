import { loadEnvFile } from 'node:process';
import { z } from 'zod';

export function loadEnvironment() {
  try {
    loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash
      );
    }, 'Must be an HTTP(S) origin without credentials, path, query or fragment')
    .transform((value) => new URL(value).origin),
  DATABASE_URL: z
    .url()
    .refine(
      (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
      'Must be a PostgreSQL URL',
    ),
  LOG_LEVEL: z
    .enum(['silent', 'error', 'warn', 'info', 'debug'])
    .default('info'),
});

export function parseConfig(env: NodeJS.ProcessEnv) {
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid configuration: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  const config = result.data;
  if (
    config.NODE_ENV === 'production' &&
    new URL(config.APP_ORIGIN).protocol !== 'https:'
  ) {
    throw new Error('Production APP_ORIGIN must use HTTPS');
  }
  if (new URL(config.DATABASE_URL).password === 'CHANGE_ME') {
    throw new Error('Replace the example database password before starting');
  }
  return config;
}

export type Config = ReturnType<typeof parseConfig>;
