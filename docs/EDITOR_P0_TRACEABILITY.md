# Product specification traceability — baseline audit

Source: [complete founder specification](COMETROW_CAMPAIGN_EDITOR_PRODUCT_SPEC.md). Audit date: 21 September 2026. **Phase 2 is unaccepted. No production integration or Phase 3 is authorized.**

This audit was recorded before revising the prototype. Baseline evidence: `prototypes/campaign-editor/{app.ts,model.ts,visuals.ts,styles.css}`, `src/composer/{schema.ts,library.ts,autosave.ts,service.ts}`. Production capabilities are not counted as implemented prototype capabilities. Supported means the requirement is implemented within the review prototype boundary; partial means important portions remain; missing means absent; deferred means explicitly beyond P0. Parent rows summarize their children. The numbered scenarios are traced individually below.

| Requirement              | Baseline  | Evidence / gap                                                                                          |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------- |
| 1 Direction              | partial   | Vertical blocks, no composition tree.                                                                   |
| 1.1 Brand lock           | partial   | Name retained; prototype purple chrome differs from application blue tokens.                            |
| 1.2 Boundary             | supported | Campaign-only standalone review.                                                                        |
| 1.3 Core promise         | partial   | Whole-block edits; individual objects unavailable; publishing deferred.                                 |
| 2 Product placement      | partial   | Media tab conflates sample art with assets; future features should be omitted.                          |
| 3 Priorities             | partial   | Good section foundation; P0 elements/layouts missing. P1–P3 deferred.                                   |
| 4 Workspace              | partial   | Canvas shell exists, shallow selection.                                                                 |
| 4.1 Desktop              | partial   | Side panels exist; narrower than suggested ranges.                                                      |
| 4.2 Left navigation      | missing   | Add/Layers/Media; no Elements or Layouts.                                                               |
| 4.3 Selection            | missing   | Only block ID; no containers/elements/text-range hierarchy.                                             |
| 5 Toolbar                | partial   | History/status/device controls present.                                                                 |
| 5.1 Identity             | partial   | Name input always editable; generic application back link.                                              |
| 5.2 State                | partial   | Local save states; offline recovery incomplete.                                                         |
| 5.3 History              | supported | 80 snapshots, grouped input, undo/redo shortcuts.                                                       |
| 5.4 View                 | partial   | Devices/Fit exist; desktop defaults on wide windows; scroll resets.                                     |
| 5.5 Publish              | deferred  | Disabled future button should be removed.                                                               |
| 6 Add                    | partial   | Block library only.                                                                                     |
| 6.1 Discovery/insertion  | partial   | Search/groups/drag; no synonyms/recent/compatible-container insertion.                                  |
| 6.2 Sections             | partial   | Twelve approved block types; new library families absent.                                               |
| 6.3 Elements             | missing   | No atomic nodes or insertion.                                                                           |
| 6.4 Layouts              | missing   | Three appearance variants, no reusable structure or preservation preview.                               |
| 7 Assets                 | partial   | Three sample artwork choices.                                                                           |
| 7.1 Asset model          | missing   | Artwork enum; no stable scoped metadata/reference model.                                                |
| 7.2 Images               | deferred  | Real uploads and processing P1; sample replacement currently block-wide.                                |
| 7.3 Video                | deferred  | P1 processing/providers/captions.                                                                       |
| 7.4 Audio                | deferred  | P1 uploads/player.                                                                                      |
| 7.5 Campaign brand kit   | partial   | Accent/type/corners, no asset kit.                                                                      |
| 8 Canvas                 | partial   | Block canvas and drag implemented.                                                                      |
| 8.1 Behavior             | partial   | Blank state, fit; panel/viewport scroll restoration incomplete.                                         |
| 8.2 Sections             | supported | Stable IDs, add/reorder/duplicate/hide/delete/undo.                                                     |
| 8.3 Composition          | missing   | No containers, element movement or constrained widths.                                                  |
| 8.4 Micro-layering       | missing   | Artwork is fixed, no controlled overlay model.                                                          |
| 8.5 Text                 | partial   | Plaintext editing on click; no deliberate entry, formatting or IME guard.                               |
| 8.6 Drag                 | partial   | Sections only; indicators and keyboard alternatives exist.                                              |
| 8.7 Resize               | missing   | No column sizing or element size contract.                                                              |
| 9 Layers                 | partial   | Flat list, no hierarchy or renaming.                                                                    |
| 10 Inspector             | partial   | Whole-block field forms.                                                                                |
| 10.1 Header              | partial   | Block label/actions, no breadcrumb.                                                                     |
| 10.2 Tabs                | partial   | Content/Layout/Style; no action tab.                                                                    |
| 10.3 Layout              | missing   | Spacing and hero arrangement only.                                                                      |
| 10.4 Style               | partial   | Tone/theme only, no per-element tokens/overrides.                                                       |
| 10.5 Responsive values   | missing   | No explicit inherited/override controls.                                                                |
| 11 Contextual inspectors | partial   | Only original block forms.                                                                              |
| 11.1 Page                | missing   | No page selection.                                                                                      |
| 11.2 Section             | partial   | CRUD/content/tone, restricted layout.                                                                   |
| 11.3 Text                | missing   | No selectable text node inspector.                                                                      |
| 11.4 Button/link         | partial   | CTA label/URL inside block; no shared action model.                                                     |
| 11.5 Image               | partial   | Sample swap/alt/aspect only at block level.                                                             |
| 11.6 Video               | deferred  | P1; preserve existing placeholder data.                                                                 |
| 11.7 Audio               | deferred  | P1; no pretend playback.                                                                                |
| 11.8 Gallery             | partial   | Repeated placeholder fields, fixed rendering.                                                           |
| 11.9 Form                | missing   | No form UI; real submission explicitly deferred.                                                        |
| 11.10 Coupon             | partial   | Code string only.                                                                                       |
| 11.11 Countdown          | missing   | No timezone-aware countdown.                                                                            |
| 11.12 Price              | partial   | Existing offer text; no typed amounts.                                                                  |
| 11.13 Testimonial        | partial   | Quote/author/source; no individual selection.                                                           |
| 11.14 Proof/feature      | partial   | Benefit repeater only.                                                                                  |
| 11.15 FAQ                | missing   | No FAQ.                                                                                                 |
| 11.16 Navigation         | partial   | Brand block only; logo not independently selectable.                                                    |
| 11.17 Footer             | partial   | Identity/legal/note available as fields only.                                                           |
| 11.18 Contact/location   | partial   | Original fields exist; no element/action selection.                                                     |
| 12 Creation              | partial   | Blank and two starter choices.                                                                          |
| 12.1 Blank               | supported | Zero blocks.                                                                                            |
| 12.2 Editable templates  | partial   | Block-based; fixed artwork and no elements.                                                             |
| 12.3 Chooser             | partial   | No goal filter or preview-before-apply.                                                                 |
| 13 Responsive            | partial   | One document, media queries.                                                                            |
| 13.1 Structure           | supported | Responsive stacks, not separate device documents.                                                       |
| 13.2 Behavior            | partial   | Desktop default; no explicit phone ordering.                                                            |
| 13.3 Overrides           | missing   | No override data model.                                                                                 |
| 14 Actions               | partial   | Production safe URL validator; prototype has block URL fields only.                                     |
| 15 Rules                 | deferred  | Requires routing engine.                                                                                |
| 15.1 Dimensions          | deferred  | No P2 rules engine.                                                                                     |
| 15.2 Rule editor         | deferred  | Hide entire UI.                                                                                         |
| 15.3 Privacy             | deferred  | No tracking/personalization.                                                                            |
| 16 Mobile                | partial   | Sheets/focus/touch controls; atomic editing absent.                                                     |
| 17 Accessibility         | partial   | Labels/focus/alternatives; no composite navigation, complete zoom audit or screen-reader certification. |
| 18 State                 | partial   | Local-only simulation.                                                                                  |
| 18.1 Autosave            | partial   | Debounce/retry exists; server integration forbidden for this task.                                      |
| 18.2 Conflict            | partial   | LocalStorage check/write not atomic across tabs; no Web Lock.                                           |
| 18.3 Permissions         | partial   | Local Viewer simulation only; production already enforces roles server-side.                            |
| 18.4 Failures            | partial   | Save/validation/conflict; asset/publish failures deferred.                                              |
| 19 Performance           | partial   | Canvas typing preserved; inspector typing rebuilds iframe.                                              |
| 20 Architecture          | missing   | Flat v1 blocks plus unversioned appearance sidecar.                                                     |
| 20.1 Nodes               | missing   | No hierarchy/versioned node data.                                                                       |
| 20.2 Commands            | missing   | Ad-hoc callbacks mutate document.                                                                       |
| 20.3 Evolution           | missing   | No migration proposal/fixtures for compositional model.                                                 |
| 20.4 Rendering           | partial   | One prototype renderer for edit/preview; differs from production.                                       |
| 21 Visual system         | partial   | Prototype introduces different chrome; restore production tokens.                                       |
| 22 Scenarios             | partial   | See item-level audit below.                                                                             |
| 23 Done                  | partial   | Not ready for integration or acceptance.                                                                |
| 24 Workflow              | partial   | Earlier prototype predates this specification; this audit starts new review sequence.                   |
| 25 Decisions             | deferred  | Separate founder approval; no invented integrations.                                                    |
| 26 Research              | supported | Specification provides reference principles; not permission to clone branding.                          |
| 27 Directive             | partial   | Gate respected; deeper P0 prototype required.                                                           |

