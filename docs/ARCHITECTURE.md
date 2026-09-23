# Architecture decision 001: portable TypeScript monolith

Status: adopted for the initial foundation.

Node.js 24, TypeScript and Fastify provide a typed HTTP application with request injection for fast tests. Standard PostgreSQL with the `pg` driver and plain SQL migrations avoids a platform-specific data layer. The initial page is server-rendered HTML/CSS with no client runtime. Phase 2 adds a bundled TypeScript composer with configuration-driven block fields and a shared responsive HTML renderer; account pages remain server-rendered.

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

## Phase 2 composer

`src/composer/schema.ts` is the strict versioned document contract. `library.ts` supplies field/repeater definitions, labels and defaults for all twelve core blocks. `render.ts` renders the same document for both live iframe previews and authenticated saved previews. `preview.css` adapts it at responsive breakpoints; viewport choice is never persisted as a separate campaign. `client.ts` composes the reusable field controls, outline, theme panel, validation and mobile views. `autosave.ts` isolates the save state machine from browser UI for deterministic tests.

`ComposerService` authorizes inside each transaction, locks the campaign/draft, compares the expected revision, and advances it on a successful save. Additive migration 003 records the last mutation ID and document hash for a retry after a lost response. A later writer results in a conflict containing the latest authorized draft; no automatic merge or overwrite occurs. Whole-document conflict resolution is deliberate; there is no version-history product yet.

The browser serializes saves, debounces changes for 800 ms, retains an uncertain request for retry, and queues newer edits behind it. Unsaved documents have a per-user, per-campaign sessionStorage backup in the current tab. Reload recovery is explicit; a different base revision invokes conflict review. Backup storage is best-effort and tab-scoped, not an offline database or permanent history.

Build assets with esbuild via `npm run build:client`. No framework runtime, CDN, font service, media integration or external browser requests are required. The stylesheet and script paths are fixed server routes. Autosave requests are capped at 160 KiB and documents at 120,000 UTF-8 bytes, alongside block/field/media-slot limits. Existing Phase 1 empty documents normalize to schema version 1 defaults without destructive migration.

## Phase 2 UX revision

The builder presents a block-card structure, a focused editor, design and full-preview states. This is UI state only; `CampaignDocument`, `ComposerService` and the revision protocol are unchanged. Focused previews derive selected blocks from the current document; full preview renders every enabled block. An auto-sized same-origin sandboxed iframe removes the nested viewport scrollbar. Field metadata can assign an optional section, rendered with accessible native disclosures.

`src/web/design-tokens.css` is shared by the composer and workspace styles. `workspace-client.ts` progressively enhances campaign rename and collection filtering. Only dashboard/overview responses opt into same-origin script/connect CSP permissions for that bundle; authentication/token pages retain their existing restrictive policy. Rename JSON responses confirm the server-accepted name; ordinary form submissions still receive a redirect with a visible success message. Search/filter runs over the already authorized, bounded campaign list.
