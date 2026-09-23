# Implementation status — Phase 2, 21 September 2026

**Phase 0 and Phase 1 accepted. Phase 2 NOT accepted. UX revision completed for another founder review. Phase 3 has not begun.**

## Current gate: revised P0 product-specification review

The complete founder-authored `COMETROW_CAMPAIGN_EDITOR_PRODUCT_SPEC.md` has been read and audited. The [traceability matrix](EDITOR_P0_TRACEABILITY.md) records the earlier prototype baseline and the revised status of every numbered specification section, plus individual acceptance-scenario steps. [Schema/migration design](EDITOR_P0_SCHEMA_DESIGN.md) proposes a versioned node graph, typed commands, deterministic conversion, lossless v1 source retention and revision-aware rollout/rollback. **No production migration or integration has been performed.**

Run `npx.cmd tsx scripts/editor-p0.ts`, then open `http://127.0.0.1:3002` for the revised, separate P0 prototype. No login is required. [Founder review instructions](EDITOR_P0_REVIEW.md) include screenshots, exact failure/conflict procedures, tests and known gaps. Production remains on port 3000; the old prototype is retained on port 3001 for comparison.

The revised prototype uses the existing CometRow application tokens and logo treatment. It adds section/container/element selection, hierarchical Layers, configuration-driven Sections/Elements/Layouts, contextual content/layout/style/action properties, deliberate inline editing, compatible movement, phone/tablet overrides, layout proposal preview, sample-only image replacement, editable event/launch starters and true blank creation. Typed commands support grouped Undo/Redo and local autosave. IndexedDB compares revisions and writes atomically; browser testing verified a stale tab and a second conflict during resolution without silent overwrite. The outer stage owns canvas scrolling, avoiding a fractional-size inner iframe scrollbar.

Verification: the full application check passes (18 unit tests, 34 PostgreSQL scenarios/35 including parent, typecheck, lint, formatting and production build). New prototype strict TypeScript/lint and 10 regressions pass; the earlier prototype's 4 tests also pass. Dependency audit reports zero vulnerabilities with Node's system CA store and TLS verification enabled. Chromium desktop/tablet/phone/320px checks cover the workflows listed in the review guide. Actual 200% browser zoom, native touch and screen-reader certification remain unverified.

**This is a reviewable P0 prototype, not completion of every P0 requirement or production acceptance.** Rich-text range formatting, resize handles, complete specialized inspectors/overlay bands, strict production node schemas, semantic migration and production renderer parity remain explicit partial requirements. No pretend upload, video/audio processing, publishing, QR, routing/rules, analytics or AI controls were added. Phase 2 remains unaccepted; stop for founder review before any production integration. Phase 3 has not begun.

## Previous visual editor interaction prototype (superseded review)

The founder requested a canvas-first interaction redesign focused only on campaign creation/editing. A separate prototype is available at `http://127.0.0.1:3001` via `npx.cmd tsx scripts/editor-prototype.ts`. It includes starter/blank creation, direct plain-text canvas editing, sample artwork replacement, contextual Content/Layout/Style properties, drag insertion/reorder, undo/redo, viewport/zoom/preview and mobile sheets. Saves are explicitly local to this review copy.

**Production editor, routes, schemas, services and migrations have not been changed for this design exercise.** Phase 2 is still unaccepted. Stop for founder interaction-design approval before production implementation; Phase 3 remains blocked.

Review [CAMPAIGN_EDITOR_REVIEW.md](CAMPAIGN_EDITOR_REVIEW.md) for screenshots and exact founder steps. Supporting artifacts: [audit](CAMPAIGN_EDITOR_UX_AUDIT.md), [specification](CAMPAIGN_EDITOR_SPEC.md), [traceability](CAMPAIGN_EDITOR_TRACEABILITY.md), [implementation/preservation plan](CAMPAIGN_EDITOR_IMPLEMENTATION_PLAN.md). New block appearance choices are prototype-only proposals and need approved versioned schema design before production use.

Prototype checks pass (4 model tests, strict TypeScript and ESLint), and the existing full application check/build remains green (18 unit tests + 34 real-PostgreSQL scenarios). Responsive browser evidence and limitations are recorded in the new review guide. The earlier UX revision below describes the existing application, not acceptance of the new interaction design.

## Founder-feedback revision