## Numbered scenario steps — baseline

| Scenario / steps | Baseline  | Gap                                                       |
| ---------------- | --------- | --------------------------------------------------------- |
| A1               | supported | Truly blank available.                                    |
| A2               | supported | Split Hero exists.                                        |
| A3               | partial   | Block editing only; sample art replacement.               |
| A4               | supported | Valid HTTPS destination without host lookup.              |
| A5               | missing   | No media/copy side swap.                                  |
| A6               | partial   | Benefit repeater, no composition.                         |
| A7               | partial   | Offer/code only.                                          |
| A8               | partial   | Testimonial exists, FAQ missing.                          |
| A9               | supported | Section pointer/keyboard movement.                        |
| A10              | missing   | No explicit phone override.                               |
| A11              | supported | Three previews.                                           |
| A12              | supported | Local autosave/undo.                                      |
| B1               | supported | Studio event starter.                                     |
| B2               | partial   | Fixed objects / no element selection.                     |
| B3               | partial   | Date/address/map URL fields.                              |
| B4               | missing   | No RSVP form UI.                                          |
| B5               | missing   | No countdown/timezone.                                    |
| B6               | missing   | No independent sponsor logos.                             |
| B7               | supported | Delete/undo section.                                      |
| B8               | missing   | Not every object selectable.                              |
| C1               | partial   | Existing video placeholder only.                          |
| C2               | deferred  | P1 real assets/posters/playback.                          |
| C3               | missing   | No bounded overlay composition.                           |
| C4               | missing   | No phone anchor override.                                 |
| C5               | deferred  | P1 media/public output.                                   |
| D1               | supported | Simulated save failure.                                   |
| D2               | partial   | Canvas caret stable; inspector refresh may replace DOM.   |
| D3               | supported | Retry current local copy.                                 |
| D4               | supported | Delete/undo.                                              |
| D5               | partial   | Sequential conflict only; simultaneous write race.        |
| D6               | partial   | Whole-version choice; lacks atomic compare/write.         |
| E1               | partial   | UI simulation, not new security boundary.                 |
| E2               | partial   | Section-only keyboard edits.                              |
| E3               | partial   | Block selection/status labels, no hierarchical selection. |
| E4               | partial   | Sheets work; explicit moves only sections.                |

