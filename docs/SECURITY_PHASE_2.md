# Phase 2 security review

This adds to the historical Phase 1 controls. It is a local engineering review, not an independent penetration test or production approval.

## Boundaries implemented

- Composer, draft JSON and saved preview routes require authenticated active workspace membership. Campaign queries include both campaign and workspace IDs. Owner/Editor may edit draft campaigns; Viewer and archived records are read-only. Revoked membership, deleted campaigns and expired sessions are checked on every request.
- Shared authorization and row locks keep membership checks and saves in the same PostgreSQL transaction. Simultaneous saves with the same expected revision yield one success and one conflict. No stale document is silently overwritten.
- Autosave uses the Phase 1 exact-Origin and double-submit CSRF checks. Its JSON error response includes the latest document only after successful authorization. No private response is cached.
- The current campaign schema rejects unknown keys, obsolete block types and unsupported versions. Field lengths, unique block IDs, 20-block and 10-image/2-video-slot limits apply server-side as well as in the browser. Documents are limited to 120,000 UTF-8 bytes; the save route allows a bounded 160 KiB request envelope.
- Plain text is escaped. HTML markup is rejected; no advertiser HTML, scripts, CSS or iframe input is accepted.
- URLs are validated by action kind. HTTP(S) destinations cannot include credentials, whitespace or controls; call/email schemes have separate restricted forms. No remote URLs are fetched. The shared renderer controls preview behavior; this cleanup adds no uploads.
- Theme values are allowlisted and the accent is exactly a six-digit hex color. The generated nonce style contains only validated colors. Composer CSP permits same-origin bundled scripts/styles, same-origin save requests and private preview. It excludes unsafe-inline/eval, external assets and framing of the composer. Private previews use the shared visual renderer.
- The inert bootstrap JSON escapes `<`, and titles/attributes are escaped. Browser bundles contain no database credentials or server configuration. Fixed asset paths serve only the built composer assets.
- Save retries retain their mutation ID and content hash. Reusing the last identifier with different content is rejected. If another writer has advanced the draft, retry produces a conflict instead of an overwrite.
- Best-effort browser recovery is scoped to user, campaign and tab. It does not replace durable server saves. Downloaded copies and browser storage can contain private campaign content; no automatic external transmission occurs.

## Validation and limits

Unit and real-PostgreSQL integration tests cover schema/URL/markup rejection, theme injection, unsafe dates, resource caps, role/tenant/CSRF checks, revocation, expired sessions, archived/deleted records, idempotent saves and concurrent revision conflicts. Browser checks exercise the shared canvas, responsive placements and persisted saves.

No dedicated third-party static scanner or independent penetration test was run. Application logs were reviewed through existing redaction behavior; the server does not log draft bodies or secrets.
