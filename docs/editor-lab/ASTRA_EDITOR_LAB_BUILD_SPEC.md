# CometRow Editor Lab — Astra Build Specification

Status: approved for an isolated prototype only  
Owner: CometRow  
Implementation target: Astra  
Contract version: 1.0

## 1. Outcome

Build a focused **Editor Lab** that proves CometRow's single-container editing idea before any production integration.

The founder must be able to:

1. Drag **Add Container** into a hero canvas.
2. Choose what the container becomes.
3. Turn one container into an image, expand it across the entire hero, and place it behind other elements.
4. Add heading, paragraph, and button containers above the image.
5. Move, resize, style, overlap, reorder, lock, hide, and edit them.
6. Create a desktop layout, change tablet slightly, and make mobile completely different.
7. See live mobile, tablet, and desktop previews at all times.

This is technically possible. The implementation must use real DOM elements inside a responsive freeform section—not a raster drawing canvas.

## 2. Hard boundaries

Implement inside the existing CometRow repository. Extend or replace the current isolated P0 prototype surface if it is the correct host; do not create a fourth duplicate app.

- Production application/port: do not change.
- Old prototype: do not revive.
- Current isolated P0 prototype: preferred host for this Editor Lab.
- Route: `/editor-lab` (or the existing equivalent if already established).
- No production schema migration.
- No production persistence wiring.
- No authentication, billing, publishing, analytics, collaboration, or backend media pipeline.
- Do not redesign CometRow branding, app shell, logo, colors, or typography.
- Do not delete or rewrite accepted editor work unrelated to this lab.
- Stop after the reviewable prototype and its tests pass. Production integration needs a separate founder decision.

Before editing, Astra must inspect `AGENTS.md`, package scripts, current git status, the current P0 implementation, and these files. Preserve unrelated or user-owned changes.

## 3. The product decision

The old 30-column proposal is superseded **for this lab**.

Use one stable internal horizontal coordinate system of **480 integer units** at every breakpoint. Show a simpler guide overlay to the user:

| Breakpoint | Viewport range | Editor preview | Visible guides | Internal units |
|---|---:|---:|---:|---:|
| Mobile | 0–639 px | 390 px | 8 columns | 480 |
| Tablet | 640–1023 px | 768 px | 12 columns | 480 |
| Desktop | 1024 px and up | 1200 px | 24 columns | 480 |

Why 480: it gives integer divisions for common halves, thirds, quarters, fifths, sixths, eighths, tenths, twelfths, fifteenths, sixteenths, twentieths, and twenty-fourths while still allowing near-continuous dragging. The 8/12/24 guides are visual alignment aids, not storage precision.

Horizontal geometry is responsive:

```text
leftPercent  = x / 480 * 100
widthPercent = w / 480 * 100
```

Vertical geometry uses integer CSS pixels because web pages grow downward. A section may auto-grow to the lowest element plus bottom padding.

## 4. Responsive independence

Each node has a separate placement map for `mobile`, `tablet`, and `desktop`.

- Moving or resizing affects only the active breakpoint.
- Desktop may seed generated tablet and mobile maps once.
- The first manual edit marks that map `origin: "user"`.
- Generated layout must never silently overwrite a user map.
- Node content is shared by default.
- Geometry, visibility, layer placement, cropping, and style overrides may differ by breakpoint.
- To use genuinely different content on mobile, duplicate the node and hide each copy on the unwanted breakpoints.
- Text changes apply to all visible copies of that same node. Geometry changes do not.
- Style controls must clearly offer **This breakpoint** and **All breakpoints**; default to This breakpoint.

Switching breakpoints is not undoable. Editing a breakpoint is undoable.

## 5. Required editor layout

Keep the accepted CometRow shell. Inside the lab, use four areas:

### Top toolbar

- Put **Add Container** in the top center.
- It works as both a drag source and a click action.
- Click adds a centered default container and opens the type picker.
- Include Undo, Redo, zoom, preview, and save-state feedback without crowding the primary action.

### Left preview rail

Show three live thumbnails vertically: Phone, Tablet, Desktop.

- They render from the same document as the active canvas.
- Clicking a thumbnail changes the active breakpoint.
- Only the center canvas is editable; thumbnails never accept drag or selection.
- Thumbnails must update after committed edits, not run three independent editors.

### Center canvas

