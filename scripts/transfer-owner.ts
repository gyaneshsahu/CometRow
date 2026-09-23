import { loadEnvironment, parseConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { transferOwner } from '../src/workspaces/transfer-owner.js';

loadEnvironment();
const config = parseConfig(process.env);
if (config.NODE_ENV !== 'development')
  throw new Error(
    'This helper is restricted to local development. A production administrator workflow must be reviewed before deployment.',
  );
const [workspace, email, confirm] = process.argv.slice(2);
if (!workspace || !email || confirm !== '--confirm')
  throw new Error(
    'Usage: npm run workspace:transfer -- <workspace-id> <new-owner-email> --confirm',
  );
const pool = createPool(config.DATABASE_URL);
try {
  await transferOwner(pool, workspace, email);
  console.log('Ownership transferred. Previous owner is now an Editor.');
} finally {
  await pool.end();
}
