# Campaign editor interaction specification

21 September 2026 · Proposed design · Founder approval required before production implementation

## Product intent

A focused visual campaign builder, not a general website builder. The campaign is the primary working surface. Users select sections directly, edit short text in context, and use a relevant inspector for structured content. Responsive sections preserve a coherent reading order without free positioning or device-specific campaign copies.

This specification covers the campaign creation handoff and editing workspace only. Existing dashboard, overview, identity, administration and later phases are unchanged.

## Review artifact

Run `npx.cmd tsx scripts/editor-prototype.ts` from the project root, then open http://127.0.0.1:3001. No login is needed. This is an isolated, loopback-only design server, separate from the application on port 3000. All artwork is bundled SVG sample material. No external requests, uploads, production API calls, database writes or dependencies were added.

The first visit opens a realistic six-section **Fieldnotes · Open studio** review campaign. Subsequent visits reopen the saved local review copy. **New campaign** demonstrates the starter chooser and blank flow; it replaces only that local review copy and can be undone in the same session. This prototype is not a multiple-campaign dashboard.

## Desktop workspace

| Area         | Responsibility                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top toolbar  | Return link, editable name, explicit local save status, undo/redo, Preview and disabled Publish                                                                        |
| Review strip | Clearly identifies the prototype; New campaign and review help are design-review entry points                                                                          |
| Left panel   | Add, Layers and Media. Search and category filter for all twelve approved blocks. Visual thumbnails communicate structure. Layers reflect canvas order and visibility. |
| Center       | Large responsive campaign canvas, Phone/Tablet/Desktop controls and Fit/50/75/100/125% zoom. Canvas is the flexible-width dominant region.                             |
| Inspector    | Selected section only. Content, Layout and Style. Relevant fields, repeated items and progressive disclosure. Global appearance controls are labelled “All sections.”  |

The workspace fills the viewport. The canvas scrolls as one document: its iframe expands to the document height and has no internal scrollbar. Long libraries/properties scroll within their respective side panels. There are no scrollable cards or nested lists. The editor chrome stays in place while the campaign scrolls. Inspector textareas grow with their content, avoiding an additional internal scrollbar. Viewport changes disable browser scroll anchoring so the canvas does not jump unexpectedly.

## Selection and direct editing

- Clicking a section selects it and updates Layers and the inspector. Hover and selected outlines differ. Selection itself does not save or create history.
- Clicking a short text field edits plain text directly on the canvas. Native caret, IME composition and text selection must survive updates. Pasted HTML is reduced to plain text. The inspector remains an accessible alternative.
- Section toolbar exposes a drag handle, duplicate, visibility and deletion with accessible names and tooltips. Move up/down live in the inspector as secondary alternatives; Alt+Up/Down operates on a section or handle.
- A selected hidden section remains visible as a faded editing placeholder. Preview omits it.
- Rich information retains the existing restricted formatting syntax in the inspector; the canvas renders it. Structured dates, URLs, legal links and repeated items remain in the inspector.
- Add controls between sections choose an explicit insertion point. Clicking a library card inserts there, otherwise after the selection. With no selection it appends. Dragging a library card chooses placement directly.

## Reordering

Pointer movement must exceed a small threshold before becoming a drag. The pointer captures the handle, a labelled ghost follows it, and a clear insertion line marks the destination. Crossing the midpoint of a section chooses before or after. Layers and canvas share one order. Canvas edge scrolling supports longer campaigns. Pointer cancellation must end the drag without changing data. Each completed move is one undoable action.

Accessible alternatives remain available regardless of drag support. Move controls are disabled at order boundaries. Context is announced after a successful move. Native touch-hardware behavior requires validation during implementation; responsive desktop-browser tests cannot certify it.

## Creation and templates

The chooser offers **Open studio**, **Fresh launch** and **Start blank**. Templates are configurations of ordinary blocks, not campaign types. All three enter the same editor. Blank opens the library with a clear “Add a Hero” canvas action. Template cards show an actual visual direction and concise use, not an abstract list of fields.

In production, after approval, the existing create service should create the campaign and enter `/compose` with the chooser. Opening an existing populated document never prompts to replace it. Empty documents may offer the chooser without changing data until a choice is made. Applying a starter to a populated campaign needs an explicit replacement confirmation and an undoable transaction; no silent replacement.