- Reworked dashboard hierarchy, campaign status cards, search/filter controls, creation entry, overview actions and navigation labels. Shared tokens define type, spacing, color, focus, surfaces and controls across workspace and composer.
- Campaign-name saving now shows immediate Saving… feedback, a confirmed heading update, persistent Saved confirmation and error feedback without discarding input. Non-JavaScript form fallback still redirects with confirmation. The JSON path retains role, tenant and CSRF checks.
- Replaced the composer's three independent scroll panes with block cards, focused per-block editing and contextual preview, plus an explicitly labelled full-campaign view. Mobile/tablet use the same navigation with All blocks, Next block and Preview this block. Repeated-item controls are labelled; advanced field sections are configuration-driven. The preview iframe sizes to content so the page has one scroll surface outside the modal library.
- Saved/dirty/saving/invalid/retry/conflict states have visible explanations. Clean drafts say Saved rather than leaving an unexplained disabled Save now control. Valid edits activate Save now immediately. Current revision is visible.
- Conflicts now announce and focus a prominent alert, with both revision numbers. Two tabs loaded 48; A saved 49 while B remained 48. B conflicted. A then saved 50; B's resolution based on 49 conflicted again. No silent draft overwrite was observed, and an HTTP regression verifies both rejected writes preserve the latest document.
- Existing schemas and safe URL behavior were retained: a nonexistent HTTPS `.invalid` destination saves; unsafe or malformed schemes fail. Field guidance explicitly says availability is not checked. There are no external lookups.
- Before/after screenshot evidence: [UX_REVIEW.md](UX_REVIEW.md). Exact conflict and founder checks: [PHASE_2_REVIEW.md](PHASE_2_REVIEW.md).

## Revision verification

`npm run check` passes: **18 unit tests and 34 real-PostgreSQL integration scenarios**, typecheck, lint, formatting and production build. The integration runner counts the parent suite as a 35th test. No failures, skips or cancellations. Existing tests were retained; new regressions cover enhanced rename feedback/auth/CSRF, nonexistent HTTPS hosts, and stale conflict resolution after a second writer advances the revision.

`npm audit --audit-level=high` reports **zero known vulnerabilities** across production and development dependencies.

Browser checks cover desktop 1440×960, tablet 768×1024, mobile 390×844 and narrow 320×740. Verified dashboard filters and empty results; creation entry; confirmed rename and blank-name errors; clean/dirty save states; new-block saves; hide/reorder/remove/Undo; themes; selected/full previews and device widths; valid nonexistent and unsafe links; and the two-tab conflict sequence. Checked pages have no horizontal document overflow. Only the document scrolls in the builder; a modal library uses its own single scroll surface. Screenshot captures are in `docs/review/phase-2-ux/`.

Local Chromium and Windows/PostgreSQL were exercised. Firefox/Safari, native touch hardware, screen-reader certification, production deployment and independent penetration testing were not performed. Browser network-failure behavior remains covered by deterministic autosave transport tests rather than an offline emulator. The original founder-session behavior could not be reconstructed; the guide explains verified distinctions without claiming its unknown cause.

## Implemented

- One schema-versioned campaign document, strict server/client validation, stable block identities and centralized limits.
- All twelve approved core blocks: brand, hero, media placements, rich information, benefits, date/location, offer, testimonials, primary action, secondary actions, contact and identity/legal footer.
- Configuration-driven field and repeated-item controls; add, edit, hide, remove with Undo, and keyboard-operable reorder. Safe rich text supports paragraphs, bold, italic and lists.
- Three palettes, a validated brand accent with contrasting button text, two typography choices and two corner styles.
- A responsive composer with Build/Design/Preview navigation, block cards, focused editing and contextual preview. Phones and tablets switch between focused editing and preview. Phone 390, Tablet 768 and Desktop 1200 previews render one document. Authenticated saved preview uses the same renderer.
- Debounced autosave, visible status, serialized writes, idempotent uncertain retries, revision-conflict comparison and explicit resolution. Current-tab backup/recovery and downloadable recovery copy are included.
- Phase 1 tenant/role enforcement reused for every draft read/write and preview. Viewer and archived campaigns are read-only. Additive migration 003 preserves existing campaigns.
- Optional, idempotent local composer review fixture (`npm run demo:composer`). Existing fixture content is preserved on repeat runs.

## Founder review

Run `npm run setup` if the app is stopped. Run `npm run demo` to display credentials and `npm run demo:composer` to display the populated review link. Sign in at `http://127.0.0.1:3000/login`, then open **Studio North · Demo agency → Open studio · Composer review → Open composer**. Roles apply to the shared organization, not each account’s personal workspace.

Follow [PHASE_2_REVIEW.md](PHASE_2_REVIEW.md) for the complete review sequence, conflict exercise and expected permissions. Phase 1’s guide remains historical background.

## Initial delivery validation (historical)

