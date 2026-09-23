# CometRow — Security, Privacy and Trust Boundary

This document is an engineering baseline, not legal advice. Before a public launch, jurisdiction-specific legal documents and review are required.

## 1. Threat priorities

The platform can be abused for phishing, impersonation, malware distribution, counterfeit products, misleading claims, illegal goods, tracking abuse and resource exhaustion. Public campaign publishing is therefore a security-sensitive feature.

## 2. Mandatory controls

- Email verification before publishing.
- Strong session handling, secure cookies/tokens, CSRF protection where relevant and safe recovery flows.
- Server-side tenant and role authorization for every private mutation/read.
- Rate limits for authentication, uploads, publishing, slug checks, public resolution, events and reports.
- Validate file size, extension, MIME type and file signature/content.
- Bounded signed uploads; no user-selected filesystem paths.
- Malware scanning integration point and quarantine status.
- HTML/rich-text sanitization and a restrictive Content Security Policy.
- Block `javascript:`, dangerous schemes and unsafe redirect behavior.
- SSRF protection if the system fetches YouTube metadata, thumbnails or remote resources.
- Secrets only in environment/secret management; never repository or client bundles.
- Dependency, secret and static security scanning in CI where practical.
- Structured audit trail for publishing, membership, deletion, suspension and ownership changes.
- Backups and a tested restore procedure before real pilot data matters.

## 3. Privacy defaults

- Collect only data required for operation and useful analytics.
- Prefer coarse location, not exact coordinates.
- Do not fingerprint visitors.
- Do not store raw IP addresses longer than operationally necessary; document any short retention/security use.
- Do not load external marketing pixels in the core MVP.
- YouTube embeds must use an appropriate privacy-conscious mode/consent strategy for the Germany pilot.
- Public analytics event payloads are allowlisted and must not accept advertiser-supplied personal data.
- Logs must redact tokens, secrets, sensitive headers and unnecessary visitor identifiers.

## 4. Trust and moderation

- Public campaign clearly identifies the advertiser/business when supplied and exposes a report action.
- Define prohibited categories before real users publish.
- Administrator can suspend a campaign instantly and record a reason.
- Suspended campaigns display a neutral unavailable page and do not follow campaign redirects.
- Retain sufficient evidence for abuse handling while respecting retention limits.
- Provide a documented copyright/impersonation contact process before public launch.

## 5. Security gates requiring founder approval

Ask before:

- enabling arbitrary pixels/scripts;
- accepting regulated or high-risk advertisement categories;
- adding exact geolocation or visitor profiling;
- exporting personal visitor data to third parties;
- weakening upload, authentication or tenant-isolation controls;
- introducing credentials or production integrations.

## 6. Pre-pilot review

Before inviting outside users, complete threat modeling, dependency review, tenant-isolation tests, authorization matrix tests, upload abuse tests, redirect tests, data-deletion tests and a basic incident-response/runbook review.

