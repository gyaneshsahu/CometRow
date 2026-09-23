# Revised P0 editor — founder review

**Phase 2 remains unaccepted. This is an isolated interaction prototype, not production integration. Phase 3 has not begun.**

## Open the prototype

From `C:\Gyanesh\Startups\CometRow`:

```powershell
npx.cmd tsx scripts/editor-p0.ts
```

Open **http://127.0.0.1:3002**. No login or credentials are required. This loopback-only review server has no production database connection, authentication, external API, upload or publishing endpoint. It stores one review campaign in this browser's IndexedDB. The existing application remains on port 3000 and the earlier prototype remains on port 3001.

The first visit opens an editable fictional event campaign. Subsequent visits load the saved local copy. New campaign replaces only this review copy, with Undo during the session. Review tools exposes deliberately labelled failure/Viewer/offline simulations. Do not use this local-only prototype for real customer records.

## Read before deciding

- [Requirement-by-requirement baseline and revised matrix](EDITOR_P0_TRACEABILITY.md): every numbered specification section and scenario is mapped, including partial and deferred work.
- [Versioned schema and migration proposal](EDITOR_P0_SCHEMA_DESIGN.md): graph/commands, lossless source retention, revision-aware rollout and rollback design. No SQL migration has been created or run for this work.
- [Founder source specification](COMETROW_CAMPAIGN_EDITOR_PRODUCT_SPEC.md): preserved verbatim. It is excluded from automatic formatting so tooling does not rewrite the supplied document.

This revision is substantially deeper than the earlier section-only prototype. It is **not a claim that every P0 detail in the full specification is complete**. The matrix is the source of truth for outstanding design and implementation gaps.

## Suggested review: 15–20 minutes

1. Confirm CometRow's application identity. The shell loads the current production design tokens directly and uses the existing arrow/name treatment. Campaign Style controls affect campaign output only.
2. The default preview is Phone. Click a heading once: the breadcrumb should end at Heading, with Content/Layout/Style/Action. Double-click it or press Enter on the selected text to edit directly. Escape exits editing, then climbs the hierarchy. Click empty canvas to clear selection.
3. Change a heading in its inspector. It should update immediately, show Unsaved changes, then Saved locally with a revision. Rename through the top campaign-name button; the heading/name and save feedback update immediately. Content edits and rename use the same local revision here.
4. Open Layers. Expand the Hero's Content, Copy column and Media column. Select the Button and open Action. Try `https://not-a-real-shop.invalid/product`: it is valid. Try `javascript:alert(1)`: saving is blocked with an explanation. Restore a valid HTTPS URL. No destination availability lookup is performed.
5. Select Image → Choose sample image. Replace it with another bundled sample. Only the selected image should change. Alt/decorative/caption, aspect/fit/focal point and style are real local fields. No upload or media processing controls are shown.
6. Select the Hero **Content container** in Layers → Layout. Toggle Reverse item order to swap its two columns. Select Phone, explicitly enable Edit phone override, change gap/order, then inspect Desktop base values. Reset override removes the device-specific values. Merely changing device does not edit the campaign.
7. Open Add → Elements. Search `signup` to find Form UI; clear search to browse text, buttons, image/logo, price/coupon/countdown, proof/FAQ/contact and containers. Before/after/inside insertion and compatible container moves use the same command boundary.
8. Select a populated container → Add → Layouts. Preview 60/40, cancel, then apply. All existing children must remain; Undo restores the previous arrangement.
9. Drag a section by its labelled handle in Layers. Verify the insertion indicator and resulting order. Select the same section and use Alt+Up/Down or Layout → Move up/down. Duplicate, hide and delete it, then Undo. Deletion is recoverable within the current session.
10. Choose New campaign → Start blank → Use blank page. There should be no secret header or hero. Add a Split hero from Sections, then a FAQ and offer. Undo creation to restore your prior local draft. On mobile, New campaign is also under Review tools.
11. Preview Phone, Tablet and Desktop. The same document adapts. Clean preview removes editing frames. Form controls explicitly do not collect submissions; links are configured safely but sandbox navigation is restricted. Publishing, QR, rules, analytics and AI are absent.
12. On a narrow screen, use bottom Add/Layers/Assets/Properties. The canvas stays primary; the selected item's inspector opens in a sheet. Close panel or Escape returns to the canvas. Move actions provide a touch-friendly alternative to dragging. Undo is in the top bar; Redo is also available in Review tools.

## Failure and recovery

