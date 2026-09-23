import { loadEnvironment, parseConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { seed } from '../src/db/seed.js';

loadEnvironment();
const config = parseConfig(process.env);
const pool = createPool(config.DATABASE_URL);
try {
  await seed(pool, config.NODE_ENV);
  console.log('Synthetic demo data ready.');
} finally {
  await pool.end();
}
