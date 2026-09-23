import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadEnvironment, parseConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { IdentityService } from '../src/identity/service.js';
import { WorkspaceService } from '../src/workspaces/service.js';

loadEnvironment();
const config = parseConfig(process.env);
if (config.NODE_ENV !== 'development')
  throw new Error('Demo accounts are only available in development.');
const file = '.local/demo-accounts.json';
try {
  const existing = await readFile(file, 'utf8');
  console.log(existing);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  const pool = createPool(config.DATABASE_URL);
  try {
    const suffix = randomBytes(4).toString('hex');
    const accounts: { role: string; email: string; password: string }[] = [];
    const messages: string[] = [];
    const identity = new IdentityService(
      pool,
      {
        send: async (message) => {
          messages.push(message.text);
        },
      },
      config.APP_ORIGIN,
    );
    const workspaces = new WorkspaceService(pool);
    for (const role of ['owner', 'editor', 'viewer', 'outsider']) {
      const account = {
        role,
        email: `${role}.${suffix}@example.test`,
        password: randomBytes(18).toString('base64url'),
      };
      await identity.register({ ...account, name: `Demo ${role}` });
      const value = /token=([a-f0-9]{64})/.exec(messages.at(-1)!)![1]!;
      await identity.consume(value, 'verify');
      accounts.push(account);
    }
    const session = await identity.login(accounts[0]);
    const owner = (await identity.user(session))!;
    await identity.logout(session);
    const workspace = await workspaces.create(
      owner,
      'Studio North · Demo agency',
    );
    for (const account of accounts.slice(1, 3))
      await workspaces.changeMember(
        owner,
        workspace,
        account.email,
        account.role,
      );
    await workspaces.createCampaign(
      owner.id,
      workspace,
      'Autumn studio open day',
    );
    const archived = await workspaces.createCampaign(
      owner.id,
      workspace,
      'Summer on the rooftop',
    );
    await workspaces.mutateCampaign(owner.id, workspace, archived, 'archive');
    const output = JSON.stringify(
      {
        note: 'Synthetic local accounts only. Do not use these credentials outside this development environment.',
        url: `${config.APP_ORIGIN}/w/${workspace}`,
        accounts,
      },
      null,
      2,
    );
    await mkdir('.local', { recursive: true });
    await writeFile(file, output, { flag: 'wx', mode: 0o600 });
    console.log(output);
  } finally {
    await pool.end();
  }
}
