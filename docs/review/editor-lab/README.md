# CometRow Editor Lab — founder review handoff

Status: isolated prototype ready for founder review. This is not production acceptance or authorization for integration. Phase 2 remains unaccepted.

## Start and review

From `C:\Gyanesh\Startups\CometRow`, run:

```powershell
npm run editor:lab
```

Open <http://127.0.0.1:3002/editor-lab>.

The existing P0 server remains the host on loopback port 3002. The original P0 surface at `/` is preserved. The old port-3001 prototype was not started. The production server, editor, routes, schema and persistence were not modified or migrated.

Browser acceptance runner: <http://127.0.0.1:3002/editor-lab/tests>. Opening this route runs the tests automatically, using a separate IndexedDB test database for each run. It does not replace the founder's lab draft.

## Changed files

Modified:

- `package.json` — Editor Lab start, unit-test and strict-typecheck scripts; pinned AJV development dependency.
- `package-lock.json` — corresponding dependency declaration.
- `.prettierignore` — preserve the founder-authored build specification and JSON Schema verbatim; their original formatting failed the repository formatter.
- `scripts/editor-p0.ts` — add Editor Lab and browser-test routes/assets to the existing isolated server.

Added under `docs/prototypes/editor-p0/`:

- `lab-model.ts` — contract types, exact supplied JSON Schema integration, integrity/security validation, seed, geometry and snapping.
- `lab-commands.ts` — typed mutations, independent maps, generation protection, history.
- `lab-render.ts` — shared semantic DOM renderer, live measurements and warnings.
- `lab-storage.ts` — isolated IndexedDB document/blob storage and corruption recovery.
- `lab-app.ts` — shell, preview rail, picker, pointer gestures, inspector, layers, confirmation dialogs and JSON transfer.
- `lab.html`
- `lab.css`
- `lab-sample.svg` — reuses the existing P0 studio artwork.
- `lab-sample.webm` — bundled two-second synthetic studio-color video, generated locally.
- `tsconfig.lab.json` — strict checking for the prototype modules.
- `lab-model.test.ts`
- `lab-commands.test.ts`
- `lab-integrity.test.ts`
- `lab-browser-tests.ts`
- `lab-tests.html`

Added review evidence under `docs/review/editor-lab/`:

- `README.md` — this report.
- `browser-results.txt`
- `desktop.png`
- `tablet.png`
- `mobile.png`

Temporary tooling, hash baseline, upload fixture and package cache are under ignored `.local/editor-lab/` and `.local/npm-cache/`. The required build regenerated ignored `dist/` output. No source changes were made under `src/` or `migrations/`.

## Verification results

| Check                                                    | Result                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `npm run typecheck`                                      | Pass                                                                    |
| `npm run typecheck:editor-lab`                           | Pass                                                                    |
| `npm run lint`                                           | Pass                                                                    |
| `npm run format:check`                                   | Pass; founder documents preserved through explicit formatter exclusions |
| `npm test`                                               | 18 passed                                                               |
| `npx tsx --test docs/prototypes/editor-p0/model.test.ts` | 10 passed                                                               |
| `npm run test:integration`                               | 35 passed; dedicated temporary PostgreSQL test databases only           |
| `npm run test:editor-lab`                                | 32 passed                                                               |
| `npm run build`                                          | Pass                                                                    |
| `/editor-lab/tests`                                      | 88 browser assertions passed; full output in `browser-results.txt`      |
| Production source/migration SHA-256 comparison           | Zero changed files                                                      |
| Browser errors on final manual review tab                | None reported                                                           |

The workspace contains no `.git` directory. `git status` was attempted at the start and reported that this is not a git repository; a git diff could therefore not be produced.

The browser suite checks all required widths: 320, 360, 390, 430, 639, 640, 768, 1023, 1024, 1200 and 1440 px. It exercises long copy, auto height, overlap warnings, 200% button typography, DOM reading order, the shared renderer, independent edits, scoped styles, background behavior, undo/redo, JSON validation, reload and recovery. It also adds 46 containers through actual UI handlers to exercise a 50-node editor, changes geometry, switches breakpoints, saves and reloads the complete document. In the recorded run, those 46 additions plus movement and switching took 5.484 seconds total; this is an observation, not a performance guarantee.

## Founder walkthrough evidence

The following behaviors were verified with the browser suite and real browser input:

- Existing CometRow identity, top-center Add Container, three previews, editable hero and Properties/Layers.
- Real pointer drag of Add Container to an arbitrary desktop point and an accessible type picker; keyboard Space also opens the picker.
- Sample image, local PNG upload, decoded local blob after reload, cover crop, focal-point control, full-section background band and lock.
- Editable heading, paragraph and real-link button above the background, with scoped typography, color, geometry and independent tablet/mobile layouts.
- Locked background excluded from pointer selection but selectable from Layers.
- Real pointer movement and resize; a single Undo restores an entire completed drag, and Redo reapplies it.
- Background detach / Undo / Redo / Undo coherence.
- Save/reload preserves content, assets, maps, styles, locks and layers.
- Destructive type change opens an in-editor confirmation dialog; cancel leaves the original typed node intact.
- Three final screenshots show independent layouts. Mobile has a different crop, wider text, and full-width button; tablet has a smaller layout adjustment.

No required founder-flow failure is currently known. Founder judgment on interaction quality remains the next decision.

## Remaining prototype limitations

- One hero, six container types, local single-user work only. Use one editing tab per draft; cross-tab conflict resolution is not implemented.
- Uploaded image blobs stay in this browser/device. JSON export warns about this and does not embed image files; importing elsewhere requires those assets to be available locally.
- Images are limited to PNG, JPEG, WebP or GIF, up to 5 MB. Videos use the bundled sample or safe HTTP(S) URLs; external playback also depends on the remote host and browser codec support.
- Undo history, selection and zoom are session state and are intentionally not persisted.
- Freeform text can overlap or overflow when copy grows. The lab preserves authored text, displays warnings and offers independent breakpoint controls; it does not automatically redesign authored layouts.
- No production integration, publishing, cloud storage, authentication, collaboration, migration, or expansion into Phase 3.

## Screenshots

### Desktop

![Desktop](desktop.png)

### Tablet

![Tablet](tablet.png)

### Mobile

![Mobile](mobile.png)
