import { loadEnvironment, parseConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';

loadEnvironment();
const pool = createPool(parseConfig(process.env).DATABASE_URL);
try {
  for (const table of ['sessions', 'account_tokens', 'auth_throttles']) {
    const result = await pool.query(
      `DELETE FROM ${table} WHERE expires_at < now()`,
    );
    console.log(`${table}: removed ${result.rowCount} expired rows`);
  }
} finally {
  await pool.end();
}