- `npm run check` passed: typecheck, lint, formatting, **17 unit tests + 32 real-PostgreSQL integration scenarios** (initial delivery; superseded by revision results above), and the production server/client build. The integration runner reports 33 tests because it also counts the parent suite. No failures, skips or cancellations.
- Unit tests cover all block defaults/rendering, strict schemas, HTML/URL/style injection rejection, dates, limits and the autosave state machine, including edits during requests, lost-response retries, conflicts and blocked/invalid states.
- Real PostgreSQL integration covers migrations and all Phase 1 regressions, plus composer reads/writes, exact-Origin CSRF, tenant/role isolation, simultaneous revisions, idempotency, malformed documents, duplicate independence, revocation, archived/deleted records and expired sessions.
- Browser review: desktop 1366×900, tablet 768×1024, phone 390×844 and narrow 320×740. Inspected live and saved rendering, all device selectors, themes, add/edit/hide/reorder/remove/Undo, validation, autosave persistence, Viewer controls and both two-tab conflict choices. Checked layouts have no horizontal document overflow.
- Browser review found and fixed desktop grid height overflow, focus loss after reorder, cramped tablet composition, and repeated autosaves caused by new-block field ordering. A regression test now proves new blocks settle into the saved state. Tablet now uses focused Content/Preview views. Global validation feedback remains visible in Content view.
- `npm audit --audit-level=high`: zero known vulnerabilities across production and development dependencies at verification time.

Tests run locally on Windows against isolated PostgreSQL 18.4. CI is configured but has not run remotely. Browser coverage uses the in-app Chromium browser; native touch, Firefox/Safari and assistive-technology testing remain unverified. A browser automation MutationObserver error appeared without an application source URL; no corresponding observer exists in the composer, and the app workflows completed. Network interruption/retry is covered with deterministic transport tests rather than a browser offline emulator.

## Limitations and deliberate scope

- Media blocks are placeholders. No uploads, embeds, external API requests or production integrations.
- All previews require membership. Links and the report action are inactive; no public publishing, QR codes or analytics.
- Drafts may be incomplete. Publishing-readiness rules and legal/report flows belong to later phases.
- Conflict resolution selects an entire document; no automatic field merge, real-time collaboration or revision-history interface.
- Browser backup is best-effort sessionStorage. Closing the tab, clearing storage or changing browsers can lose unsaved work; wait for All changes saved or download a copy. Recovery import UI is not included.
- Campaign name changes still use Phase 1 last-write-wins semantics. Composer content uses revision checks.
- Existing Phase 1 operational limits remain: local-only email, verified-existing-account membership, operator-assisted ownership transfer, process-local IP rate limiting, manual retention cleanup and outstanding deployment hardening.

## Phase 3 — only after founder review

Local/S3-compatible image upload, image processing and lifecycle; a video-service interface with local fake and optional YouTube support; thumbnails/caption files, lazy loading, failure states and upload security/limits. No paid provider is required. Ask before any external provider or production credentials. **Stop here until the founder accepts Phase 2 and authorizes Phase 3.**

## Delivered in the first milestone

- Reviewed all seven specification documents and recorded the implementation sequence.
- Created a Node.js 24 / TypeScript / Fastify application using standard PostgreSQL.
- Added validated environment configuration, provider interfaces and centralized pilot limits.
- Added transactional, checksum-verified SQL migrations and idempotent synthetic seeds.
- Added the branded development preview and liveness/readiness endpoints.
- Added a one-command local database/application startup and a Docker Compose alternative.
- Added strict type checks, linting, formatting, tests, compilation and a CI workflow.

## Historical Phase 0 validation

- Type checking, linting and formatting passed.
- Six HTTP/configuration tests passed.
- Six database integration scenarios passed against real PostgreSQL 18.4 (the test runner also counts their parent suite as a seventh test).
- Integration coverage includes empty-database migration, repeat execution, seed restrictions, cross-workspace foreign-key rejection, invalid roles/deletion state, checksum tampering and transactional rollback.
- Production TypeScript compilation passed.
- Local setup successfully initialized and subsequently reopened the persistent development database.
- Browser inspection covered desktop and narrow mobile layouts. A decorative overflow was found and fixed.
- Dependency installation reported zero known vulnerabilities.

Correction: Docker and PostgreSQL were installed but absent from the initial shell PATH. Phase 1 verified their executable paths and versions. The initial local database remains intact.

Local data is kept under `.local/` and credentials in the ignored `.env`. The Windows launcher uses PostgreSQL's own controller for graceful shutdown because the upstream package's process termination can hang under restricted permissions. The launcher remains development-only.
