# CometRow — Implementation Phases and Decision Gates

Each phase should end with a working demonstration and passing tests. Astra may change internal sequencing when dependencies justify it, but must preserve the gates.

## Phase 0 — Repository and executable foundation

- Inspect existing repository and constraints.
- Confirm stack and document why it fits portability and local-free development.
- Establish modular boundaries, Docker/local services, environment validation, migrations, CI and test harness.
- Add synthetic seed data and one-command setup.

**Gate:** clean checkout can start, migrate, seed, test and build without paid services.

## Phase 1 — Identity, tenancy and campaign skeleton

- Authentication/email verification using a local development path.
- Personal/organization workspace model and roles.
- Campaign CRUD, lifecycle state foundation and audit events.
- Strict tenant-isolation tests.

**Gate:** roles and cross-workspace denial are proven before composer complexity.

## Phase 2 — Composer and responsive preview

- Versioned block schema and core block library.
- Add/remove/reorder/edit, validation, autosave and optimistic concurrency.
- Limited theming and phone/tablet/desktop preview.
- Accessible responsive public renderer using draft preview data.

**Gate:** founder confirms that the creation and viewing experience matches the intended product before deeper integrations.

## Phase 3 — Media pipeline

- Local/S3-compatible image upload, processing and lifecycle.
- Video-service abstraction, local fake and YouTube embed.
- Thumbnail/caption-file support, lazy loading and failure states.
- Upload security and limits.

**Gate:** no paid video provider is required yet; ask before configuring a real external provider.

## Phase 4 — Publishing, versions, stable URLs and QR

- Transactional snapshot publishing.
- Stable public IDs, optional slugs, last-ten-version history and restore-to-draft.
- Channel links, QR generation, pause/expire/archive/delete behavior.
- Redirect and impersonation controls.

**Gate:** an already printed QR continues working through edit/republish and lifecycle changes.

## Phase 5 — Native analytics

- Allowlisted event ingestion and attribution.
- Video milestones, CTA clicks, views and approximate unique visits.
- Dashboard totals/trends, bot/rate-limit protections and retention process.

**Gate:** metrics are defined correctly and never mislabel clicks as sales.

## Phase 6 — Trust, administration and hardening

- Abuse reporting, suspension and audit interface.
- Security headers, sanitizer/CSP, scanning integration point and operational protections.
- Accessibility, responsive, performance, backup/restore and end-to-end verification.
- Deployment documentation and cost review.

**Gate:** founder reviews the complete local MVP. Only then decide deployment, domain, managed video, email and pilot infrastructure.

## Confirmed identity

The startup and platform name is **CometRow**. The production domain remains undecided.

## Deferred decision register

Ask at the relevant gate, not prematurely:

- production domain;
- production host/database/video/email vendors;
- custom domains;
- built-in lead forms;
- client approval workflow;
- external tracking pixels;
- payment plans and commercial limits;
- German localization;
- final prohibited-content categories and legal documents.

## Required handoff after each phase

- what was implemented;
- demonstration instructions;
- tests and results;
- architectural decisions/changes;
- known limitations and risks;
- costs or credentials introduced (normally none during local development);
- focused questions/approvals needed for the next phase.

