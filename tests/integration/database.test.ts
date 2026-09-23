import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import EmbeddedPostgres from '../../scripts/local-postgres.js';
import { createPool } from '../../src/db/pool.js';
import { migrate } from '../../src/db/migrate.js';
import { demoIds, seed } from '../../src/db/seed.js';
import { composerScenarios } from './composer-scenarios.js';
import { phaseOneScenarios } from './phase-one-scenarios.js';

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

test('real PostgreSQL foundation', { timeout: 90000 }, async (t) => {
  await mkdir('.local/tests', { recursive: true });
  const directory = await mkdtemp(resolve('.local/tests/run-'));
  const password = randomBytes(24).toString('hex');
  const port = await freePort();
  const postgres = new EmbeddedPostgres({
    databaseDir: resolve(directory, 'postgres'),
    port,
    user: 'cometrow_test',
    password,
    persistent: true,
    authMethod: 'scram-sha-256',
    postgresFlags: ['-h', '127.0.0.1'],
    onLog: () => {},
    onError: () => {},
  });
  let started = false;
  const pool = createPool(
    `postgresql://cometrow_test:${password}@127.0.0.1:${port}/postgres`,
  );
  t.after(async () => {
    await pool.end();
    if (started) await postgres.stop();
  });
  await postgres.initialise();
  await postgres.start();
  started = true;

  await t.test(
    'empty database migrates and repeated migrations are no-ops',
    async () => {
      await migrate(pool);
      await migrate(pool);
      assert.equal(
        (await pool.query('SELECT * FROM schema_migrations')).rowCount,
        3,
      );
    },
  );
  await t.test(
    'seeds are idempotent, synthetic, unpublished and unverified',
    async () => {
      await seed(pool, 'test');
      await seed(pool, 'test');
      const users = await pool.query(
        'SELECT email, email_verified_at FROM users',
      );
      assert.equal(users.rowCount, 1);
      assert.equal(users.rows[0].email, 'founder@example.test');
      assert.equal(users.rows[0].email_verified_at, null);
      assert.equal(
        (await pool.query('SELECT status FROM campaigns')).rows[0].status,
        'draft',
      );
      await assert.rejects(seed(pool, 'production'), /restricted/);
    },
  );
  await t.test(
    'database rejects cross-workspace client and draft references',
    async () => {
      const otherWorkspace = randomUUID();
      const client = randomUUID();
      await pool.query(
        "INSERT INTO workspaces (id, name, kind, owner_id) VALUES ($1, 'Other', 'organization', $2)",
        [otherWorkspace, demoIds.user],
      );
      await pool.query(
        "INSERT INTO clients (id, workspace_id, name) VALUES ($1, $2, 'Other client')",
        [client, otherWorkspace],
      );
      await assert.rejects(
        pool.query('UPDATE campaigns SET client_id = $1 WHERE id = $2', [
          client,
          demoIds.campaign,
        ]),
        { code: '23503' },
      );
      await assert.rejects(
        pool.query(
          'UPDATE campaign_drafts SET workspace_id = $1 WHERE campaign_id = $2',
          [otherWorkspace, demoIds.campaign],
        ),
        { code: '23503' },
      );
    },
  );
  await t.test(
    'invalid roles and inconsistent soft deletion fail at database boundary',
    async () => {
      await assert.rejects(
        pool.query("UPDATE memberships SET role = 'admin'"),
        { code: '23514' },
      );
      await assert.rejects(
        pool.query("UPDATE campaigns SET status = 'deleted'"),
        { code: '23514' },
      );
    },
  );
  await t.test('edited historical migrations are rejected', async () => {
    const changed = resolve(directory, 'changed');
    await mkdir(changed);
    await writeFile(resolve(changed, '001_foundation.sql'), '-- altered');
    await writeFile(
      resolve(changed, '002_identity_tenancy.sql'),
      await readFile('migrations/002_identity_tenancy.sql'),
    );
    await writeFile(
      resolve(changed, '003_composer_saves.sql'),
      await readFile('migrations/003_composer_saves.sql'),
    );
    await assert.rejects(migrate(pool, changed), /changed/);
  });
  await t.test('failed migrations roll back all schema changes', async () => {
    const broken = resolve(directory, 'broken');
    await mkdir(broken);
    for (const file of await readdir('migrations'))
      await writeFile(
        resolve(broken, file),
        await readFile(`migrations/${file}`),
      );
    await writeFile(
      resolve(broken, '004_broken.sql'),
      'CREATE TABLE rollback_probe (id int); SELECT * FROM does_not_exist;',
    );
    await assert.rejects(migrate(pool, broken), { code: '42P01' });
    assert.equal(
      (await pool.query("SELECT to_regclass('rollback_probe') AS name")).rows[0]
        .name,
      null,
    );
    assert.equal(
      (await pool.query('SELECT * FROM schema_migrations')).rowCount,
      3,
    );
  });
  await phaseOneScenarios(pool, t);
  await composerScenarios(pool, t);
});
