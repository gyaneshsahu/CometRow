import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { AppError } from '../shared/errors.js';
import { workspaceAccess } from '../workspaces/access.js';
import { documentSchema, type DraftSnapshot } from './schema.js';

export class DraftConflict extends AppError {
  constructor(public latest: DraftSnapshot) {
    super(
      409,
      'This draft was updated in another tab. Choose which version to keep.',
    );
  }
}
export class ComposerService {
  constructor(private pool: Pool) {}
  async read(actor: string, workspace: string, campaign: string) {
    z.uuid().parse(campaign);
    return transaction(this.pool, async (client) => {
      const membership = await workspaceAccess(client, actor, workspace);
      const result = await client.query(
        `SELECT c.title, c.status, d.document, d.revision FROM campaigns c JOIN campaign_drafts d ON d.campaign_id = c.id AND d.workspace_id = c.workspace_id
        WHERE c.id = $1 AND c.workspace_id = $2 AND c.deleted_at IS NULL`,
        [campaign, workspace],
      );
      if (!result.rows[0]) throw new AppError(404, 'Campaign not found.');
      const row = result.rows[0];
      return {
        document: documentSchema.parse(row.document),
        revision: Number(row.revision),
        title: String(row.title),
        readonly: membership.role === 'viewer' || row.status !== 'draft',
        workspace: membership,
      };
    });
  }
  async save(
    actor: string,
    workspace: string,
    campaign: string,
    raw: unknown,
  ): Promise<DraftSnapshot> {
    z.uuid().parse(campaign);
    const input = z
      .strictObject({
        revision: z.number().int().positive(),
        mutationId: z.uuid(),
        document: z.unknown(),
      })
      .parse(raw);
    return transaction(this.pool, async (client) => {
      await workspaceAccess(client, actor, workspace, ['owner', 'editor']);
      const result = await client.query(
        `SELECT c.status, d.document, d.revision, d.last_save_id, d.last_save_hash FROM campaigns c JOIN campaign_drafts d ON d.campaign_id = c.id AND d.workspace_id = c.workspace_id
        WHERE c.id = $1 AND c.workspace_id = $2 AND c.deleted_at IS NULL FOR UPDATE OF c, d`,
        [campaign, workspace],
      );
      const current = result.rows[0];
      if (!current) throw new AppError(404, 'Campaign not found.');
      if (current.status !== 'draft')
        throw new AppError(
          409,
          'Return this campaign to drafts before editing.',
        );
      const document = documentSchema.parse(input.document);
      const startsVisualDraft =
        current.document.schemaVersion === 1 &&
        current.document.blocks.length === 0 &&
        document.schemaVersion === 2;
      if (
        document.schemaVersion !== current.document.schemaVersion &&
        !startsVisualDraft
      )
        throw new AppError(
          409,
          'Changing campaign document versions is not supported.',
        );
      if (
        document.schemaVersion === 2 &&
        document.blocks.filter((b) => b.type === 'visual-section').length > 1
      )
        throw new AppError(
          400,
          'This pilot supports one visual hero per campaign.',
        );
      const hash = createHash('sha256')
        .update(JSON.stringify(document))
        .digest('hex');
      if (current.last_save_id === input.mutationId) {
        if (current.last_save_hash !== hash)
          throw new AppError(
            409,
            'A save identifier cannot be reused for different content.',
          );
        return {
          document: documentSchema.parse(current.document),
          revision: current.revision,
        };
      }
      if (current.revision !== input.revision)
        throw new DraftConflict({
          document: documentSchema.parse(current.document),
          revision: current.revision,
        });
      const updated = await client.query(
        'UPDATE campaign_drafts SET document = $1::jsonb, revision = revision + 1, last_save_id = $2, last_save_hash = $3, updated_at = now() WHERE campaign_id = $4 AND workspace_id = $5 RETURNING revision',
        [JSON.stringify(document), input.mutationId, hash, campaign, workspace],
      );
      await client.query(
        'UPDATE campaigns SET updated_at = now() WHERE id = $1 AND workspace_id = $2',
        [campaign, workspace],
      );
      return { document, revision: updated.rows[0].revision };
    });
  }
}
