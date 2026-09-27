import { workspaceAccess } from './access.js';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { AppError } from '../shared/errors.js';
import { emailSchema, nameSchema, type User } from '../identity/service.js';
import { pilotLimits } from '../shared/limits.js';
import { newVisualDocument } from '../composer/schema.js';

export type Role = 'owner' | 'editor' | 'viewer';
export type Workspace = {
  id: string;
  name: string;
  kind: 'personal' | 'organization';
  role: Role;
};
export type Campaign = {
  id: string;
  title: string;
  status: string;
  updated_at: Date;
  deleted_at: Date | null;
  deleted_from_status: string | null;
};
const idSchema = z.uuid();
const titleSchema = z
  .string()
  .trim()
  .min(1, 'Enter a campaign name.')
  .max(160, 'Use at most 160 characters.');

export async function audit(
  client: PoolClient,
  workspace: string,
  actor: string | null,
  action: string,
  target: string,
) {
  await client.query(
    'INSERT INTO audit_events (id, workspace_id, actor_id, action, target_id) VALUES ($1, $2, $3, $4, $5)',
    [randomUUID(), workspace, actor, action, target],
  );
}

export class WorkspaceService {
  constructor(private pool: Pool) {}

  private async access(
    client: PoolClient,
    actor: string,
    workspace: string,
    roles: Role[] = ['owner', 'editor', 'viewer'],
  ) {
    return workspaceAccess(client, actor, workspace, roles);
  }

  async list(actor: string) {
    return (
      await this.pool.query<Workspace>(
        `SELECT w.id, w.name, w.kind, m.role FROM workspaces w JOIN memberships m ON m.workspace_id = w.id
      WHERE m.user_id = $1 AND m.status = 'active' ORDER BY w.created_at, w.id`,
        [actor],
      )
    ).rows;
  }

  async create(user: User, rawName: unknown) {
    if (!user.email_verified_at)
      throw new AppError(
        403,
        'Verify your email before creating an organization.',
      );
    const name = nameSchema.parse(rawName);
    return transaction(this.pool, async (client) => {
      const id = randomUUID();
      await client.query(
        "INSERT INTO workspaces (id, name, kind, owner_id) VALUES ($1, $2, 'organization', $3)",
        [id, name, user.id],
      );
      await client.query(
        "INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
        [id, user.id],
      );
      await audit(client, id, user.id, 'workspace.created', id);
      return id;
    });
  }

  async dashboard(actor: string, workspace: string, trash = false) {
    return transaction(this.pool, async (client) => {
      const membership = await this.access(client, actor, workspace);
      const campaigns = await client.query<Campaign>(
        `SELECT id, title, status, updated_at, deleted_at FROM campaigns WHERE workspace_id = $1 AND ${trash ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'} ORDER BY updated_at DESC, id LIMIT 200`,
        [workspace],
      );
      return { workspace: membership, campaigns: campaigns.rows };
    });
  }

  async campaign(actor: string, workspace: string, campaignId: string) {
    idSchema.parse(campaignId);
    return transaction(this.pool, async (client) => {
      const membership = await this.access(client, actor, workspace);
      const result = await client.query<Campaign & { visual_editor: boolean }>(
        "SELECT c.*, coalesce(d.document->>'schemaVersion' = '2', false) AS visual_editor FROM campaigns c LEFT JOIN campaign_drafts d ON d.campaign_id=c.id AND d.workspace_id=c.workspace_id WHERE c.id = $1 AND c.workspace_id = $2 AND c.deleted_at IS NULL",
        [campaignId, workspace],
      );
      if (!result.rows[0]) throw new AppError(404, 'Campaign not found.');
      return { workspace: membership, campaign: result.rows[0] };
    });
  }

  async createCampaign(
    actor: string,
    workspace: string,
    rawTitle: unknown,
    visual = true,
  ) {
    const title = titleSchema.parse(rawTitle);
    return transaction(this.pool, async (client) => {
      await this.access(client, actor, workspace, ['owner', 'editor']);
      const id = randomUUID();
      await client.query(
        'INSERT INTO campaigns (id, workspace_id, public_id, title) VALUES ($1, $2, $3, $4)',
        [id, workspace, randomUUID(), title],
      );
      await client.query(
        'INSERT INTO campaign_drafts (campaign_id, workspace_id, document) VALUES ($1, $2, $3::jsonb)',
        [
          id,
          workspace,
          JSON.stringify(
            visual
              ? newVisualDocument(randomUUID())
              : { schemaVersion: 1, theme: {}, blocks: [] },
          ),
        ],
      );
      await audit(client, workspace, actor, 'campaign.created', id);
      return id;
    });
  }

