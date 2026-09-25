# Editor Lab responsive fix

## What was wrong

The original generator treated nearby and overlapping rectangles as columns. It could not know that two buttons were one CTA pair, that the paragraph belonged before the heading, or that a small image was decoration. It split the buttons, reordered content, and enlarged images. The saved design also had several **Custom** Phone and Tablet placements, which the generator correctly left untouched. Earlier tests checked simple layouts and bounds, but did not check these relationships.

## What changed

Editor Lab now builds a layout graph from the Primary design. It can infer simple rows and stacks from clear spacing. For ambiguous designs, the author can set an element's **Content/Decoration** role and create ordered **Row**, **Stack**, or **Overlay** groups, including a group inside another group. A row stays together where it fits and stacks together on narrower screens. Foreground media keeps a sensible size; backgrounds and decorations stay outside content flow. Text is measured at the rendered width. Existing Custom breakpoint geometry remains protected.

For the reported design, I marked the small artwork as Decoration, grouped the two CTAs in a Row, and placed the paragraph, heading, CTA Row, and foreground photo in that order in a Stack. I reset the relevant old Custom placements to Auto **in an unsaved review copy only**. The original saved draft was not overwritten.

## Evidence and remaining limit

The real design was visually checked at 320, 390, 768, 1024, 1200, and 1440 px. The content order and CTA relationship hold; the 1200 px Primary arrangement remains authored. [Before and after screenshots](README.md#responsive-relationships-follow-up---verified-2026-09-26) use the actual uploaded images. Eight adversarial and existing fixtures passed visual checks at eleven widths each. Tests passed: **75 Editor Lab**, **198 browser assertions**, **18 application**, **10 original P0**, and **35 integration**; typechecks, lint, formatting, and build passed.

Freeform coordinates cannot reliably reveal intent in every design. Authors must identify ambiguous groups, intentional overlaps, and decorative elements. A Custom placement will still need a deliberate Reset to Auto or manual adjustment if it conflicts with a new group.

Run `npm run editor:lab` from the repository root and open <http://127.0.0.1:3002/editor-lab>. For a disposable copy of the saved design, use <http://127.0.0.1:3002/editor-lab?review=1>.
