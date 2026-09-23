import type { Pool } from 'pg';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { AppError } from '../shared/errors.js';
import { audit } from './service.js';

// Operator-only service, deliberately not exposed through HTTP.
export async function transferOwner(
  pool: Pool,
  workspaceId: string,
  newOwnerEmail: string,
) {
  z.uuid().parse(workspaceId);
  z.email().parse(newOwnerEmail);
  await transaction(pool, async (client) => {
    const result = await client.query(
      'SELECT owner_id, kind FROM workspaces WHERE id = $1 FOR UPDATE',
      [workspaceId],
    );
    const workspace = result.rows[0];
    if (!workspace || workspace.kind !== 'organization')
      throw new AppError(
        400,
        'Ownership transfer requires an organization workspace.',
      );
    const target = await client.query(
      `SELECT u.id FROM users u JOIN memberships m ON m.user_id = u.id
      WHERE m.workspace_id = $1 AND u.email = $2 AND u.email_verified_at IS NOT NULL AND m.status = 'active' FOR UPDATE OF m`,
      [workspaceId, newOwnerEmail.toLowerCase()],
    );
    const newOwner = target.rows[0]?.id as string | undefined;
    if (!newOwner || newOwner === workspace.owner_id)
      throw new AppError(
        400,
        'The new owner must be a different, verified, active member.',
      );
    await client.query(
      "UPDATE memberships SET role = 'editor' WHERE workspace_id = $1 AND user_id = $2",
      [workspaceId, workspace.owner_id],
    );
    await client.query(
      "UPDATE memberships SET role = 'owner' WHERE workspace_id = $1 AND user_id = $2",
      [workspaceId, newOwner],
    );
    await client.query('UPDATE workspaces SET owner_id = $1 WHERE id = $2', [
      newOwner,
      workspaceId,
    ]);
    // The target identifies the new owner; actor remains NULL to identify
    // an administrative operator rather than impersonating either user.
    await audit(
      client,
      workspaceId,
      null,
      'workspace.ownership_transferred',
      newOwner,
    );
  });
}
