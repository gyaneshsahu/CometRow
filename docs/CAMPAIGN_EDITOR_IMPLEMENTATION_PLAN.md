# Visual campaign editor implementation plan

Design-stage proposal. Do not execute production steps until the founder approves the interaction design. Phase 3 remains blocked.

## 1. Preserve and inventory

Record production schema v1 fixtures, renderer output, 12 block definitions, theme values, all repeated-item fields and media-slot limits. Preserve UUIDs, hidden state, ordering, URLs, rich text and unknown future-version rejection. Capture a database backup before any eventually approved schema work. No reset or destructive migration is justified.

Keep the existing `/compose`, `/preview`, draft and rename URLs compatible. Keep authentication, tenant membership, roles, CSRF, body limits and CSP at the current server boundaries. Dashboard, overview, workspace and identity changes are not part of this editor replacement.

## 2. Implement reusable editor primitives

Extract editor-only tokens and reusable controls: toolbar, icon button, tabs, field, tooltip, section outline, drop indicator, canvas viewport, selection store, block library card, inspector group, sheet and modal. Keep definitions configuration-driven. Derive display names from the approved block registry. Separate canvas rendering from editor overlays so saved preview and editing cannot drift.

Use typed commands for insert, duplicate, remove, reorder, enable, update field, update theme and rename. Validate command preconditions and limits in UI; retain server validation. History uses those commands or bounded immutable snapshots with explicit text-edit transaction boundaries. Viewport, selection and panel state are not document history.

## 3. Approve the presentation schema separately

The prototype's appearance map is deliberately not in production. Propose an additive schema version for enum-based section layout/tone/spacing only after interaction approval. Define identity-preserving conversion from v1 and retain its defaults exactly. Do not silently persist v2 into a v1 strict validator. Use explicit version dispatch and migration tests; retain original content for rollback. If presentation schema approval is withheld, ship only controls backed by v1 and omit unsupported controls.

Sample artwork is review-only. Production media data remains placeholders until the media architecture is approved. No asset IDs or network integrations are invented in this step.

## 4. Connect commands to the existing reliable saves

Use `Autosave.edit()` and `flush()`, not a parallel save controller. Preserve canonical schema ordering, one request in flight, mutation identity on uncertain retries and changes during a request. Undo issues a normal edit and save. Conflict choice remains whole-document, explicit and revision checked; a new concurrent save can conflict again.

Keep session recovery and download UX discoverable from the save issue state. Stop writes on revoked permissions, expired session or archive transitions. Restore focus and selection after save status updates without rebuilding editable DOM or losing IME composition. Name rename remains a separate acknowledged request with errors; document this limitation unless metadata concurrency is separately approved.

## 5. Add canvas interaction safely

Render escaped content using the shared block components. Plain text contenteditable must synchronize through typed field commands and enforce the same length/content rules. Restrict paste, preserve selection and composition events, and avoid saving incomplete IME input. Rich text remains constrained to the current syntax.

Implement pointer capture, threshold, edge scrolling, cancellation, visible insertion lines and keyboard alternatives. Preserve scroll anchoring after moves. Test first/last positions, hidden blocks, duplicated IDs, cross-frame coordinates at each zoom, long canvases and touch cancellation. Fit scales the canvas; responsive behavior uses canvas width rather than host window width.

Keep the current sandbox/CSP trust boundary. Inline editing requires parent interaction with the preview DOM; it does not justify arbitrary script execution inside campaign content. Do not reuse the prototype server's permissive development surface in production.

## 6. Integrate creation without changing other workflows

Use the current create service and its permissions. Redirect successful creation into the editor's empty-document starter chooser. Starter configurations use ordinary versioned blocks and fresh IDs. Existing campaigns always open their current document. Add a guarded starter replacement transaction only if approved. The back action returns to the existing campaign overview.

## 7. Responsive and accessible behavior

Desktop gets the focused workspace; tablet/phone get canvas plus sheets. Add sheet focus management, background inertness, escape/backdrop dismissal and focus restoration. Keep native field semantics, full-size touch alternatives, focus visibility, contrast and reduced motion. Label icons and communicate all disabled states.

Verify 320/390/768/1024/1440px, keyboard-only operation, browser zoom and 200% text. Verify actual touch, screen reader, Safari/Firefox and composition input before claiming support. Avoid nested scrolling within the campaign itself.

## 8. Regression gate and founder review

Retain all existing tests; add meaningful tests for command/history invariants, schema conversion, transactional save concurrency, selection/caret stability and drag positioning. Repeat owner/editor/viewer/outsider and archived behavior at API and browser levels. Exercise recovery, retries, unsafe URLs, nonexistent HTTPS URLs, two-tab conflicts and conflict resolution racing another save.

Run the full project check/build and dependency audit, then test complete starter and blank journeys in browsers. Capture comparable desktop/tablet/mobile screenshots and update STATUS and the founder review guide with exact actions and known limits. Stop again for Phase 2 acceptance. Do not begin Phase 3 as a consequence of interaction-design approval.