1. Review tools → Fail next save. Select a heading and type. After the debounce, Save failed appears; text and selection remain.
2. Choose Retry save. Wait for Saved locally. The same edited text is saved.
3. Review tools → Simulate offline. Edit again: offline status explains local retention. Review tools → Reconnect simulation resumes saving. This is an explicit state simulation, not a claim to have tested a disconnected network adapter.
4. Download working copy is available in Review tools and conflict review. Pending changes are also retained per tab in sessionStorage when available. Storage loss is reported; leaving with pending edits triggers the browser's unsaved-change warning.
5. Review tools → Switch to Viewer review. The canvas and properties remain readable. Mutation fields/buttons are disabled and commands reject Viewer. This is local role simulation; production security remains server-side and was regression-tested separately.

## Exact two-tab conflict procedure

Use **two separate tabs at the exact same origin and port**: `http://127.0.0.1:3002`. Different browsers, localhost versus 127.0.0.1, or different ports do not share this local store.

1. In tab A, wait for Saved locally and note revision **R**.
2. Open tab B at the same URL. Confirm it also starts at **R**. Do not reload B during the exercise.
3. In B, Review tools → Pause autosave. Edit a heading to `B working copy`. It must show Unsaved changes · autosave paused.
4. In A, edit that heading to `A saved first`. Wait until A reports Saved locally at **R+1**.
5. In B, press Save now. It must show **Another tab saved a newer version**, comparing local **R** with saved **R+1**. B's text is preserved. A's persisted document is not overwritten.
6. Leave B's conflict dialog open. In A, edit the heading again and wait for **R+2**.
7. In B, choose Save my version. It must conflict **again**, now showing **R+2**. The comparison/save transaction uses the reviewed remote revision, so a later save cannot be silently overwritten.
8. Download my copy if desired. Choose Use saved version to load A's latest version, or choose Save my version again when no other save has occurred. Whole-document resolution is explicit; there is no automatic merge.

**Observed browser evidence:** B loaded revision 3; A saved 4; B conflicted. A then saved 5 while B's dialog remained open; B's resolution conflicted again against 5. Use saved version loaded revision 5. Revision comparison and persistence share one IndexedDB read/write transaction, removing the old prototype's non-atomic localStorage race.

## Validation results

- `npm.cmd run check`: typecheck, ESLint, formatting, **18 application unit tests**, **34 real PostgreSQL integration scenarios** (35 including the parent), and production build passed.
- New prototype: strict standalone TypeScript and ESLint passed; **10 model/render/migration regressions passed**. Earlier prototype's **4 tests** also passed.
- `npm.cmd audit --audit-level=high`: **0 known vulnerabilities**, using Node's system CA store after the default CA lookup could not verify the registry certificate. TLS verification remained enabled.
- Browser checks: desktop 1440×960, tablet 768×1024, phone 390×844, narrow 320×740. No horizontal editor overflow at tested sizes; sheets also fit at 320px. Desktop clean campaign preview measured 1200px content/1200px scroll width.
- Exercised selection/breadcrumb, inspector and inline edits, save/failure/retry, atomic two-tab conflicts, safe/unsafe URLs, explicit responsive overrides/reset, sample image replacement, blank creation/Undo, layout preview/cancel, duplicate/Undo, pointer and keyboard reorder, Viewer fields, mobile sheets and three preview modes.
- Browser checks use local Chromium. Native touch hardware, Firefox/Safari, assistive-technology certification and actual 200% browser zoom are **not verified**. The embedded browser did not change zoom when its zoom shortcut was exercised; this is not counted as a passing zoom test. Narrow reflow checks are not a substitute for that test.

## Remaining review gates

Do not approve production integration solely because the screenshots look complete. Important partial requirements remain: rich text range formatting, full strict node-specific server schemas, semantic v1-to-v2 renderer parity, column resize handles, full overlay bands, specialized navigation/FAQ/gallery/form inspectors and richer asset metadata workflows. Section and element libraries cover a useful P0 subset rather than every proposed future variation. The full list is in the traceability matrix.

The pure migration proof retains every v1 value, deterministic identities, theme and visibility, and keeps the exact original document for recovery. It currently represents legacy values generically; it is **not** a production-ready semantic conversion. Production autosave/auth/audit/renderer integration remains untouched and must be designed in reviewed slices after explicit authorization.

Countdown output is calculated when rendered rather than continuously ticking. Form submission, real media uploads/video/audio, publishing, QR codes, routing/rules, analytics and AI are absent. Local history lasts 80 edits in the current session; this is not a durable production version-history service.

## Screenshots

- [Desktop, phone-first canvas](review/editor-p0/desktop.png)
- [Mobile canvas](review/editor-p0/mobile.png)
- [Mobile contextual properties](review/editor-p0/mobile-properties.png)
- [Tablet editor](review/editor-p0/tablet.png)
- [320px editor](review/editor-p0/narrow-320.png)

The previous prototype remains available for comparison in [the earlier review](CAMPAIGN_EDITOR_REVIEW.md). **Stop here for founder review. Phase 2 is not accepted and Phase 3 is not started.**
