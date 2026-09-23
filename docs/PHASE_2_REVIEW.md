# Phase 2 founder review — UX revision

**Phase 2 is not accepted. This revision is ready for another founder review. Phase 3 has not begun.**

## Start and credentials

From `C:\Gyanesh\Startups\CometRow`, run `npm.cmd run setup` if the application is stopped. In a second terminal run `npm.cmd run demo` for the existing Owner, Editor, Viewer and outsider credentials. They are also stored in ignored `.local/demo-accounts.json`. Run `npm.cmd run demo:composer` for the sample campaign link; the command preserves existing edits.

Sign in at http://127.0.0.1:3000/login. Use the exact `127.0.0.1:3000` origin. The Owner email on this workstation is `owner.82aca5a4@example.test`; passwords are printed by `demo`. Open **Workspaces → Studio North · Demo agency → Open studio · Composer review**. Roles apply to this organization, not each account’s personal workspace. Use **Manage campaign → Duplicate** to make a review copy.

## Review the revised experience

1. **Dashboard:** scan campaign status and updated dates, search by name, filter Draft/Archived, and clear filters. Create campaign opens a named creation section. Try the empty search result and narrow the browser window.
2. **Overview:** change the campaign name and click Save name. The button changes to Saving…, followed by Saved and a persistent confirmation. The heading changes after the server confirms the save. A blank/whitespace name produces an error, and unsuccessful requests preserve the input. Normal form submission still works without JavaScript and displays confirmation after redirect.
3. **Build:** the campaign opens as labelled block cards, with Visible/Hidden state and Move up/Move down controls. Select a card to edit. All blocks returns to the structure; Next block advances through it. Add a block opens a grouped library. Remove supports Undo.
4. **Focused editing:** desktop shows your selected block beside its live preview. Cover/accessibility fields can be expanded separately. On mobile/tablet, edit one block, then use Preview this block. This focused preview is deliberately labelled; it is not the whole campaign.
5. **Full preview:** choose Preview campaign in the top navigation. Phone/Tablet/Desktop render all enabled blocks from the same document, with widths 390/768/1200. The page scrolls normally; the embedded campaign has no independent scrollbar. Back to builder returns to editing. Open saved preview reads the server’s last confirmed draft.
6. **Design:** try the palette, typography, accent and corners. Settings are shared across all blocks. No device-specific campaign copies are created.
7. **Save states:** clean drafts say All changes saved and show a disabled Saved button, with “Autosave on · No pending changes.” Its focusable wrapper and tooltip explain the state. Editing valid content activates Save now immediately. Autosave submits after 800 ms. Invalid, retry, saving and conflict states have distinct explanations.
8. **Links:** enter `https://cometrow-review-does-not-exist.invalid/campaign` in Primary action → Destination link. It must save. CometRow checks URL syntax/scheme, not whether the destination exists, and makes no availability request. `javascript:alert(1)` and `https://` must be rejected. Preview links remain inactive.
9. **Permissions:** use another browser profile or sign out before changing roles. Editor can edit. Viewer sees View-labelled blocks and disabled fields; archived campaigns are also read-only. Outsiders cannot access the campaign.

## Exact stale-revision conflict procedure

This exercise tests **composer content**, not Campaign overview → Campaign name. Name updates use the separate Phase 1 rename flow and are not part of document revision conflicts.

1. Open a disposable campaign at its `/compose` URL in a real browser tab A. Copy that exact URL into a second real browser tab B. These must be two separate tabs, not the Build/Design/Preview buttons and not a newly opened tab after A has already saved.
2. In **both tabs**, select **Build → Hero**. Verify both top bars show the same **Draft revision N**. If they differ, reload both _before_ editing. Verify the Headline is initially the same.
3. In A, change **Headline** to `Conflict test A`. Click **Save now** or wait for autosave. Wait until A shows **All changes saved** and **Draft revision N+1**.
4. Switch to B **without reloading, navigating away, or reopening its URL**. It must still show **Draft revision N** and the original headline. If it shows N+1 already, it is not stale: restart with two independently loaded tabs and check that you are actually switching browser tabs.
5. In B, change Headline to `Conflict test B` and click Save now. Expect a prominent focused alert: **This campaign has a newer saved version.** The comparison identifies your base revision N and saved revision N+1. B’s text stays in B; A’s saved text has not been overwritten.
6. Choose **Preview my version** and **Preview saved version** to inspect both full documents. **Use saved version · discard mine** adopts A’s version. **Keep my version** explicitly submits B’s whole document against the shown latest revision. Download my copy preserves a separate JSON backup before either choice.
7. Optional stronger check: while B’s first conflict is open, edit and save A again to N+2. Then click Keep my version in B. B must receive another conflict against N+2. It cannot silently overwrite A’s newer save. Choose the saved version to finish.

Do not use the overview name field for this test. Opening/reloading B after A’s save correctly loads the newer document and therefore does not produce a stale-revision conflict. Ordinary Build/Design/Preview navigation within an already-open composer does not reload the draft or synchronize it.

### Observed result in this revision

Browser tab A and tab B both loaded revision 48. A saved 49. B remained at 48 with its original headline, then received a conflict. A saved 50 while B was reviewing it. B’s Keep my version request based on 49 was rejected again, preserving revision 50. Adopting the saved version completed successfully. Sample text was restored afterward. An HTTP integration regression independently exercises this sequence and verifies the persisted document after rejected writes.

The original founder session cannot be reconstructed from the supplied report, so its exact cause is not asserted. Source inspection found no BroadcastChannel, storage-event synchronization, polling or automatic draft reload between tabs. The verified sequence above distinguishes a stale draft from a fresh reload and from campaign-name edits.

## Save and recovery limits

Unsaved work has a best-effort per-user/campaign/tab sessionStorage backup. Reload recovery is explicit and checks the base revision. Closing the tab, clearing storage or changing browsers can lose unsaved work. Wait for All changes saved or download your copy. There is no permanent offline database, automatic merge, revision-history interface or backup import UI yet. Conflicts choose a whole document.

Media is still placeholders. No public publishing, QR, analytics, production APIs or paid infrastructure have been introduced. This is local review, not production approval.

## Results and screenshots

See [STATUS.md](STATUS.md) for final check results and browser coverage. [UX_REVIEW.md](UX_REVIEW.md) contains before/after screenshots of the dashboard, overview, desktop composer and mobile composer, plus the conflict evidence. Desktop comparison uses 1440×960; mobile uses 390×844. Screenshots are actual browser captures, not mockups.

Repeat engineering checks with `npm.cmd run check` and `npm.cmd audit --audit-level=high`. **Stop for founder approval here. Do not start Phase 3.**
