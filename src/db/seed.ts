import type { Pool } from 'pg';

export const demoIds = {
  user: '10000000-0000-4000-8000-000000000001',
  workspace: '20000000-0000-4000-8000-000000000001',
  campaign: '30000000-0000-4000-8000-000000000001',
  public: '40000000-0000-4000-8000-000000000001',
};

export async function seed(pool: Pool, environment: string) {
  if (!['development', 'test'].includes(environment))
    throw new Error('Synthetic seeds are restricted to development and test');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(18493202)');
    await client.query(
      "INSERT INTO users (id, email, display_name) VALUES ($1, 'founder@example.test', 'Demo founder') ON CONFLICT (id) DO NOTHING",
      [demoIds.user],
    );
    await client.query(
      "INSERT INTO workspaces (id, name, kind, owner_id) VALUES ($1, 'Demo event agency', 'organization', $2) ON CONFLICT (id) DO NOTHING",
      [demoIds.workspace, demoIds.user],
    );
    await client.query(
      "INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING",
      [demoIds.workspace, demoIds.user],
    );
    await client.query(
      "INSERT INTO campaigns (id, workspace_id, public_id, title) VALUES ($1, $2, $3, 'Berlin creative evenings') ON CONFLICT (id) DO NOTHING",
      [demoIds.campaign, demoIds.workspace, demoIds.public],
    );
    await client.query(
      'INSERT INTO campaign_drafts (campaign_id, workspace_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [demoIds.campaign, demoIds.workspace],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
