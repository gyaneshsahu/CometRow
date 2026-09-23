# CometRow Editor Lab — Acceptance and Test Contract

Use this checklist to decide whether the isolated lab is ready for founder review. It is not a production-release checklist.

## Required founder walkthrough

All steps must pass in one clean session:

- [ ] Open the isolated Editor Lab without changing or migrating production data.
- [ ] See the existing CometRow visual shell, top-center **Add Container**, left Phone/Tablet/Desktop live previews, center active canvas, and right Properties/Layers inspector.
- [ ] Drag Add Container to an arbitrary point in the desktop hero.
- [ ] See an accessible type picker at the drop point.
- [ ] Choose Image and select a bundled image or upload a valid local image.
- [ ] Resize the image freely to cover the hero.
- [ ] Use **Set as section background** and verify full width, cover crop, background layer, and locked state.
- [ ] Adjust the image focal point and verify the crop preview changes.
- [ ] Add a Heading container over the image; change its text, font, size, color, width, and position.
- [ ] Add a Paragraph container; verify auto height grows for long copy.
- [ ] Add a Button container; change label, URL, colors, radius, size, and position.
- [ ] Confirm the image stays behind the heading, paragraph, and button.
- [ ] Confirm the locked image does not steal pointer selection from elements above it.
- [ ] Select the image from Layers and use **Detach from background**.
- [ ] Undo detach, redo detach, then undo again; state must remain coherent.
- [ ] Save/reload and verify document, assets, maps, layers, locks, and styles restore.

## Breakpoint independence

- [ ] Desktop, Tablet, and Mobile each have a complete placement map.
- [ ] First generated maps declare their source and `origin: generated`.
- [ ] Moving/resizing on Desktop changes only Desktop geometry.
- [ ] Make a small Tablet adjustment; Desktop and Mobile remain unchanged.
- [ ] Completely rearrange Mobile, including full-width button and different image crop; Desktop and Tablet remain unchanged.
- [ ] Mark manually changed maps as `origin: user`.
- [ ] Regeneration never overwrites a user map without an explicit reset and confirmation.
- [ ] A style set to **This breakpoint** affects only that breakpoint.
- [ ] A style set to **All breakpoints** updates base/all intended values predictably.
- [ ] Duplicate a node, show it only on Mobile, and hide the original on Mobile to prove truly different breakpoint content is possible.
- [ ] Undo an active-breakpoint edit and confirm no other map changes.

## Live preview behavior

- [ ] Left thumbnails render the same document and renderer as the center canvas.
- [ ] Phone, Tablet, and Desktop thumbnails remain visible together.
- [ ] A committed edit updates all affected previews.
- [ ] Clicking a thumbnail switches the center canvas breakpoint.
- [ ] Thumbnails are read-only and never show selection handles.
- [ ] Only one editable canvas instance exists.
- [ ] Preview mode hides all editor chrome while preserving the rendered layout.

## Geometry and interaction

- [ ] Horizontal values are stored as integer `x`/`w` units in the range 0–480.
- [ ] Vertical values are integer `yPx`; no unnecessary fractional drift appears after repeated moves.
- [ ] A node cannot commit outside section bounds or with `x + w > 480`.
- [ ] Drag and resize feel continuous; visible guide columns do not force coarse jumps.
- [ ] Default 8 px vertical snapping works.
- [ ] Precision modifier temporarily disables snapping.
- [ ] Smart guides cover edge, center, equal-gap, section-center, and section-bound alignment.
- [ ] Each drag/resize creates exactly one undo entry.
- [ ] Text defaults to auto height and never silently clips.
- [ ] Fixed-height overflow produces a visible warning.
- [ ] Auto-height section expands to the lowest visible node plus bottom padding.
- [ ] Background/decorative elements do not intercept preview pointer events.
- [ ] Visual layer order can change without silently changing reading order.

## Container type checks

Only implemented types appear in the picker.

- [ ] Heading renders the selected semantic heading level.
- [ ] Paragraph preserves full authored text.
- [ ] Image supports sample/local asset, alt/decorative state, cover/contain, and focal point.
- [ ] Video supports a bundled sample or validated URL, controls, muted autoplay rules, loop, and poster when available.
- [ ] Button uses a real link/button element and rejects unsafe URL protocols.
- [ ] Shape supports rectangle, ellipse, and line and can be marked decorative.
- [ ] Canceling the picker leaves no invalid or untyped persisted node.
- [ ] Change type warns before destructive content loss.

