import { loadEnvironment, parseConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';

loadEnvironment();
const pool = createPool(parseConfig(process.env).DATABASE_URL);
try {
  await migrate(pool);
  console.log('Migrations applied.');
} finally {
  await pool.end();
}
