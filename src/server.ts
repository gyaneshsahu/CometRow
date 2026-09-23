import { buildApp } from './app.js';
import { loadEnvironment, parseConfig } from './config.js';
import { createPool } from './db/pool.js';

loadEnvironment();
const config = parseConfig(process.env);
const pool = createPool(config.DATABASE_URL);
const app = await buildApp(config, {
  pool,
  ready: async () => {
    const result = await pool.query(
      "SELECT name FROM schema_migrations WHERE name = '003_composer_saves.sql'",
    );
    if (result.rowCount !== 1) throw new Error('Database requires migration');
  },
});
pool.on('error', () => app.log.error('Database connection failed'));
app.addHook('onClose', async () => {
  await pool.end();
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close();
  });
}
try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch {
  app.log.error(
    'Unable to start CometRow. Check configuration and port availability.',
  );
  await app.close();
  process.exitCode = 1;
}