## Schema and integrity tests

Automated tests must reject or safely repair the following:

- [ ] Unknown schema version.
- [ ] Missing node referenced by a section.
- [ ] Node-map key that differs from `node.id`.
- [ ] Asset reference that does not exist.
- [ ] Duplicate or missing IDs in reading order.
- [ ] Placement missing from any breakpoint map.
- [ ] Placement with invalid bounds, negative `yPx`, or invalid height.
- [ ] `sectionBackground: true` on a non-image node.
- [ ] Interactive node placed in an invalid non-interactive layer without an explicit accessible rendering rule.
- [ ] Decorative image with conflicting non-empty alt behavior.
- [ ] Autoplay video that is not muted.
- [ ] Unsafe `javascript:`, `data:text/html`, or equivalent URL.
- [ ] Oversized or unsupported local asset.

Runtime integrity rules not fully expressible in JSON Schema must live in a tested validator:

1. All IDs resolve and dictionary keys match object IDs.
2. `childIds`, `readingOrder`, and each breakpoint's placement keys contain the same section-owned node set.
3. `x + w <= 480`.
4. Fixed elements fit within fixed sections.
5. Only image nodes may use `sectionBackground`.
6. A background image is full-section, background-band, cover-fit, and locked after the convenience command.
7. User-origin breakpoint maps are never overwritten by generation.

## Responsive content stress tests

Review every scenario at widths 320, 360, 390, 430, 639, 640, 768, 1023, 1024, 1200, and 1440 px.

- [ ] A long English heading wraps without clipping.
- [ ] A German-like heading approximately 40–60% longer remains editable and produces a warning if it overlaps.
- [ ] Button label at 200% text zoom remains usable.
- [ ] Hero background cover crop remains controllable at each breakpoint.
- [ ] Hidden mobile/desktop alternatives do not appear at the wrong breakpoint.
- [ ] No horizontal page scrollbar is created by a valid placement.
- [ ] Focus order follows semantic reading order rather than visual z-order.

## Keyboard and accessibility

- [ ] Tab reaches Add Container, breakpoint controls, canvas selection, contextual controls, inspector, and layers.
- [ ] Enter/Space can add a centered container and choose its type.
- [ ] Arrow-key nudging and inspector fields provide a drag alternative.
- [ ] Focus remains visible and is restored sensibly after dialogs or deletion.
- [ ] Resize/position fields have labels, units, bounds, and validation messages.
- [ ] Interactive targets are at least 44 px high in the rendered design unless an explicit warning is shown.
- [ ] Images require meaningful alt text or explicit decorative status.
- [ ] Reduced-motion preference disables nonessential transitions.

## Persistence and security

- [ ] IndexedDB autosave is debounced and occurs after committed commands, not every pointer frame.
- [ ] Refresh restores the last valid document.
- [ ] Corrupt saved data falls back safely without destroying the recoverable record.
- [ ] JSON export/import round-trips a sample document.
- [ ] Imported data is schema-validated before rendering.
- [ ] Local image blob references restore on the same device.
- [ ] Export warns when device-local blobs are not embedded.
- [ ] No imported custom HTML, CSS, or JavaScript executes.
- [ ] External links use safe protocol validation and safe new-tab attributes.

## Performance and regression

- [ ] Fifty mixed nodes remain selectable, movable, and previewable without persistent writes on every frame.
- [ ] Drag/resize preview uses transform/animation-frame updates and commits once on pointer-up.
- [ ] No console errors or unhandled promise rejections occur during the founder walkthrough.
- [ ] Existing repository type-check, lint, unit, and build commands pass.
- [ ] Production routes and stored documents are unchanged.

## Founder-review evidence

Astra's completion report must include:

- [ ] Exact start command and Editor Lab URL.
- [ ] Exact files changed.
- [ ] Test commands and truthful pass/fail results.
- [ ] One screenshot each for Desktop, Tablet, and Mobile after independent edits.
- [ ] A short list of known limitations.
- [ ] Explicit confirmation that no production migration or integration occurred.

Founder review is a go only when every required founder walkthrough item passes. Any remaining failure must be listed plainly; it must not be hidden behind a “mostly complete” label.
