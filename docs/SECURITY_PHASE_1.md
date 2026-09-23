# Phase 1 security notes

## Implemented controls

- Salted Node.js scrypt passwords: N=65536, r=8, p=2; no plaintext password storage. New passwords require 15–128 characters without truncation.
- Random 256-bit session tokens, stored as SHA-256 hashes in PostgreSQL. Seven-day expiry, login rotation, logout invalidation and revocation of all sessions after password reset.
- Production cookies: `__Host-` prefix, Secure, HttpOnly, SameSite=Lax, Path=/, no Domain. Local HTTP uses non-Secure host-only cookies.
- Every form mutation, including authentication, requires the exact configured Origin and a random CSRF token matching a host-only HttpOnly cookie. Missing/foreign origins fail closed.
- `Referrer-Policy: strict-origin` excludes paths and token query strings. Browser testing found that `no-referrer` made ordinary form POST Origin headers null; the policy was corrected while preserving the exact-Origin check.
- Verification tokens expire after 24 hours; recovery tokens after 30 minutes. Only hashes are stored. New issuance replaces old tokens. Consumption requires POST and is transactional and single-use, including concurrent attempts.
- Wrong-password and absent-account sign-in both perform scrypt and return the same message. Registration/recovery content is generic; no claim of formally constant-time recovery is made.
- Authentication endpoints: 20 requests per 15 minutes/IP. Private routes: 180 requests per minute/IP. Account/purpose counters persist in PostgreSQL and limit attempts to ten per 15 minutes. IP counters remain process-local and proxy trust is disabled.
- Every private operation checks active membership on the server. Campaign access includes both workspace and campaign IDs. Authorization and mutation share a transaction; membership locks prevent revocation races. Non-members receive generic 404 responses.
- Campaign, membership and ownership mutations commit with audit events. Failed authorization cannot write a successful-action audit event.
- Parameterized SQL and HTML-escaped output; CSP prohibits scripts, framing and external assets. No rich text or uploads are accepted yet.
- Private responses use `Cache-Control: no-store`. Request URLs, client IPs, secrets, cookies and authorization values are omitted from application logs.
- Local email messages are private filesystem files, never a public inbox endpoint. Production startup rejects the local-email fallback.

## Data lifecycle

`npm run auth:cleanup` removes expired sessions, tokens and throttle counters. Expired credentials are rejected even before cleanup. No scheduler is installed. Local email files remain available for development inspection; they contain sensitive action links and must not be committed or uploaded.

Deleted campaigns are recoverable for 30 days. The cutoff is enforced, but purging expired campaigns and media is later hardening work.

## Remaining deployment work

This milestone has not received an independent penetration test. There is no MFA, federated identity, production email, invitation workflow, distributed rate limiter, session-device management UI or scheduled retention job. Production backup/restore, secrets management and incident response remain required before pilots.

The development database account owns its schema. Deployment must separate migration privileges from runtime privileges and review TLS, proxy configuration, recovery operations, legal requirements and log retention. No public deployment or real-user invitation was performed.

## References

- [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [MDN Referrer-Policy and Origin behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [Official Fastify ecosystem](https://fastify.dev/docs/latest/Guides/Ecosystem/)
