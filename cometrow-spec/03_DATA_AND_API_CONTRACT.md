# CometRow — Data and API Contract

This is a logical contract, not a mandate for exact table or endpoint names. Astra may normalize or adjust it while preserving behaviors and constraints.

## 1. Principal entities

- **User:** internal ID, authentication-subject mapping, verified status, profile timestamps.
- **Workspace:** personal or organization type, name, owner and status.
- **Membership:** workspace, user, role and lifecycle.
- **Client:** optional agency client under one workspace.
- **Campaign:** workspace/client ownership, title, internal public ID, optional slug, lifecycle state, active version and timestamps.
- **CampaignDraft:** current validated composer document plus revision number.
- **CampaignVersion:** immutable version number, normalized public snapshot, publisher and publish timestamp.
- **MediaAsset:** owner workspace, kind, source, provider key, status, size/duration/dimensions and safety metadata.
- **ChannelLink:** campaign, opaque token, name, status and optional attribution metadata.
- **AnalyticsEvent:** campaign, version, optional channel, allowlisted type, time and minimized context.
- **AuditEvent:** actor, workspace, action, target, time and safe metadata.
- **AbuseReport:** campaign, reason, reporter contact when supplied, state and moderation outcome.

## 2. Essential invariants

- Every private entity is tenant-scoped.
- Membership and role are checked on the server; client claims alone are insufficient.
- Campaign slug uniqueness is enforced by the database in the intended namespace.
- Campaign versions are immutable.
- Active version belongs to the same campaign and must be successfully published.
- Channel link belongs to the campaign it resolves.
- Soft deletion is explicit and filtered by default.
- Media cannot be attached across workspaces without an explicit supported transfer.
- Public IDs/tokens use high-entropy non-sequential values.
- Limits are enforced server-side and configured centrally.

## 3. Composer document

Use a versioned schema, for example:

```json
{
  "schemaVersion": 1,
  "theme": {},
  "blocks": [
    {
      "id": "opaque-block-id",
      "type": "hero",
      "enabled": true,
      "data": {}
    }
  ]
}
```

Each block type has a strict server-validated schema. Unknown executable markup, event handlers and scripts are rejected. Rich text uses a safe structured representation or strict sanitization.

## 4. API capability groups

- Authentication/session operations.
- Workspace, membership and client operations.
- Campaign CRUD and lifecycle operations.
- Draft retrieval/update with optimistic concurrency.
- Media upload authorization/status/deletion.
- Preview generation/rendering.
- Publish, version list and restore-to-draft.
- Channel-link and QR operations.
- Public campaign resolution.
- Analytics event ingestion and dashboard queries.
- Abuse reporting and privileged moderation.

REST, typed RPC or another consistent API style is acceptable. Generate/maintain machine-readable contracts where supported.

## 5. Concurrency and idempotency

- Draft updates carry a revision/ETag; conflicting writes return a conflict instead of silently overwriting.
- Publish is idempotent for a supplied request key and draft revision.
- Media-provider callbacks are authenticated and idempotent.
- Analytics ingestion tolerates retries and limits obvious duplicates.
- Destructive operations require explicit server-side authorization and confirmation semantics.

## 6. Data retention foundations

- Analytics: 90-day pilot default, configurable.
- Soft-deleted campaigns: 30 days, configurable.
- Audit and moderation records: separate retention policy.
- Media deletion is asynchronous and auditable.
- Account/workspace export and deletion workflows may begin as administrator-assisted but the model must support them.

