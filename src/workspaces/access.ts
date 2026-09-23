import type { PoolClient } from 'pg';
import { z } from 'zod';
import { AppError } from '../shared/errors.js';
import type { Role, Workspace } from './service.js';

export async function workspaceAccess(
  client: PoolClient,
  actor: string,
  workspace: string,
  roles: Role[] = ['owner', 'editor', 'viewer'],
) {
  z.uuid().parse(workspace);
  const result = await client.query<Workspace>(
    `SELECT w.id, w.name, w.kind, m.role FROM memberships m JOIN workspaces w ON w.id = m.workspace_id
    WHERE m.user_id = $1 AND m.workspace_id = $2 AND m.status = 'active' FOR SHARE OF m, w`,
    [actor, workspace],
  );
  const membership = result.rows[0];
  if (!membership) throw new AppError(404, 'Workspace not found.');
  if (!roles.includes(membership.role))
    throw new AppError(403, 'Your workspace role does not allow this action.');
  return membership;
}