## Media boundary

**Replace sample image** opens three curated local vector samples. It genuinely changes the review canvas and participates in undo/redo and prototype persistence. There is no upload, file picker, stock search, media processing or network asset fetch. The Media panel explicitly explains this boundary. In production before the media phase, the same interaction may offer layout placeholders only; actual asset references must wait for the approved media architecture.

## Layout and style

- Hero: Side by side, Stacked or Centered. CTA: Side by side or Centered. Other blocks use their natural responsive layout.
- Section spacing: Compact, Comfortable or Generous; controlled values, not arbitrary pixels.
- Section background: Light, Soft or Dark.
- Campaign accent: five curated accessible dark accents. Typography: Modern sans or Editorial serif. Corners: Soft or Square. All sections use one campaign theme.
- Phone uses 390 CSS pixels, tablet 768, desktop 1200. Fit scales the view, never creates another campaign. Changing the preview width is not a content edit and must not enter history.

Per-block layout, spacing, background and sample-art selection live in the prototype's separate `appearance` map. They are **not** accepted by production schema v1. Approval of this design is required before choosing an additive, versioned representation. Existing documents must retain their rendered appearance and data.

## Undo, save and error semantics

History contains up to 80 snapshots in this prototype. Add, remove, duplicate, reorder, template selection and appearance changes are individual transactions. A text editing session groups typing into one editor history step. Native text undo applies while typing; Ctrl/Cmd+Z and Shift+Z invoke editor undo/redo outside editable fields. Undoing after a save creates a new save of the restored content, never rolls a server revision backward. History resets on reload.

Prototype saving uses an 800 ms debounce and visible “Save now”, “Saving…”, “Saved locally”, validation, failure/retry and conflict states. Clicking the save status manually saves or opens the relevant issue. A local storage failure retains the in-memory draft. The review guide can simulate one failure. A second tab with a different local revision triggers a version choice. This local simulation is for interaction review, not a substitute for the production transaction and concurrency tests.

Production must retain the existing `Autosave` state machine, idempotent mutation IDs, serialized writes, authoritative revision checks, role/tenant/CSRF enforcement, blocked-state handling, uncertain-retry behavior, explicit recovery and downloadable copy. The status must say “All changes saved” only after acknowledgment. Do not turn a failed request into apparent success. Name updates remain separate unless an approved metadata-revision design changes that contract.

## Mobile and tablet

At 1050px and below, side panels become sheets; they are never squeezed alongside the canvas. Bottom navigation contains Canvas, Add, Layers and Properties. Tapping Properties shows the current selection. The canvas remains the visual anchor, with phone width as the initial mobile target. Add closes back to the canvas after insertion. Layers can reorder with handles or inspector move controls. Sheets have explicit close controls and can be dismissed with Escape or the backdrop. Preview removes editing chrome and returns to the same draft and selection.

At 320px, the toolbar retains campaign name, save status, undo/redo and preview; the unavailable Publish control is omitted. Device controls and zoom remain usable. Inputs use 16px text on mobile to avoid browser zoom. Mobile interactive panel controls are at least 40–44px; scaled canvas controls are supplemented by the full-size sheet controls.

## Visual and accessibility system

Reusable CSS tokens cover ink, muted text, semantic action/success/error colors, surfaces, borders, radius, typography and a 4/8/12/16/24/32px spacing scale. Outlined SVG icons share stroke width and dimensions; no external icon package is required. Names, tooltips and visible text carry meaning beyond icons. Color is supplemented by outline, label and state changes. Visible keyboard focus and reduced-motion support are required.

The prototype uses native buttons, labelled inputs, native dialogs, pressed-state buttons, named iframe/regions and semantic canvas headings. Full screen-reader, Safari/Firefox, IME and physical touch certification remain production acceptance work, not claims made by this visual review.

## Approval boundary

Approve or revise the interaction model, starter chooser, mobile sheets and controlled appearance options. Approval is not Phase 2 acceptance, permission to start Phase 3, or permission to add media/publishing. Production implementation requires the separately documented preservation plan and a new regression/browser review.
