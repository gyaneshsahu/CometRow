# Editor Lab: automatic responsive drafts

## The problem

The old generator mostly treated coordinate overlaps as columns. It could split related buttons, reorder copy and enlarge small images. The first relationship-graph fix helped only after manually defining groups in an unsaved review copy. That did not establish useful automatic behavior for ordinary drafts. Earlier tests emphasized bounds and simple fixtures rather than inferred relationships and persistence.

## What changed

The isolated Editor Lab now derives a responsive layout graph from the saved Primary design, without requiring predefined groups:

- Nearby aligned buttons form a row and stack together when they cannot fit.
- Spatial reading order keeps introductory copy before a lower heading. Spanning headings stay above complete columns/cards.
- Copy and CTAs beside a foreground image stay associated when the columns stack.
- Broad artwork behind multiple content elements can become a background. Small isolated artwork is proposed as decoration, with an explanation.
- Text clearly contained above media becomes an overlay. Foreground media is capped at its authored pixel size; text is measured at the target width.

The Primary canvas remains freeform. Existing Custom placements remain protected. Automatic inference is recomputed from saved geometry; explicit corrections are saved in the actual draft, exported and imported. The optional placement `inferredRole` marker separates generated role decisions from deliberate layer choices. Normal Preview now responds to window resizing, including other Desktop widths.

## When a choice is needed

Coordinates cannot reliably distinguish every logo, decorative image, illustration or intentional partial overlap. Select an element and use **Responsive role**, **Keep together with**, **Overlay with**, or **Place before** when the inferred intent is wrong. These are saved, undoable corrections. Advanced groups remain available but are not required for the verified ordinary designs. Complex collages can still require breakpoint-specific art direction; conflicting Custom placements need deliberate Reset to Auto or manual adjustment.

## What was verified

Four new drafts were created through the real UI without predefined relationships: a centered workshop hero, a side-image hero, three feature columns, and text over an image. Desktop, Tablet and Phone were visually inspected. The first hero received only a saved confirmation that its small artwork was decoration, after automatic generation had already worked. Save/refresh, actual file export/import, and a Phone-only Custom move were verified; Primary styles stayed unchanged.

These use separate persistent test-draft namespaces with the normal editor and IndexedDB autosave, not unsaved review copies. The founder's existing draft was preserved. Screenshots, reopen links and the exported workshop draft are in [the review README](README.md#automatic-inference-follow-up---verified-2026-09-26).

Passed: **82 Editor Lab tests, 200 browser assertions, 18 application tests, 10 original P0 tests and 35 integration tests**; both typechecks, lint, formatting and production build. Tests now cover inferred order, CTA grouping, complete cards, roles, overlays, different offsets, multiple Desktop widths, persistence and Custom protection.

Start with `npm run editor:lab`, then open <http://127.0.0.1:3002/editor-lab>. No production source or data was changed.