Numbered workflow §24 steps 1–4 are the current authorized deliverables; step 5 is the mandatory review stop. Steps 6–9 are **deferred** until explicit approval. The suggested six implementation slices are a proposal, not permission to execute. The internal numbered lists in §1.3 and §4 map respectively to the scenario rows and §4.1–4.3 above; §8.4 layer bands are all missing in the baseline.

## Revised P0 prototype — implementation trace

Evidence lives in `prototypes/editor-p0`: **M** = `model.ts` and `model.test.ts`; **R** = `render.ts` / `canvas.css`; **U** = `app.ts` / `styles.css`; **S** = `storage.ts`. The browser review and reproducible checks are in [EDITOR_P0_REVIEW.md](EDITOR_P0_REVIEW.md). These statuses refer to the isolated review copy, never production acceptance. Partial rows remain review/integration gates; they are not silently reclassified as future work.

| Requirement | Revised   | Evidence and remaining boundary                                                                                                                                                                                                              |
| ----------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1           | supported | M: structured page/section/container/element graph.                                                                                                                                                                                          |
| 1.1         | supported | Existing `src/web/design-tokens.css` served directly; exact application mark/name/font/tokens. No production brand changes.                                                                                                                  |
| 1.2         | supported | Campaign-only, no unrelated operations or export studio.                                                                                                                                                                                     |
| 1.3         | partial   | Blank/templates, atomic edits, layouts, actions, preview/history/local saving; publishing deferred.                                                                                                                                          |
| 2           | supported | Distinct composition, Assets and campaign theme; future product areas omitted.                                                                                                                                                               |
| 3           | partial   | P0 prototype expanded; production preservation/integration and advanced inspector completeness remain gates.                                                                                                                                 |
| 4           | supported | U: three editing regions plus toolbar, mobile sheets.                                                                                                                                                                                        |
| 4.1         | supported | 264px/320px desktop panels; collapsible, tablet switches to sheets.                                                                                                                                                                          |
| 4.2         | partial   | Add Sections/Elements/Layouts, Layers, Assets; Assets only labelled image samples and campaign theme. Video/audio/upload categories omitted honestly.                                                                                        |
| 4.3         | supported | Nested selection, page/section/container/element, double-click/Enter text, Escape hierarchy; selection retained through save.                                                                                                                |
| 5           | supported | Clear toolbar states/history/view controls.                                                                                                                                                                                                  |
| 5.1         | partial   | Frozen mark, deliberate rename, immediate update/save feedback. Back goes to application campaign list because review draft has no production campaign ID.                                                                                   |
| 5.2         | supported | One status, pending-only manual save, retry/offline/conflict/Viewer; local scope explicit.                                                                                                                                                   |
| 5.3         | supported | 80-step command snapshots; grouped typing; structural gesture is one undo; autosave excluded.                                                                                                                                                |
| 5.4         | supported | Phone default, 390/768/1200, Fit/50/75/100/125, clean preview, scroll retained.                                                                                                                                                              |
| 5.5         | deferred  | No Publish control.                                                                                                                                                                                                                          |
| 6           | partial   | Configuration-driven libraries; broader intended catalogue remains incomplete.                                                                                                                                                               |
| 6.1         | partial   | Synonym search, category/recent, previews, before/after/inside insertion, compatible drops. Incompatible actions reject with feedback rather than every card being pre-disabled.                                                             |
| 6.2         | partial   | 16 section starters, including all original section families plus FAQ/form/blank. Comparison, sticky CTA, navigation and additional compositions are not claimed implemented. Existing video placeholders preserved only by migration proof. |
| 6.3         | partial   | 18 addable element/container choices and form field nodes. Audio/video, ratings, galleries-as-atomic-objects, icon picker and some specialized atoms remain absent.                                                                          |
| 6.4         | partial   | Eight real structural presets, actual proposal preview/cancel, no child loss. Carousel, sticky and specialized form/logo layouts remain absent.                                                                                              |
| 7           | partial   | Honest local sample asset selection.                                                                                                                                                                                                         |
| 7.1         | partial   | Stable sample references, scope/type/dimensions/alt metadata; no production file ownership or usage service.                                                                                                                                 |
| 7.2         | deferred  | Real upload/processing/library management belongs to P1. Selected sample image replacement works locally.                                                                                                                                    |
| 7.3         | deferred  | No video provider/processing/upload controls.                                                                                                                                                                                                |
| 7.4         | deferred  | No audio upload/playback controls.                                                                                                                                                                                                           |
| 7.5         | partial   | Campaign theme/accent/type/corners are independent from application tokens. Full reusable brand kits not implemented.                                                                                                                        |
| 8           | partial   | Composition substantially expanded; remaining manipulation gaps below.                                                                                                                                                                       |
| 8.1         | supported | Dominant canvas, blank/empty insertion, preview excludes scaffolding, selection and scroll maintained.                                                                                                                                       |
| 8.2         | partial   | ID/order/visibility/duplicate/delete/undo, pointer and keyboard movement, edge scrolling. Persistent between-section hover insertion buttons are not yet supplied.                                                                           |
| 8.3         | partial   | Compatible moves, stacks/rows/grids, split ratio, gap/padding/width/alignment, bounded values and device overrides. Numeric column resize is implemented; divider resize handles remain absent.                                              |
| 8.4         | partial   | Contained overlay with image background and nine foreground anchors; no arbitrary z-index. Full band model, offsets and independently selectable overlay/decorative layer tokens remain a design gap.                                        |
| 8.5         | partial   | Deliberate entry, plaintext paste, line breaks, IME guard, stable caret, whole-element bold/italic. Rich-text range formatting, nearby range toolbar and allowed rich paste are not implemented.                                             |
| 8.6         | partial   | Ghost, compatibility check, insertion indicator, edge scrolling, announcement, undo and explicit moves. Library-to-canvas exact placement is less polished than section reorder; native touch hardware unverified.                           |
| 8.7         | partial   | Numeric column bounds, image ratio/fit, auto-height text, width controls; direct resize handles missing.                                                                                                                                     |
| 9           | partial   | Expandable hierarchy, names/type, synchronized selection, hidden state, valid moves and Alt+Arrow. Full ARIA tree keyboard interaction is not implemented; ordinary labelled buttons remain usable.                                          |
| 10          | supported | Contextual property groups and shared controls.                                                                                                                                                                                              |
| 10.1        | supported | Breadcrumb, name/type, labelled duplicate/hide/delete, move actions in Layout and canvas bar.                                                                                                                                                |
| 10.2        | supported | Content/Layout/Style plus Action only for eligible elements. No empty Rules tab.                                                                                                                                                             |
| 10.3        | partial   | Arrangement, columns/ratio, width/max width, gap/padding, alignment/distribution/order. Per-side padding, height and margin presets missing.                                                                                                 |
| 10.4        | partial   | Campaign tokens, bounded size/weight/line-height/tracking/colour/background/border/radius/shadow/opacity and reset. Gradients, hover variants and full type-style tokens missing.                                                            |
| 10.5        | supported | Explicit override checkbox/badge/reset; device switching does not mutate base data.                                                                                                                                                          |
| 11          | partial   | Real inspectors for implemented elements, not the entire eventual element catalogue.                                                                                                                                                         |
| 11.1        | partial   | Internal name/language/theme/accent/type/corners/background/width/spacing; SEO and rules deferred, theme inheritance needs production normalization.                                                                                         |
| 11.2        | partial   | Name, layout, width, spacing, alignment and style; minimum-height/media backgrounds incomplete, rules deferred.                                                                                                                              |
| 11.3        | partial   | Real text, heading semantics, link, width/type/style. Full role presets/rich text range styles absent.                                                                                                                                       |
| 11.4        | partial   | Label, typed Action tab, safe URL/section/phone/email/WhatsApp/maps, resolved destination/new tab, width/variant/style. Icon picker, WhatsApp message, tracking, approved downloads/form submission absent.                                  |
| 11.5        | partial   | Per-element sample replace, alt/decorative/caption/action/ratio/fit/focal point/style. Real assets and custom ratio/crop workflow deferred.                                                                                                  |
| 11.6        | deferred  | P1 media workflow; existing source data retained by conversion fixture.                                                                                                                                                                      |
| 11.7        | deferred  | P1 audio workflow.                                                                                                                                                                                                                           |
| 11.8        | partial   | Gallery section contains independent images in responsive grid. Atomic gallery inspector, carousel/swipe/lightbox absent.                                                                                                                    |
| 11.9        | partial   | Editable form UI, labels/text/email/phone fields, order/required/help/privacy/messages; explicit no submission. Choice/checkbox/consent field types incomplete. Secure storage/spam/idempotence require approval later.                      |
| 11.10       | partial   | Code, copy label, copied feedback, label/terms/expiry text and style. Copy behavior works only in interactive clean preview; post-copy actions absent.                                                                                       |
| 11.11       | partial   | Date/timezone-based calculation and expired message. Live tick refresh, units selector and alternative expiry behaviors are absent.                                                                                                          |
| 11.12       | partial   | Currency/current/compare amount/unit/description/terms, composable coupon/action. Discount badge and full price-format rules incomplete.                                                                                                     |
| 11.13       | partial   | Editable quote/author/source and card styling; photo, rating and verified-source data not invented.                                                                                                                                          |
| 11.14       | partial   | Feature title/text/style/link via composition; statistic and trust badge specializations absent.                                                                                                                                             |
| 11.15       | partial   | Independent editable FAQ items, CRUD/reorder/initial open. Multi/single-open group coordination and full icon/heading configuration absent.                                                                                                  |
| 11.16       | partial   | Editable campaign logo text/brand and composable links. Primary navigation/menu uniqueness and mobile menu behavior absent.                                                                                                                  |
| 11.17       | partial   | Fully editable identity/note/legal action elements. Dedicated organizer/contact/social/legal guidance model incomplete.                                                                                                                      |
| 11.18       | partial   | Contact label/value/action and event address/timezone/maps; maps embeds/privacy integration deferred.                                                                                                                                        |
| 12          | supported | Blank plus event/product launch starters.                                                                                                                                                                                                    |
| 12.1        | supported | One page node, zero sections.                                                                                                                                                                                                                |
| 12.2        | partial   | Every content object in provided starters selectable/editable; sample art clearly replaceable and editor notices fixed/explained. Production template/renderer parity still gated.                                                           |
| 12.3        | partial   | Equal blank option, phone preview before use, replacement warning and Undo. Goal filtering unnecessary for two templates but remains absent.                                                                                                 |
| 13          | supported | One responsive graph, bounded transformations and explicit device overrides.                                                                                                                                                                 |
| 13.1        | supported | Phone stacks rendered structurally; not separate device campaigns.                                                                                                                                                                           |
| 13.2        | partial   | Phone default, stacks/order/grid/width/padding/type constraints; sticky behavior not implemented.                                                                                                                                            |
| 13.3        | supported | Sparse phone/tablet layout/style overrides; no accidental override when changing view.                                                                                                                                                       |
| 14          | partial   | Shared safe typed routes; no network existence lookup. Secure downloads/submissions and WhatsApp message fields absent.                                                                                                                      |
| 15          | deferred  | No Rules UI or routing engine.                                                                                                                                                                                                               |
| 15.1        | deferred  | Requires deterministic routing service.                                                                                                                                                                                                      |
| 15.2        | deferred  | Requires routing service and explicit approval.                                                                                                                                                                                              |
| 15.3        | deferred  | No location, personal profiling, tracking or consent integration.                                                                                                                                                                            |
| 16          | partial   | Canvas-first mobile, four sheets, focus loop/backdrop/Escape, explicit moves and large controls; drag-to-expand sheets/native keyboard/touch device checks remain unverified.                                                                |
| 17          | partial   | Landmarks, visible focus, labelled controls, tab/toolbar arrow keys, live status, alt/decorative, reduced motion and narrow-width checks. Full screen-reader audit and actual 200% browser zoom remain unverified.                           |
| 18          | partial   | Honest local workflow; no server integration.                                                                                                                                                                                                |
| 18.1        | partial   | Immediate local edit, debounce/validation/retry/recovery/navigation guard; remote adapter intentionally not integrated.                                                                                                                      |
| 18.2        | supported | S: atomic IndexedDB revision compare/write; stale and second-resolution conflict verified in two browser tabs; whole-version comparison and download.                                                                                        |
| 18.3        | partial   | Commands reject Viewer and UI disables edits. Local role switch is a simulation; production server checks remain unchanged and regression-tested.                                                                                            |
| 18.4        | partial   | Invalid fields, unsafe action, limit, invalid drop, offline, save error/conflict preserve input. Media/publish failure states deferred with those systems.                                                                                   |
| 19          | partial   | Incremental text edits and inspector node patches; 80 snapshots/20 sections. Structural commands rebuild iframe; media optimization/virtualization are future.                                                                               |
| 20          | partial   | Prototype architectural proof, production schema still v1.                                                                                                                                                                                   |
| 20.1        | partial   | Versioned normalized graph and constrained properties; comprehensive strict discriminated server schemas are proposed, not shipped.                                                                                                          |
| 20.2        | partial   | Typed immutable commands, permissions, validation, audit metadata and history. Production audit/transaction adapter intentionally absent.                                                                                                    |
| 20.3        | partial   | Pure deterministic/lossless conversion fixtures for all 12 types, original envelope retained, unknown v1 schema rejected. Semantic rendering migration and representative production fixture parity still required.                          |
| 20.4        | partial   | One renderer for prototype canvas/clean preview. Production renderer integration/public rendering deferred.                                                                                                                                  |
| 21          | supported | Existing application colours/font/logo reused; consistent states, field spacing, controls, dialogs/sheets. Campaign styles remain separate.                                                                                                  |
| 22          | partial   | Scenario results below; media scenario deferred.                                                                                                                                                                                             |
| 23          | partial   | Review-ready prototype, explicitly not production definition-of-done or acceptance.                                                                                                                                                          |
| 24          | supported | Audit → schema proposal → isolated revised prototype → founder review stop. No integration performed.                                                                                                                                        |
| 25          | deferred  | No new paid/provider/privacy/AI decisions taken.                                                                                                                                                                                             |
| 26          | supported | Follows supplied structural interaction principles without adopting another product’s branding.                                                                                                                                              |
| 27          | supported | Brand preserved, deeper prototype produced, stopped before integration/Phase 3.                                                                                                                                                              |

