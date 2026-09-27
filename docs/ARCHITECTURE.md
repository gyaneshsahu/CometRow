# Architecture decision 001: portable TypeScript monolith

Status: adopted for the initial foundation.

Node.js 24, TypeScript and Fastify provide a typed HTTP application with request injection for fast tests. Standard PostgreSQL with the `pg` driver and plain SQL migrations avoids a platform-specific data layer. The initial page is server-rendered HTML/CSS with no client runtime. The accepted Lab provides the shared editor canvas and renderer; account pages remain server-rendered.

The project uses one deployable server. A worker, cache and queue are not justified yet. Local setup uses `embedded-postgres`, a development-only launcher for real PostgreSQL binaries. This preserves the initial development database and supports isolated tests without container dependencies. Docker Desktop 29.8.0 and PostgreSQL 18.6 are installed; the Phase 0 claim that they were absent was incorrect because their CLIs were not on PATH. The launcher is a pinned prerelease package, not a production dependency or database abstraction. Docker Compose remains an alternative. Tests use isolated real PostgreSQL clusters, not an in-memory SQL approximation.

## Module ownership

| Module                | Responsibility                                              |
| --------------------- | ----------------------------------------------------------- |
| Identity/access       | Authentication, verification, recovery, sessions            |
| Workspaces/clients    | Memberships, roles, agency/client ownership                 |
| Campaigns/composer    | Draft schemas, revision conflicts, campaign CRUD            |
| Publishing/versioning | Immutable snapshots, atomic activation, lifecycle           |
| Links/QR              | Permanent IDs, channels, safe resolution                    |
| Media                 | Authorization, processing, quarantine, provider lifecycle   |
| Analytics             | Event validation, attribution, retention, aggregate queries |
| Trust/administration  | Reports, suspensions, privileged audit                      |
| Notifications         | Domain notification orchestration using EmailService        |

Phase 1 adds `IdentityService`, `WorkspaceService` and a local email adapter. The workspace service currently owns campaign skeleton operations so authorization and writes share a transaction; the composer now has its own service and shares the same workspace authorization helper. Publishing remains later work. Private services receive an authenticated actor and workspace, check membership server-side, and scope operations to that workspace. No authorization decisions rely on client-supplied roles. The operator-only ownership-transfer service is not exposed through HTTP.

Provider interfaces are in `src/shared/providers.ts`. Local email is implemented behind `EmailService`; storage, video and scanning remain unconnected until their phases. Binary media will remain outside PostgreSQL. No third-party account or service has been connected.

## Operational properties

- Environment errors name fields without echoing secrets; production requires an HTTPS origin.
- Migrations run transactionally under an advisory lock and reject altered or missing historical migrations.
- Original seeds only run in development/test and are idempotent; their account cannot sign in. A separate development-only demo command creates explicitly labeled synthetic sign-in accounts for role testing.
- Local PostgreSQL listens only on loopback and uses a generated password with SCRAM authentication.
- HTTP logs omit URLs, client IPs, cookies and authorization values. Readiness failures return generic responses.
- The page uses restrictive CSP and no third-party scripts, fonts or analytics.
- Tests now verify relational consistency, the role authorization matrix, tenant denial, CSRF, session/token lifecycle, rate limits and ownership transfer. Scanning, moderation and scheduled retention remain later work. See `SECURITY_PHASE_1.md` for detailed controls and deployment boundaries.

## References

- [Fastify TypeScript documentation](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Fastify support policy](https://fastify.dev/docs/latest/Reference/LTS/)
- [Embedded PostgreSQL launcher](https://github.com/leinelissen/embedded-postgres)

## Shared page editor

The single entry point is `docs/prototypes/editor-p0/lab-app.ts`. Standalone development uses its local storage adapter; production substitutes `src/composer/campaign-lab-storage.ts`. Campaigns open on `/customize`; obsolete editor routes and assets are not served.

The campaign envelope retains themes, visual sections and resolved layouts. The accepted Lab schema and engine are unchanged. The preview shell invokes the shared Lab renderer.

ComposerService retains authorization, transaction locks, revisions and idempotent saves. The unchanged Autosave state machine serializes requests, preserves pending work and requires explicit conflict resolution. Per-user/per-campaign tab backups support recovery.

Historical migrations remain immutable, including the obsolete draft default. Application creation explicitly supplies the current document; startup seeds create no campaigns. No database structures were changed.
