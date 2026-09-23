# Proposed compositional schema and migration

**Proposal and isolated prototype only. No SQL migration, production route, production renderer or production document changes are authorized or performed.**

## Document v2

One document owns a page, ordered sections, containers and elements. Each node has a stable UUID, schemaVersion, kind, type, name, parent ID, ordered child IDs, typed content, constrained layout, token-based style with explicit overrides, a shared typed action and visibility. The page owns campaign theme values. Phone/tablet overrides are sparse layout/style patches; changing the viewing device never mutates data. The application chrome reads the existing CometRow tokens independently.

The prototype uses a normalized node map with a root ID. Validate unique reachable IDs, reciprocal parent links, acyclic topology, page→section→container/element compatibility, bounded counts and values, supported versions/types, action destinations and node-specific content. No arbitrary HTML, CSS, scripts, remote embed execution, absolute page positioning or unknown properties. Invalid draft text remains in the working copy with errors and blocks save; structurally invalid commands are rejected without changing the document.

Use a discriminated content schema per element in production, rather than a generic JSON field accepted by the server. Keep action routing centralized: none, HTTPS/HTTP URL, section anchor, telephone, email, WhatsApp and maps now; hosted download/form submission become available only when their secure backend exists. Validate syntactic destinations without external existence probes.

## Mutation boundary

Typed add, move, update-content, update-layout, update-style, set-action, duplicate-subtree, visibility, delete, apply-layout and replace-document commands are the sole mutation entry. Each checks permission, compatibility and bounds before committing an immutable next document. Applying a layout moves all child subtrees without deleting any content; preview and cancel precede commit. Duplicate generates fresh IDs throughout, including internal anchor remapping. Commands emit audit metadata without logging private content. A single gesture is one history entry; retain 80 entries. Undo/redo never changes the acknowledged server revision.

Production adapter must retain existing tenant/role checks, Origin/CSRF, draft/archive checks, transaction row locks, expected revision, mutation ID, idempotence and audit transaction. UI permissions are only affordances. Local prototype Viewer and storage are explicitly simulations, never security claims.

## Lossless v1 migration

1. Inventory real documents read-only, validate against the existing strict v1 schema and back them up. No migration is executed during this review.
2. Add a v2 reader alongside the v1 reader behind a feature gate after approval. Existing v1 API remains valid. Unknown future schema versions fail safely; do not drop their fields.
3. Map each original block ID to a section ID. Derive child IDs deterministically from original block ID and source JSON path. Preserve original theme, ordering, enabled state and every content value. Every repeated item becomes its own container; individual values become typed elements. Media remains honest placeholders until asset integration. Preserve restricted Markdown source and semantics.
4. Retain the complete immutable v1 source plus a migration provenance map in the migration envelope (outside editable v2 content). This enables exact rollback before v2 edits and field-by-field reconciliation. Do not make original data disappear merely because v2 has a richer renderer.
5. Conversion is an explicit new revision with an audit event, never an in-place destructive rewrite. Atomically compare the original revision so simultaneous saves cannot be lost. No new campaign per device.
6. Fixtures for **brand, hero, media, information, benefits, event, offer, testimonials, cta, actions, contact and footer** must assert deterministic IDs, reachability, value preservation, hidden state, theme and preview equivalence. Include populated optional fields, repeated lists, Unicode, Markdown, empty fields, unsafe/unknown rejection and maximum limits. Visually compare every migrated fixture before rollout.
7. Ship v1 read-only fallback if v2 validation fails. Roll back the feature gate without rewriting new v2 campaigns to v1 (that would lose new compositions). Keep recoverable snapshots, export and version-aware readers. Database retention/backfill scheduling needs a separately approved deployment plan.

The new prototype exercises the graph and command design and includes a pure v1 conversion fixture; it does not establish production migration readiness. Production hardening requires exhaustive strict discriminated schemas, parity with the production renderer and representative customer fixtures before migration approval.

The conversion proof uses readable `block-ID:source.path` child identifiers to make fixture reconciliation easy. The proposed production migration should derive UUIDs deterministically (for example, a fixed migration namespace and source path); that identity encoding is not yet integrated.

## Asset boundary and rendering

Asset references identify workspace-scoped immutable files; metadata includes ID, original filename, MIME, dimensions/duration, byte size, processing state, alt/caption, focal point and optional poster. Usage is derived from node references. Replacement targets a selected element, not every reference. Prototype assets are bundled labelled samples. No uploads/providers/processing/quotas are invented.

One pure prototype renderer supplies editing and clean preview; editing frames and selection attributes are decoration. Integration should extract a shared version-dispatched renderer for authenticated preview and eventual public rendering. Public output must exclude editing controls and must not execute unsafe actions. Publishing and QR are outside this review.

## Local review persistence

Separate IndexedDB revision store, atomic read/check/write transaction, no production connection. Each tab keeps its own acknowledged revision; observing another tab must not silently adopt its revision. A stale save becomes a conflict. Resolution carries the reviewed remote revision; a second remote write causes another conflict. Per-tab recovery stores pending edits separately. This models the server compare-and-swap contract without pretending to be a backend. Download is available before resolution. Tests exercise concurrent saves and a second conflict; production database tests remain authoritative for real authorization.
