# Campaign editor UX audit

21 September 2026 · Design review only · Phase 2 remains unaccepted

## Scope and evidence

This audit covers the campaign creation handoff and `/compose` editor. Dashboard, overview, authentication, administration and future phases are outside this revision. Evidence is the current client, library, schema, renderer, save controller, service and routes under `src/composer/`, plus the preceding founder review and browser evidence in `docs/review/phase-2-ux/`.

## Findings

| Finding                                                                      | Consequence                                                        | Proposed interaction                                                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Build opens a list of administrative cards; the campaign is initially absent | A user must understand the data structure before seeing their work | Open directly on a large campaign canvas; layers become a supporting tool                                        |
| Selection happens in cards and text is edited in a form                      | Editing and its result are spatially separated                     | Click a section on the canvas; edit short text in place; synchronize a contextual inspector                      |
| Build, Design and Preview replace major portions of the interface            | Repeated context switching and lost visual context                 | One workspace, with persistent viewport controls and a dedicated preview mode                                    |
| Only move-up/down controls reorder blocks                                    | Slow repeated clicks for distant moves                             | Pointer drag with explicit insertion lines; retain labelled move actions and keyboard alternatives               |
| Library has descriptions but no visual structures or search                  | Users must infer what each block will look like                    | Searchable categorized library with schematic thumbnails; insert in context                                      |
| Desktop preview defaults to a small phone view                               | Campaign is secondary to settings                                  | Canvas occupies the flexible center; fit and explicit zoom; responsive target widths                             |
| Mobile alternates between a long form and separate preview                   | The composition is hard to remember while editing                  | Canvas-first with Add, Layers and Properties sheets; preview returns to the same selection                       |
| Single removed-block undo is not general undo                                | Experimentation feels risky                                        | Bounded session undo/redo with compound edits and one history step per text-edit session                         |
| New campaign creation redirects to overview                                  | First-time authoring has an extra, unexplained handoff             | After future approval, preserve existing creation service and route new campaigns into an editor starter chooser |

## Foundation to preserve

- Schema v1 is strict: `schemaVersion`, campaign theme, and ordered blocks with UUID, type, enabled flag and type-specific data. There are 12 approved types and a 20-block maximum. There is no existing arbitrary positioning, per-block style, layout variant or media asset reference.
- `library.ts` centralizes definitions, defaults, fields and repeated-item limits. Reuse it; avoid a second type taxonomy.
- `Autosave` validates, serializes requests, retains mutation IDs for uncertain retries and preserves edits made during an in-flight save. It pauses on conflict or blocked authorization. A new visual editor must call this controller rather than bypass it.
- The service locks the campaign and draft rows, requires owner/editor access, checks revision and handles idempotent retries. Read access is tenant-scoped; Viewer and archived campaigns are read-only. CSRF, body limits and CSP apply at the routes/application boundary.
- Rendering escapes strings, restricts links and supports a deliberately small rich-text syntax. Inline editing must accept plain text, never arbitrary pasted HTML. HTTPS syntax does not promise destination availability.
- Current revision conflict, download/recovery copy and session-storage recovery are existing functionality, not optional polish. Campaign names use the separate rename endpoint and currently lack content-revision protection.

## Deliberate design boundaries

The prototype demonstrates layout variants and curated sample-art replacement using a separate presentation map. Those are not valid fields in the existing production schema and will not be posted to it. Their eventual schema design requires approval. No data migration, production route, production editor or renderer changes are part of this design delivery.

“Replace image” in this review means choosing another clearly labelled bundled vector sample. Uploading, fetching stock images, media processing and external APIs remain out of scope. Publishing stays disabled. Prototype saves are local to the review browser and are explicitly labelled as such.
