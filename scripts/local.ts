import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import EmbeddedPostgres from './local-postgres.js';
import { loadEnvironment, parseConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { buildApp } from '../src/app.js';

if (process.env.NODE_ENV === 'production')
  throw new Error('Local setup cannot run in production');
try {
  const password = randomBytes(24).toString('hex');
  await writeFile(
    '.env',
    `NODE_ENV=development\nHOST=127.0.0.1\nPORT=3000\nAPP_ORIGIN=http://127.0.0.1:3000\nDATABASE_URL=postgresql://cometrow:${password}@127.0.0.1:5433/cometrow\nPOSTGRES_USER=cometrow\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_DB=cometrow\nLOG_LEVEL=info\n`,
    { flag: 'wx', mode: 0o600 },
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
}
loadEnvironment();
const config = parseConfig(process.env);
if (config.NODE_ENV !== 'development')
  throw new Error('Local setup requires NODE_ENV=development');
const dbUrl = new URL(config.DATABASE_URL);
if (
  dbUrl.hostname !== '127.0.0.1' ||
  dbUrl.pathname !== '/cometrow' ||
  !dbUrl.password
)
  throw new Error(
    'Local setup requires a password-protected 127.0.0.1/cometrow database',
  );
await mkdir('.local', { recursive: true });
const postgres = new EmbeddedPostgres({
  databaseDir: resolve('.local/postgres'),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  port: Number(dbUrl.port || 5432),
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: () => {},
});
let started = false;
const pool = createPool(config.DATABASE_URL);
let app: Awaited<ReturnType<typeof buildApp>> | undefined;
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await app?.close();
  await pool.end();
  if (started) await postgres.stop();
}
try {
  let initialized = false;
  try {
    await readFile('.local/postgres/PG_VERSION');
    initialized = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (!initialized) await postgres.initialise();
  await postgres.start();
  started = true;
  const admin = postgres.getPgClient();
  try {
    await admin.connect();
    const existing = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = 'cometrow'",
    );
    if (!existing.rowCount) await admin.query('CREATE DATABASE cometrow');
  } finally {
    await admin.end();
  }
  await migrate(pool);
  await seed(pool, config.NODE_ENV);
  app = await buildApp(config, {
    pool,
    ready: async () => {
      await pool.query('SELECT 1 FROM schema_migrations');
    },
  });
  pool.on('error', () => app?.log.error('Database connection failed'));
  await app.listen({ host: config.HOST, port: config.PORT });
  console.log(
    `CometRow is running at ${config.APP_ORIGIN}. Stop with Ctrl+C. Local data persists in .local/postgres.`,
  );
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      void close();
    });
} catch {
  console.error(
    'Local setup failed. Check that the database and application ports are free and the .env credentials match your existing local cluster. No data was deleted.',
  );
  await close();
  process.exitCode = 1;
}