  async mutateCampaign(
    actor: string,
    workspace: string,
    campaignId: string,
    action:
      'rename' | 'duplicate' | 'archive' | 'unarchive' | 'delete' | 'restore',
    rawTitle?: unknown,
    confirmation?: unknown,
  ) {
    idSchema.parse(campaignId);
    return transaction(this.pool, async (client) => {
      await this.access(
        client,
        actor,
        workspace,
        ['delete', 'restore'].includes(action)
          ? ['owner']
          : ['owner', 'editor'],
      );
      const result = await client.query<Campaign>(
        'SELECT * FROM campaigns WHERE id = $1 AND workspace_id = $2 FOR UPDATE',
        [campaignId, workspace],
      );
      const campaign = result.rows[0];
      if (!campaign || (campaign.deleted_at && action !== 'restore'))
        throw new AppError(404, 'Campaign not found.');
      let target = campaignId;
      if (action === 'rename') {
        await client.query(
          'UPDATE campaigns SET title = $1, updated_at = now() WHERE id = $2 AND workspace_id = $3',
          [titleSchema.parse(rawTitle), campaignId, workspace],
        );
      } else if (action === 'duplicate') {
        target = randomUUID();
        await client.query(
          'INSERT INTO campaigns (id, workspace_id, public_id, title) VALUES ($1, $2, $3, $4)',
          [
            target,
            workspace,
            randomUUID(),
            `${campaign.title.slice(0, 153)} (copy)`,
          ],
        );
        await client.query(
          'INSERT INTO campaign_drafts (campaign_id, workspace_id, document) SELECT $1, $2, document FROM campaign_drafts WHERE campaign_id = $3 AND workspace_id = $2',
          [target, workspace, campaignId],
        );
      } else if (action === 'delete') {
        if (confirmation !== campaign.title)
          throw new AppError(
            400,
            'Type the exact campaign name to confirm deletion.',
          );
        if (!['draft', 'archived'].includes(campaign.status))
          throw new AppError(
            409,
            'This campaign cannot be deleted in the current phase.',
          );
        await client.query(
          "UPDATE campaigns SET deleted_from_status = status, status = 'deleted', deleted_at = now(), updated_at = now() WHERE id = $1 AND workspace_id = $2",
          [campaignId, workspace],
        );
      } else if (action === 'restore') {
        const restored = await client.query(
          `UPDATE campaigns SET status = COALESCE(deleted_from_status, 'draft'), deleted_at = NULL, deleted_from_status = NULL, updated_at = now()
          WHERE id = $1 AND workspace_id = $2 AND status = 'deleted' AND deleted_at > now() - $3::interval`,
          [
            campaignId,
            workspace,
            `${pilotLimits.deletedCampaignRetentionDays} days`,
          ],
        );
        if (!restored.rowCount)
          throw new AppError(
            409,
            'This campaign is not recoverable. The recovery window is 30 days.',
          );
      } else {
        const expected = action === 'archive' ? 'draft' : 'archived';
        if (campaign.status !== expected)
          throw new AppError(409, 'This lifecycle change is not available.');
        await client.query(
          'UPDATE campaigns SET status = $1, updated_at = now() WHERE id = $2 AND workspace_id = $3',
          [action === 'archive' ? 'archived' : 'draft', campaignId, workspace],
        );
      }
      await audit(client, workspace, actor, `campaign.${action}`, target);
      return target;
    });
  }

  async members(actor: string, workspace: string) {
    return transaction(this.pool, async (client) => {
      const membership = await this.access(client, actor, workspace, ['owner']);
      const members = await client.query<{
        user_id: string;
        display_name: string;
        email: string;
        role: Role;
      }>(
        `SELECT m.user_id, u.display_name, u.email, m.role FROM memberships m JOIN users u ON u.id = m.user_id
        WHERE m.workspace_id = $1 AND m.status = 'active' ORDER BY m.role, u.display_name`,
        [workspace],
      );
      return { workspace: membership, members: members.rows };
    });
  }

  async changeMember(
    user: User,
    workspace: string,
    rawEmail: unknown,
    rawRole: unknown,
  ) {
    if (!user.email_verified_at)
      throw new AppError(403, 'Verify your email before managing members.');
    const email = emailSchema.parse(rawEmail);
    const role = z.enum(['editor', 'viewer', 'remove']).parse(rawRole);
    await transaction(this.pool, async (client) => {
      const membership = await this.access(client, user.id, workspace, [
        'owner',
      ]);
      if (membership.kind === 'personal')
        throw new AppError(
          403,
          'Personal workspaces cannot have additional members. Create an organization.',
        );
      const target = await client.query<User>(
        'SELECT * FROM users WHERE email = $1 AND email_verified_at IS NOT NULL',
        [email],
      );
      const targetUser = target.rows[0];
      if (!targetUser)
        throw new AppError(
          400,
          'Ask this person to register and verify their email first.',
        );
      if (targetUser.id === user.id)
        throw new AppError(
          400,
          'Owner changes require the administrator-assisted process.',
        );
      const current = await client.query(
        'SELECT role FROM memberships WHERE workspace_id = $1 AND user_id = $2 FOR UPDATE',
        [workspace, targetUser.id],
      );
      if (current.rows[0]?.role === 'owner')
        throw new AppError(403, 'The owner cannot be changed here.');
      if (role === 'remove')
        await client.query(
          "UPDATE memberships SET status = 'revoked' WHERE workspace_id = $1 AND user_id = $2",
          [workspace, targetUser.id],
        );
      else
        await client.query(
          "INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'",
          [workspace, targetUser.id, role],
        );
      await audit(
        client,
        workspace,
        user.id,
        `membership.${role}`,
        targetUser.id,
      );
    });
  }

  async activity(actor: string, workspace: string) {
    return transaction(this.pool, async (client) => {
      const membership = await this.access(client, actor, workspace, ['owner']);
      const events = await client.query<{
        action: string;
        created_at: Date;
        display_name: string;
      }>(
        `SELECT a.action, a.created_at, u.display_name FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id
        WHERE a.workspace_id = $1 ORDER BY a.created_at DESC, a.id LIMIT 100`,
        [workspace],
      );
      return { workspace: membership, events: events.rows };
    });
  }
}
