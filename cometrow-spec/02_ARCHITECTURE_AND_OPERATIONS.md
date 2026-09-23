# CometRow — Architecture and Operations

## 1. Architecture stance

Build a portable **modular monolith**. Keep one deployable application unless a background worker is justified. Modules must have explicit responsibilities and must not bypass each other's authorization or persistence boundaries.

Suggested modules:

- identity/access;
- workspaces/clients;
- campaigns/composer;
- publishing/versioning;
- links/QR;
- media;
- analytics;
- trust/administration;
- notifications.

Astra may choose the concrete language/framework after inspecting the repository. Prefer a mature typed stack, maintained libraries and an accessible component system. Do not select technology merely because it is fashionable.

## 2. Portable infrastructure

### Development

- Docker Compose where useful.
- PostgreSQL.
- Local S3-compatible object storage such as MinIO.
- Local/mock email transport.
- Local media adapter; small test assets only.
- Redis only if a demonstrated queue/cache requirement exists.

### Production mapping

- PostgreSQL → any reputable managed PostgreSQL provider.
- S3-compatible storage → R2, S3 or equivalent.
- Video adapter → managed encoding/streaming provider.
- Email adapter → transactional email provider.
- Application → suitable container/serverless host.

Supabase may be used later because its database is PostgreSQL, but business logic must not become unnecessarily dependent on Supabase-only APIs. Provider-specific authentication/storage behavior must be isolated.

## 3. Provider boundaries

Define replaceable interfaces for:

- `ObjectStorage`
- `VideoService`
- `EmailService`
- `EventSink`
- `Clock`
- `IdGenerator`
- optional `MalwareScanner`

Business modules depend on interfaces, not vendor SDKs. Provider implementations own external SDK calls and map failures into domain-safe errors.

## 4. Publishing model

- A campaign owns one mutable working draft.
- Publishing validates and snapshots the entire public representation into an immutable version.
- The active published-version reference changes transactionally only after the snapshot is complete.
- Public requests read the active snapshot, avoiding partially edited state.
- Restoring creates a draft from an old snapshot; it does not rewrite history.
- Stable public and channel IDs must not expose sequential database identifiers.

## 5. Media flow

1. Server authorizes an upload and creates a pending media record.
2. Client uploads through a bounded signed upload mechanism when available.
3. Server/provider validates type, size and ownership.
4. Media is scanned/processed asynchronously when necessary.
5. Record transitions to ready or failed.
6. Only ready media can be published.

Do not proxy large video bytes through application memory. Store media outside PostgreSQL. Keep metadata, ownership, status and provider IDs in PostgreSQL.

## 6. Analytics flow

- Public page obtains a short-lived, campaign-scoped event token or equivalent anti-abuse mechanism.
- Client sends a small allowlisted event payload.
- Server validates event type, campaign/version/channel relationship, timestamp bounds and rate limits.
- Raw events are retained for the configured period; aggregate queries or rollups serve dashboards when volume requires it.
- Do not accept arbitrary event names/properties.

## 7. Local and CI operations

Repository must provide:

- one documented command to start required local services;
- one command to apply migrations;
- one command to seed synthetic demo data;
- one command for unit/integration tests;
- one command for lint/type checks;
- one command for production build;
- `.env.example` without secrets;
- health/readiness checks where applicable.

CI should run formatting/linting, type checks, tests, migration validation and production build. Dependency and secret scanning should use maintained free tooling where practical.

## 8. Cost rule

Use free/local tools during development when they provide equivalent results. Before introducing a paid dependency, document:

- necessity;
- free/local alternative;
- compromise of that alternative;
- expected current and scale cost;
- portability/exit plan;

No paid account or credential is required merely to prove the local MVP.