- Render one freeform hero section for P0.
- Permit placement anywhere inside that section.
- Permit overlaps, but never allow a node to cross the section boundary.
- Show selection outline, resize handles, smart guides, safe bounds, and an overflow warning.
- The section itself can be resized or set to auto height.

### Right inspector

Use collapsible tabs for **Properties** and **Layers**.

- Properties: content, typography, fill, border, radius, opacity, media crop, link, accessibility, visibility, dimensions, and position.
- Layers: semantic reading order, visual layer order, lock, hide, duplicate, and delete.
- Common controls may also appear in a small contextual toolbar beside the selection.

## 6. Container lifecycle

User-facing language stays simple: everything begins as a **Container**.

Internally, an empty drop is temporary UI state only:

1. Pointer drag uses a ghost preview.
2. On valid drop, show a nearby accessible type picker.
3. Required P0 choices: Heading, Paragraph, Image, Video, Button, Shape.
4. Choosing a type creates a typed node and a placement in all three breakpoint maps.
5. Cancel removes the temporary container without leaving invalid saved data.

Also support right-click or the contextual toolbar command **Change type**. If conversion would discard content, require confirmation. The picker must be keyboard accessible; right-click cannot be the only path.

Do not show Icon, Gallery, Form, Stack, navigation, or footer choices until they actually work. The schema and command layer must be extensible, but P0 must not contain dead controls.

## 7. Image-as-background behavior

A normal image node can absolutely act as the hero background.

The founder flow must work:

1. Add an Image container.
2. Choose a bundled sample or upload a local image.
3. Resize it to `x: 0`, `w: 480`, `yPx: 0`, and the section height.
4. Move it to the Background layer.
5. Set `object-fit: cover` and adjust focal point independently per breakpoint.
6. Lock it so later pointer actions select content above it.
7. Add text and button nodes above it.

Provide **Set as section background** as a convenience command. It performs the resize/layer/cover/lock steps but does not convert the image into a different hidden system. Provide **Detach from background** to return it to a normal image layer.

Locked or background nodes remain selectable from the Layers tab. Background/decorative nodes must not intercept pointer events in preview mode.

## 8. Geometry and interaction rules

Use the accompanying JSON Schema as the persisted contract.

- `x` and `w`: integers in 480 horizontal units.
- `yPx`: non-negative integer CSS pixels.
- Height: `auto`, `fixed`, or `aspect`.
- Clamp every committed geometry operation to the active section.
- Minimum interactive target height: 44 px.
- Text defaults to auto height with a minimum height.
- Media defaults to aspect-ratio height and may switch to fixed height.
- Fixed-height text that overflows shows a warning; never silently clip authored text.
- Auto-height section bottom is `max(node bottom) + bottomPaddingPx`, ignoring hidden nodes.

For smooth input:

- Use Pointer Events and pointer capture.
- During drag/resize, render a CSS transform in `requestAnimationFrame`.
- Commit one integer placement update on pointer-up.
- Raw horizontal motion resolves to one of 480 units; do not force every move to a visible column.
- Default vertical rhythm snaps to 8 px.
- Smart guides magnetize edges, centers, equal gaps, section center, and section bounds.
- Holding the platform's precision modifier disables magnetic/grid snapping for that gesture.
- Show the guide or snap result before commit.

No rotation in P0. No moving between sections because P0 contains one section.

## 9. Layering and semantics

Separate visual stacking from reading order.

Visual bands, back to front:

1. `background`
2. `decorative`
3. `content`
4. `interactive`

Each placement also has an integer `layerOrder` inside its band. Avoid arbitrary unbounded CSS z-index values; derive CSS z-index from band plus order.

`readingOrder` controls DOM order, keyboard order, and accessibility order. Reordering a visual layer must not silently change reading order. Buttons and future form controls belong in the interactive band. Decorative nodes are excluded from the accessibility tree.

## 10. Rendering architecture

Use one renderer for all surfaces:

```text
Editor document
  -> breakpoint resolver
  -> section renderer
  -> typed DOM node renderer
  -> active canvas / live thumbnails / preview
```

The active canvas adds selection and manipulation overlays outside the content DOM. Preview and thumbnails use the same section and typed-node renderers without editing chrome.

Do not rasterize text or buttons. Do not use one giant HTML canvas for the page. Real DOM preserves text measurement, links, accessibility, and later publishability.

Suggested module boundaries; adapt names to the existing repository instead of forcing a new folder tree:

- model and runtime validation
- geometry conversion/clamping/snapping
- typed commands and undo/redo history
- shared section/node renderer
- drag/resize interaction overlay
- responsive map resolver/generator
- local persistence and asset store
- editor shell, previews, picker, inspector, layers

## 11. Commands and history

All mutations must go through typed commands. At minimum:

- `AddNode`
- `ChangeNodeType`
- `MoveNode`
- `ResizeNode`
- `UpdateNodeContent`
- `UpdateNodeStyle`
- `SetNodeVisibility`
- `SetLayer`
- `SetReadingOrder`
- `LockNode`
- `DuplicateNode`
- `DeleteNode`
- `SetImageAsBackground`
- `DetachImageFromBackground`
- `SetSectionHeight`
- `ApplyGeneratedBreakpointLayout`
- `ResetBreakpointLayout`

One completed drag or resize equals one undo entry. Typing should coalesce sensibly rather than create one entry per key. Undo/redo must preserve breakpoint origin and never mutate another breakpoint accidentally.

## 12. Local persistence and assets

- Autosave the document to IndexedDB after debouncing committed commands.
- Store local image blobs in an IndexedDB asset store and reference them by `blobKey`.
- Include bundled sample image/video assets for deterministic review.
- Permit local image upload with type and size validation.
- P0 video supports bundled samples or a validated URL; do not persist large uploaded video blobs.
- Export/import document JSON.
- If exported JSON references local blobs, warn that those assets are device-local. An optional embedded image data URL is acceptable only under the configured small-file limit.
- Validate schema version and referential integrity before loading.
- Never execute imported HTML, CSS, JavaScript, or unsafe URL protocols.

## 13. Text and responsive safety

Freeform pages can still fail when copy expands. P0 must mitigate this honestly:

- auto-height is the default for heading and paragraph nodes;
- show live overflow and overlap warnings;
- allow per-breakpoint width, font size, line height, and visibility overrides;
- use semantic `h1`–`h6`, `p`, `a`/`button`, `img`, and `video` elements;
- require image alt text or explicit decorative status;
- preserve authored text without ellipsis unless the user explicitly enables truncation;
- test long German-like copy and narrow mobile widths.

The engine does not promise one layout will be perfect at every width. It provides independent breakpoint maps, fluid horizontal geometry inside each range, warnings, and live review tools.

## 14. Implementation sequence

Implement in this order so every stage stays reviewable:

1. Domain model, JSON Schema integration, seed document, and runtime integrity checks.
2. Shared renderer for one hero and all six P0 node types.
3. Breakpoint switcher and the three read-only live thumbnails.
4. Add Container drag/click flow and accessible type picker.
5. Selection, movement, resize, clamping, smooth transforms, and smart guides.
6. Inspector, styles, layers, reading order, lock/hide/duplicate/delete.
7. Image upload, crop/focal controls, set/detach background.
8. Independent breakpoint editing and one-time generated maps.
9. Typed command history, IndexedDB autosave, JSON import/export.
10. Automated tests, manual acceptance pass, performance/accessibility cleanup.

Do not begin the next item while the previous item has failing tests.

## 15. Quality gates

- Strict TypeScript; no unexplained `any`.
- No console errors during the acceptance path.
- Existing repository checks remain green.
- Unit tests cover coordinate conversion, clamping, snapping, section auto-height, breakpoint independence, generated-map protection, z-order, command undo/redo, schema validation, and URL/file validation.
- Interaction tests cover the founder flow in the acceptance file.
- Test viewport widths: 320, 360, 390, 430, 639, 640, 768, 1023, 1024, 1200, and 1440 px.
- Keyboard users can add, select, nudge, resize through inspector fields, change type, reorder, lock, hide, and delete.
- Respect reduced motion.
- The editor remains responsive with 50 nodes in the hero; pointer movement must not write persistent state every frame.

## 16. Explicitly out of scope

- Production integration or migration
- Multiple sections and cross-section dragging
- Site navigation and footer composition
- Forms and submission behavior
- Icon/gallery/stack components
- Multi-select and grouping
- Rotation, path drawing, masks, filters, animation, or timelines
- Shared multiplayer editing
- Cloud upload/publishing
- AI generation
- Arbitrary custom code

## 17. Astra completion report

When finished, Astra must report only verifiable facts:

- exact route and start command;
- files changed;
- checks/tests run and their results;
- the acceptance scenarios passed or still failing;
- known limitations;
- confirmation that production was not migrated or modified.

Do not label the lab production-ready. Stop for founder review.
