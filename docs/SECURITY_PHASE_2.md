# Phase 2 security review

This adds to the historical Phase 1 controls. It is a local engineering review, not an independent penetration test or production approval.

## Boundaries implemented

- Composer, draft JSON and saved preview routes require authenticated active workspace membership. Campaign queries include both campaign and workspace IDs. Owner/Editor may edit draft campaigns; Viewer and archived records are read-only. Revoked membership, deleted campaigns and expired sessions are checked on every request.
- Shared authorization and row locks keep membership checks and saves in the same PostgreSQL transaction. Simultaneous saves with the same expected revision yield one success and one conflict. No stale document is silently overwritten.
- Autosave uses the Phase 1 exact-Origin and double-submit CSRF checks. Its JSON error response includes the latest document only after successful authorization. No private response is cached.
- Strict schema version 1 rejects unknown keys, block types and future versions. Field lengths, unique block IDs, 20-block and 10-image/2-video-slot limits apply server-side as well as in the browser. Documents are limited to 120,000 UTF-8 bytes; the save route allows a bounded 160 KiB request envelope.
- Plain text is escaped. Rich information is escaped before the small bold/italic/list formatter runs. HTML markup is rejected; no advertiser HTML, scripts, CSS or iframe input is accepted.
- URLs are validated by action kind. HTTP(S) destinations cannot include credentials, whitespace or controls; call/email schemes have separate restricted forms. No remote URLs are fetched. Preview actions are disabled, and there are no real media sources or uploads.
- Theme values are allowlisted and the accent is exactly a six-digit hex color. The generated nonce style contains only validated colors. Composer CSP permits same-origin bundled scripts/styles, same-origin save requests and its preview frame. It excludes unsafe-inline/eval, external assets and framing of the composer. The preview iframe is sandboxed without script permission; the shared renderer emits no scripts.
- The inert bootstrap JSON escapes `<`, and titles/attributes are escaped. Browser bundles contain no database credentials or server configuration. Fixed asset paths serve only the built composer assets.
- Save retries retain their mutation ID and content hash. Reusing the last identifier with different content is rejected. If another writer has advanced the draft, retry produces a conflict instead of an overwrite.
- Best-effort browser recovery is scoped to user, campaign and tab. It does not replace durable server saves. Downloaded copies and browser storage can contain private campaign content; no automatic external transmission occurs.

## Validation and limits

Unit and real-PostgreSQL integration tests cover schema/URL/markup rejection, theme injection, unsafe dates, resource caps, role/tenant/CSRF checks, revocation, expired sessions, archived/deleted records, idempotent saves and concurrent revision conflicts. Browser checks exercise real saves and both conflict-resolution choices. Dependency audit reports zero known vulnerabilities at verification time.

No dedicated third-party static scanner or independent penetration test was run. Application logs were reviewed through existing redaction behavior; the server does not log draft bodies or secrets. A browser automation MutationObserver error was observed without an application source URL; it is not emitted by composer source, which contains no MutationObserver.

The existing Phase 1 deployment limitations remain. Distributed rate limiting, production roles/TLS, permanent backup/restore, independent accessibility/security review and real-user operational readiness are future work. Autosaves intentionally do not create a full-content audit trail or revision history; publishing history belongs to a later phase. No external services, production credentials or paid infrastructure were introduced.

## UX revision controls

The revised dashboard and overview load a same-origin bundled script for filtering and rename feedback. These two page routes permit only same-origin scripts/connections; they do not enable inline/eval code or external sources. Auth/token pages remain unenhanced. Rename still passes through exact-Origin CSRF, membership and role checks; JSON errors preserve the existing safe error boundary. No schema, tenant, upload or draft-revision protection was weakened.

Additional regression coverage verifies missing revision rejection and stale conflict resolution after an intervening save. Valid nonexistent HTTPS hosts are intentionally accepted with no remote fetch; existence checks would neither prove safety nor provide a reliable availability guarantee. Preview actions remain inactive.