### Revised scenario trace

| Scenario steps | Revised   | Evidence / limits                                                                     |
| -------------- | --------- | ------------------------------------------------------------------------------------- |
| A1, A2         | supported | True blank, add split Hero.                                                           |
| A3             | supported | Text/image/button individually selectable, sample image replacement only.             |
| A4             | supported | Typed safe URL with no host existence check.                                          |
| A5             | supported | Hero Content container Layout → Reverse order (base).                                 |
| A6             | supported | Three independent benefit elements; add/duplicate/move.                               |
| A7             | supported | Price and coupon composition.                                                         |
| A8             | supported | Testimonial and FAQ sections.                                                         |
| A9             | supported | Pointer and Alt+Arrow section moves verified with Undo.                               |
| A10            | supported | Explicit phone override tested against unchanged desktop values.                      |
| A11            | supported | Phone/tablet/desktop preview controls.                                                |
| A12            | supported | Undo and local autosave; production integration deferred.                             |
| B1             | supported | Editable Open studio starter.                                                         |
| B2             | supported | Content nodes; logo is editable text, image is an explicit sample.                    |
| B3             | supported | Event date/timezone/venue/address and Maps action.                                    |
| B4             | partial   | RSVP form UI with three supported field types; no real submissions.                   |
| B5             | partial   | Timezone countdown; live ticking/expiry variants incomplete.                          |
| B6             | partial   | Independent logo text elements; real uploaded logo assets deferred.                   |
| B7, B8         | supported | No fixed template content; section removal/Undo.                                      |
| C1, C2         | deferred  | Real media-led video experience belongs to P1.                                        |
| C3, C4         | partial   | Generic contained overlay/phone anchor proposal; video-specific behavior not claimed. |
| C5             | deferred  | Captions/playback/public media rendering not implemented.                             |
| D1, D2, D3     | supported | Failure injection, preserved text/caret, Retry verified.                              |
| D4             | supported | Atomic delete/Undo model regression and UI controls.                                  |
| D5, D6         | supported | Verified revision 3→4→5 conflicts and safe explicit recovery.                         |
| E1             | partial   | Local Viewer command/UI checks; real auth integration intentionally absent.           |
| E2             | supported | Keyboard add/edit and Alt+Arrow movement; pointer alternative verified.               |
| E3             | partial   | Live selected/status announcements; actual screen-reader certification not performed. |
| E4             | partial   | Mobile sheets and explicit move controls verified; real touch drag not tested.        |

The numbered §1.3 promise items 1–7 are supported within the above prototype limits; item 8 is deferred. §4.1 regions 1–4 and §4.3 levels 1–4 are supported; text-range selection exists natively but range formatting remains partial. §8.4 bands 1 and 4 have a limited prototype; bands 2 and 3 remain partial/missing. §24 workflow items 1–4 are delivered, item 5 is the current gate, items 6–9 and all integration slices are deferred until approval.
