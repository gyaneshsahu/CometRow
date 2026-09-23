# CometRow Campaign Editor Product Specification

**Status:** Founder review draft  
**Purpose:** Define the complete interaction and capability contract for the CometRow campaign editor before production integration  
**Implementation authority:** This specification authorizes planning and prototyping only until the founder explicitly approves implementation  

## 1. Decision and non-negotiable direction

CometRow will use a **structured visual campaign editor**: responsive sections stack vertically, while selected sections allow controlled element-level composition. It must be substantially more flexible than a locked template editor, but it must not become a general-purpose website builder or unrestricted poster canvas.

The current canvas-first prototype may be retained as a visual starting point. Astra does **not** need to recreate the editor shell merely to make it look different. The next revision must deepen the actual interactions and editing capabilities described here.

### 1.1 Brand lock

The following are frozen unless the founder separately approves a brand change:

- CometRow product name.
- CometRow logo and logo treatment.
- Existing application-shell typeface.
- Existing application-shell colour palette.
- Existing visual tone of the accepted prototype: light, calm, professional and compact.

The editor may introduce missing component states, spacing tokens and neutral interface colours required for usability and accessibility. It must not rebrand the product. Campaign colours, fonts and logos belong to the user-created campaign and must never recolour or restyle the CometRow application chrome.

### 1.2 Product boundary

This editor creates responsive, hosted campaign experiences reached through links and QR codes. It is optimized for product launches, offers, events, promotions, lead capture and short campaign stories.

It is not currently:

- A complete multi-page website builder.
- A Figma replacement.
- A free-position poster or flyer editor.
- A social-media scheduler.
- An advertising-network campaign manager.
- A CRM, task manager or budgeting system.

Those capabilities may later connect to the same campaign, but they must not be forced into the campaign-page editor.

### 1.3 Core usability promise

A nontechnical user must be able to:

1. Start blank or choose a template.
2. Add sections or individual elements.
3. Click any visible editable item on the canvas.
4. Change its real content, layout, action and appearance.
5. Reorder sections and arrange compatible elements without breaking responsiveness.
6. Preview a realistic phone, tablet and desktop result.
7. Undo mistakes and trust autosave.
8. Publish later without the URL or printed dynamic QR changing after ordinary content updates.

If a visible item is intentionally fixed, the editor must explain why. A template must never contain mysterious unselectable decorative or content objects.

## 2. What belongs where

The broad marketing feature list must be divided across the product correctly.

| Capability | Correct product location | Editor treatment |
|---|---|---|
| Headings, text, images, video, buttons, forms, offers, testimonials, FAQ | Campaign editor | Addable and editable content |
| Responsive layouts, grids, columns, carousels, hero arrangements | Campaign editor | Layout library and inspector controls |
| Uploaded images, video, audio, logos and brand assets | Asset hub | Reusable campaign/workspace assets |
| Campaign goal, audience, owner, dates and channels | Campaign overview/settings | Context shown in editor only where useful |
| Dynamic QR creation and destination management | Publish and distribution flow | Publish entry point in top bar; not a media asset |
| UTM parameters and link attribution | Link/action settings and distribution routes | Advanced action settings |
| Time, channel, device and visitor rules | Variant/rules system | Inspector Rules tab after its engine exists |
| Budget, tasks and approval workflow | Campaign operations area | Outside the visual canvas |
| Leads, conversions and performance | Analytics/results area | Outside the visual canvas, with lightweight status links |
| Social post, story, reel, banner and print exports | Future campaign asset studio | Separate output editor, not mixed into the page canvas |
| Tracking pixels | Campaign settings/publish governance | Permission-controlled advanced setting |

**Important:** Dynamic QR belongs to distribution. It may be downloaded or inserted into a future print asset, but it must not be presented as if it were simply another uploaded media file.

## 3. Scope priority

The specification defines the intended editor completely, but implementation must be staged.

### P0 Production editor foundation

- Existing approved content types and data preserved.
- Canvas selection and direct editing.
- Sections, elements, layouts, layers and assets architecture.
- Drag-and-drop plus accessible alternatives.
- Contextual inspector.
- Real content/design/action controls for implemented elements.
- Templates whose visible content is fully editable.
- Responsive previews.
- Undo/redo, autosave, errors, conflicts and permissions.
- Application brand lock.

### P1 Media and publishing

- Real upload, optimization and asset replacement.
- Video/audio processing and posters.
- Publish/update flow.
- Stable short URL.
- Dynamic QR generation/download.
- Publish validation and public rendering.

### P2 Distribution intelligence

- Channel routes.
- Time and lifecycle states.
- Device/channel/source display rules.
- Variants and channel preview selector.
- Tracking parameters and attribution.
- Analytics and conversions.

### P3 Advanced creation

- Additional templates and reusable saved sections.
- Limited animation presets.
- Campaign asset outputs for social/ads/print.
- AI campaign assistant using the same validated editor commands.

No unavailable P1–P3 control should pretend to work. Hide it, label it clearly as unavailable, or provide an isolated prototype. Never ship dead controls.

## 4. Workspace information architecture

### 4.1 Desktop shell

The desktop editor contains four persistent regions:

1. **Top toolbar:** navigation, document state, history, viewport, preview and publish.
2. **Left sidebar:** add content, inspect hierarchy and manage assets.
3. **Centre canvas:** primary creation surface.
4. **Right inspector:** properties of the current selection.

Recommended dimensions at a 1440px-wide viewport:

- Top toolbar: 56–64px high, plus an optional compact status strip only when needed.
- Left sidebar: 248–280px, user-collapsible to an icon rail.
- Right inspector: 304–352px, user-collapsible.
- Centre canvas: all remaining width, never reduced below the usable minimum without collapsing a side panel.
- Panel dividers may be resizable within safe limits, but sensible defaults must work without adjustment.

These are design ranges, not hard-coded requirements for every viewport.

### 4.2 Left sidebar navigation

Use three stable top-level modes:

- **Add**
- **Layers**
- **Assets**

Inside **Add**, use three submodes:

- **Sections:** complete, conversion-oriented responsive blocks.
- **Elements:** atomic content and interaction components.
- **Layouts:** empty structural arrangements and containers.

This is clearer than placing complete Hero templates beside atomic text boxes with no distinction.

Inside **Assets**, use:

- Images
- Video
- Audio
- Logos
- Brand kit

Until real uploads exist, Assets may use clearly labelled placeholder assets. It must not imply that samples are user uploads.

### 4.3 Selection hierarchy

Every selection belongs to exactly one level:

1. Campaign page
2. Section
3. Container or column
4. Element
5. Text range while inline editing

The right inspector must show the selected level clearly, for example:

`Campaign > Hero > Content column > Headline`

Selection rules:

- Clicking empty canvas outside the page selects nothing and closes element-specific controls.
- Clicking page background selects the campaign page.
- Clicking section background selects the section.
- Clicking an element selects that element.
- Double-clicking editable text enters inline text editing.
- `Escape` exits text editing, then climbs one level at a time from element to container to section to no selection.
- The Layers tree and canvas selection always stay synchronized.
- Selection must never jump to another element after autosave or re-render.

## 5. Top toolbar specification

From left to right:

### 5.1 Navigation and identity

- Back to campaign overview.
- CometRow mark, using the frozen application logo.
- Campaign name, single-click select and deliberate rename interaction.
- Optional workspace name in a secondary tooltip or breadcrumb, not as competing headline text.

### 5.2 Document state

Use explicit states:

- Saved
- Unsaved changes
- Saving
- Save failed with Retry
- Offline; changes retained locally where supported
- Conflict; review required
- Read only

Do not simultaneously show contradictory labels such as a disabled “Saved” button and a separate saved sentence. One status component is sufficient. If manual save remains available, label it `Save now` only when pending valid changes exist.

### 5.3 History

- Undo and redo buttons.
- Disabled states include tooltips explaining why.
- Shortcuts: `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`; optionally `Ctrl/Cmd+Y` on Windows.
- History covers content, styling, layout, addition, reorder, duplicate, hide and delete.
- A compound interaction, such as dragging a section, is one undo step.
- Autosave is not an undo step.

### 5.4 View controls

- Phone: default editing viewport because QR/link traffic is expected to be mobile-heavy.
- Tablet.
- Desktop.
- Zoom menu: Fit, 50%, 75%, 100%, 125%, and custom only if necessary.
- Actual width shown unobtrusively.
- Preview opens a distraction-free preview without editing frames.
- Future channel/variant selector appears only once rules/routes are implemented.

Suggested preview widths:

- Phone: 390px.
- Tablet: 768px.
- Desktop: 1200px.

These are editor frames; public output must remain fluid between widths.

### 5.5 Publish

- P0: absent or clearly disabled with an honest explanation.
- P1 first publish: validation → public URL → QR generation → success summary.
- P1 subsequent publish: `Update live campaign`; public URL and dynamic QR remain stable.
- Unpublished changes and published version status must be distinguishable later.

## 6. Add panel

### 6.1 Common behavior

- Search by plain-language names and synonyms, e.g. `signup`, `form`, `newsletter`.
- Category filters.
- Recently used items.
- Favorites may be added later.
- Every item has a meaningful thumbnail, name and one-line purpose.
- Click adds using a predictable default insertion point.
- Drag allows exact valid placement.
- Keyboard users can choose `Add after selected`, `Add before selected`, or `Add to selected container`.
- An item is disabled with an explanation when incompatible with the current selection.
- Search empty state offers clear reset.

### 6.2 Sections library

Sections are professionally composed combinations of layout and elements. All internal visible content must remain editable.

#### Navigation and framing

- Header / navigation
- Announcement bar
- Brand introduction
- Footer / legal

#### Opening and story

- Hero: centred
- Hero: split media and copy
- Hero: full-bleed background media
- Rich text / story
- Media feature
- Video feature
- Gallery

#### Product and offer

- Feature list
- Benefits grid
- Product showcase
- Price and offer
- Coupon offer
- Comparison
- Countdown offer
- Sticky mobile CTA

#### Trust and conversion

- Testimonial
- Review grid or carousel
- Logo/trust strip
- Stats / proof
- FAQ
- Lead form
- Event RSVP
- Booking/contact
- CTA band

#### Contact and compliance

- Contact methods
- Location / directions
- Social links
- Identity and legal

Each section thumbnail should represent structure, not prescribe a permanent colour or stock image. Adding the same section twice is allowed unless a semantic restriction exists, such as a single primary navigation.

### 6.3 Elements library

Elements may be dropped only into compatible content slots or containers.

#### Text

- Heading
- Paragraph / rich text
- Eyebrow / overline
- Badge / pill
- Quote
- List

#### Actions

- Button
- Button group
- Text link
- Contact button
- Social icon/link

#### Media

- Image
- Video
- Audio / voiceover player
- Gallery
- Icon
- Logo
- Embed placeholder, P2/P3 and security-reviewed before implementation

#### Conversion

- Price
- Coupon code
- Countdown timer
- Form
- RSVP / booking action
- Stock or urgency indicator, only when backed by honest data or explicit manual wording

#### Proof and information

- Testimonial / review
- Rating
- Trust badge
- Statistic
- Feature item
- FAQ accordion
- Contact detail
- Location card

#### Structural

- Container
- Columns
- Grid
- Stack
- Divider
- Spacer

Atomic elements must not be inserted directly at page root when a containing section is required. If the user drops an element between sections, the editor may create a sensible blank section automatically and announce that action.

### 6.4 Layouts library

Layouts are responsive empty structures, not finished marketing content:

- Single column
- Two columns 50/50
- Two columns 40/60
- Two columns 60/40
- Three columns
- Centred narrow content
- Full-width media
- Media left, copy right
- Copy left, media right
- Hero overlay
- Card grid
- Horizontal carousel
- Logo row
- Form plus supporting copy
- Sticky bottom action area

Dropping a layout into an empty section replaces its structure. Applying a layout to a populated section must preview the result and preserve all compatible content. Content that cannot be placed must never be silently deleted; the user must choose where it goes or cancel.

## 7. Assets panel

### 7.1 Asset model

An asset has:

- Stable ID.
- Original filename.
- Type and MIME type.
- Dimensions or duration.
- File size.
- Upload/processing state.
- Alt text and optional caption.
- Focal point for images.
- Poster image for video.
- Usage count and campaigns using it, later.
- Owner/workspace scope.

Replacing an element’s asset changes only that element unless the user explicitly chooses `Replace everywhere`.

### 7.2 Images

- Upload by picker, drag/drop or paste.
- Accepted-format and size guidance before upload.
- Processing, success and failure states.
- Thumbnail grid/list toggle.
- Search and filter.
- Select, replace, rename metadata and delete where unused.
- Crop/aspect and focal point occur after placement or through asset details.
- Before/after is a dedicated element/section, not a magical asset type.

### 7.3 Video

- Upload supported files in P1.
- URL/embed support for approved providers only.
- Transcoding/optimization state.
- Poster-frame selection.
- Captions/subtitles upload.
- Duration and size shown.
- Failed processing can be retried without losing the section.
- TikTok/Instagram embeds depend on provider policy and should not be promised until verified.

### 7.4 Audio

- Upload voiceover/audio.
- Duration and waveform or simple player preview.
- Transcript/captions later.
- Autoplay should not be enabled by default.

### 7.5 Brand kit

- Primary and secondary logo assets.
- Approved campaign colours.
- Approved font families or type styles.
- Default button styles.
- Optional locked brand settings for team plans later.

Brand kit values affect campaign output only. They do not change the CometRow interface.

## 8. Centre canvas mechanics

### 8.1 Canvas behavior

- The page canvas is the dominant area.
- Canvas background is visually distinct from the campaign page.
- The campaign remains readable at Fit zoom.
- The editor restores scroll position and selection when switching panels or preview modes.
- Empty campaign shows a useful first action: choose a section, template or blank layout.
- Empty sections display drop zones but public preview omits editor scaffolding.

### 8.2 Vertical section system

- Page root contains an ordered vertical list of sections.
- Sections cannot overlap one another.
- Each section has a stable ID and explicit type.
- Hover shows a light frame and section label without covering important content.
- Selected section has a stronger frame.
- Between-section insertion controls appear on hover/focus.
- Dragging shows a full-width insertion line.
- Auto-scroll occurs near canvas edges during drag.
- Reordering preserves selection and scroll position.

Section controls:

- Drag handle.
- Duplicate.
- Hide/show.
- Move up/down through menu and keyboard-accessible controls.
- Delete.
- Optional save as reusable section later.

Delete is immediately undoable. Confirm only when deletion would remove meaningful nested content and undo cannot guarantee recovery.

### 8.3 Controlled composition inside sections

Sections use responsive containers, stacks, rows, columns and grids. Users may:

- Reorder elements within compatible parents.
- Move elements between compatible containers.
- Change row/column direction.
- Adjust alignment, distribution, gap and padding.
- Resize columns using handles within minimum/maximum constraints.
- Set content width using presets or bounded numeric controls.
- Choose supported element width modes: Auto, Fill, percentage presets and bounded custom value.

Users may not:

- Place arbitrary objects across section boundaries.
- Use negative margins to overlap unrelated sections.
- create inaccessible zero-size targets.
- Set arbitrary z-index values.
- Create desktop-only compositions that silently collapse unpredictably on mobile.

### 8.4 Micro-layering

Layering is supported only in containers designed for it, such as Hero overlay, media card or shoppable video.

The model has controlled layers:

1. Background media.
2. Colour/gradient overlay.
3. Decorative elements.
4. Text and interactive foreground.

Foreground overlays use anchor positions rather than unrestricted coordinates:

- Top left, top centre, top right.
- Centre left, centre, centre right.
- Bottom left, bottom centre, bottom right.
- Safe bounded horizontal and vertical offsets.
- Mobile position can inherit or use an approved override.

Layers can be reordered only inside the allowed band. A button cannot be sent behind a background. Decorative elements must not block interactive controls.

### 8.5 Direct text editing

- Double-click or Enter on selected text enters editing.
- Text caret and selection behave like a normal editor.
- Inline toolbar appears close to the selection without covering it.
- Inline toolbar contains common formatting only: text role, bold, italic, link, alignment and clear formatting where supported.
- Full typography settings remain in the right inspector.
- `Escape` exits editing without discarding valid changes.
- Pasting plain text retains line breaks but strips unsafe markup.
- Pasting rich text maps only allowed formatting.
- IME composition must not trigger partial saves or destroy the caret.

### 8.6 Drag-and-drop contract

Every drag has:

- Source affordance.
- Drag preview/ghost.
- Valid drop zones.
- Invalid cursor and explanation where helpful.
- Insertion indicator.
- Auto-scroll.
- Final announcement for assistive technology.
- One-step undo.

Click-to-add and keyboard move controls must provide equivalent functionality. Dragging must never be the only way to complete a task.

### 8.7 Resize contract

- Columns may be resized with a divider handle and numeric/preset inspector value.
- Images/video use aspect ratio and fit controls rather than arbitrary distortion.
- Text boxes normally auto-height; users control maximum width, not fixed text height.
- Buttons use content width or fill width.
- Minimum widths prevent unusable output.
- Canvas handles appear only when the selected item supports resizing.

## 9. Layers panel

The Layers panel is the reliable structural view of the campaign.

- Hierarchical tree: page → section → container → element.
- Expand/collapse nodes.
- Icons identify node type.
- User-facing names can be renamed; type remains visible.
- Selection synchronizes with canvas.
- Drag reorder/move shows nesting depth and valid parent.
- Visibility toggle.
- Lock toggle may be added for decorative objects, but Owner/Editor permissions remain separate.
- Hidden items remain visible in Layers with a distinct state.
- Search by layer name/content later if needed.
- `Alt+Arrow` or accessible actions reorder siblings.
- Multi-select is deferred unless a real workflow requires it; do not implement a fragile partial multi-select.

## 10. Right inspector architecture

Use a stable header followed by contextual tabs.

### 10.1 Inspector header

- Selected item type and user label.
- Selection breadcrumb.
- Quick actions appropriate to selection: duplicate, hide/show, move, delete.
- No tiny unexplained icon row; every icon has tooltip and accessible name.

### 10.2 Tabs

Use up to four tabs as applicable:

- **Content:** what the item says or displays.
- **Layout:** how it is arranged and sized.
- **Style:** how it looks.
- **Action or Rules:** what happens when used, and contextual display behavior.

Do not show empty tabs. Link/action settings should not be buried inside an unrelated Content accordion when actions are central to the element.

### 10.3 Shared layout controls

Only show applicable controls:

- Display: stack, row, grid, overlay where supported.
- Direction.
- Horizontal alignment.
- Vertical alignment.
- Distribution/justify.
- Gap.
- Columns and responsive stacking.
- Width: Auto, Fill, preset percentage, bounded custom.
- Maximum content width.
- Height: Auto, minimum height, full viewport only for approved sections.
- Padding: linked or per side.
- Margin: limited external spacing presets; no negative values.
- Order on mobile when columns stack.
- Visibility by device later or in Rules.

### 10.4 Shared style controls

- Campaign type style or approved font family.
- Size presets with advanced bounded numeric value where appropriate.
- Weight.
- Line height.
- Letter spacing.
- Alignment.
- Text colour.
- Background: none, solid, approved gradient, image/video where applicable.
- Border colour and width.
- Corner radius presets plus bounded value.
- Shadow presets: none, subtle, medium, strong.
- Opacity.
- Overlay strength/gradient for background media.
- Hover/focus style for interactive elements using safe variants.

Use design tokens first. Advanced values are progressive disclosure. Provide `Reset to theme` and identify overridden values.

### 10.5 Responsive values

- Base campaign values apply to all devices.
- A device-specific override must display an override badge.
- `Reset override` returns to inherited behavior.
- Changing viewport must not silently create overrides.
- Mobile overrides should be limited to layout/order/alignment/size/visibility controls that genuinely need them.

## 11. Selection-specific inspector requirements

### 11.1 Campaign page selected

**Content/settings**

- Campaign/page title for internal identification.
- Optional page language.
- SEO/social title and description later, separate from visible headings.

**Layout/style**

- Theme selection.
- Page background.
- Default content width.
- Default section spacing.
- Campaign accent.
- Type scale/brand styles.
- Default button style.

**Rules/settings later**

- Default fallback variant.
- Global schedule/publish state.
- Analytics and tracking governance links.

### 11.2 Section selected

**Content**

- Section name for Layers.
- Section-specific structured content summary or layout variation.

**Layout**

- Layout variant.
- Content width.
- Minimum height where relevant.
- Padding.
- Column/grid controls.
- Vertical/horizontal alignment.
- Mobile stacking order.

**Style**

- Background colour/gradient/media.
- Overlay.
- Border/divider.
- Corner treatment only when the section is card-like.

**Rules later**

- Visibility.
- Channel/source.
- Date/time range and timezone.
- Device.
- Variant membership.
- Fallback behavior.

### 11.3 Text selected

**Content**

- Text value.
- Text role: display, heading, subheading, body, caption, eyebrow.
- Semantic heading level H1–H6 where relevant; visual role and semantics are related but not identical.
- Optional link.

**Layout**

- Width/max width.
- Alignment within parent.
- Spacing before/after.

**Style**

- Campaign type style/font.
- Size, weight, line height, letter spacing.
- Alignment, colour and allowed emphasis.
- Text balance/wrap where supported.

### 11.4 Button or link selected

**Content**

- Label.
- Optional icon and icon position.

**Action**

- Web URL.
- Campaign section anchor.
- Phone call.
- Email.
- WhatsApp with prefilled text.
- Maps/directions.
- Form submit, only within a form.
- Download, only for approved hosted files.
- Open in new tab where appropriate.
- UTM/tracking fields later, with generated URL preview.

**Layout/style**

- Primary, secondary, text or brand variant.
- Small, medium, large.
- Auto or full width.
- Alignment.
- Fill, text, border, radius and shadow using safe controls.
- Mobile full-width override.

Validation rejects unsafe protocols and malformed destinations but does not claim that a syntactically valid remote URL exists.

### 11.5 Image selected

**Content**

- Choose/replace asset.
- Alternative text.
- Decorative-image toggle; when enabled, alt text becomes empty.
- Optional caption.
- Optional link/action.

**Layout**

- Width and max width.
- Aspect ratio: original, square, portrait, landscape, custom bounded ratio.
- Fit: cover, contain, fill only when distortion is explicitly acceptable.
- Focal point.
- Alignment.

**Style**

- Radius.
- Border.
- Shadow.
- Opacity.
- Overlay only when used as background/overlay-capable media.

### 11.6 Video selected

**Content**

- Choose/upload asset or approved provider URL.
- Poster image.
- Captions/subtitles.
- Accessible title/description.
- Optional CTA overlay in an overlay-capable video container.

**Playback**

- Autoplay, which automatically requires muted audio.
- Muted.
- Loop.
- Show controls.
- Play inline.
- Start position later if needed.

**Layout/style**

- Aspect ratio.
- Fit and focal point.
- Radius, border and shadow.
- CTA overlay anchor and safe offset.

### 11.7 Audio selected

- Asset.
- Title and description/transcript later.
- Player style.
- Autoplay off by default.
- Loop.
- Controls.
- Width and alignment.

### 11.8 Gallery selected

**Content**

- Add/remove/reorder assets.
- Per-item alt text/caption.

**Layout**

- Grid, masonry only if robust, carousel, or swipe row.
- Columns by viewport.
- Gap.
- Aspect ratio and fit.
- Mobile carousel option.
- Lightbox toggle later.

**Style**

- Background, radius, border and shadow.

### 11.9 Form selected

**Content**

- Form title/description.
- Ordered fields.
- Field types: name, email, phone, short text, long text, choice, checkbox and consent.
- Labels, helper text and placeholders.
- Required state.
- Submit label.
- Privacy/consent text and link.
- Success and error messages.

**Behavior**

- Submission destination is not faked. P1/P2 must define secure storage/integration.
- Spam protection.
- Double-submit prevention.
- Validation behavior.
- Post-submit message or safe redirect.

**Style/layout**

- Stacked or approved inline arrangement.
- Field gap.
- Field/button style tokens.
- No label removal merely for visual minimalism.

### 11.10 Coupon selected

- Offer label.
- Coupon code.
- Copy button label.
- Copied feedback.
- Optional expiry text/date.
- Terms.
- Action after copy, if any.
- Card layout and style.

### 11.11 Countdown selected

- Target date/time.
- Required timezone.
- Display units.
- Prefix/label.
- After-expiry behavior: hide, show expired message, replace with selected section/state later.
- Preview at a chosen simulated time later.
- Style of digits, labels and container.

### 11.12 Price and offer selected

- Currency.
- Current amount.
- Compare-at amount.
- Billing interval or unit.
- Discount badge.
- Description.
- Coupon.
- Terms.
- CTA/action.
- Layout and emphasis style.

### 11.13 Testimonial/review selected

- Quote.
- Author.
- Role/company.
- Photo.
- Rating, only when genuine user-provided data exists.
- Optional `Verified` label controlled by honest source data; not a decorative toggle that can mislead.
- Layout and card style.

### 11.14 Trust badge/statistic/feature item selected

- Icon or image.
- Label/title.
- Supporting text.
- Numeric value/suffix for statistic.
- Link optional.
- Alignment and visual variant.

### 11.15 FAQ selected

- Ordered question/answer list.
- Add, duplicate, delete and reorder item.
- Single-open or multi-open behavior.
- Initial open item.
- Heading semantics.
- Divider/icon style.

### 11.16 Header/navigation selected

- Logo/brand text.
- Ordered links targeting campaign sections or URLs.
- Primary CTA.
- Sticky behavior later after mobile testing.
- Mobile menu label and behavior.
- Background and contrast.
- Only one primary navigation section per page unless user confirms otherwise.

### 11.17 Footer/legal selected

- Logo/brand.
- Company/organizer identity.
- Contact details.
- Legal links.
- Social links.
- Copyright text.
- Required German/EU business fields remain the user’s legal responsibility; the editor can guide but must not assert compliance.

### 11.18 Contact/location selected

- Address.
- Phone.
- Email.
- Hours.
- Maps action.
- Optional map/provider later after privacy review.
- Layout and icon style.

## 12. Templates and blank campaigns

### 12.1 Blank means blank

A blank campaign contains only the page/theme foundation and an empty-state insertion point. It must not secretly include a brand/header/hero the user cannot remove.

### 12.2 Templates are editable starting points

Every template must satisfy:

- Every visible text item is editable.
- Every visible image/video is replaceable.
- Every button destination and label is editable.
- Every section can be reordered, duplicated, hidden or deleted.
- Supported elements can be added to compatible containers.
- Layout variations are available without discarding content.
- Template styling maps to campaign tokens and inspector controls.
- There is no special “sample artwork” behavior in production.
- Templates use realistic placeholder copy that is clearly replaceable.

The editor must never imply that a Hero is a single fixed image plus fixed text. Hero is a section category with multiple editable compositions.

### 12.3 Template chooser

- Start blank is equally prominent.
- Templates show desktop and phone preview or at least a phone-first preview.
- Filter by goal: launch, offer, event, lead capture, product story.
- Preview before choosing.
- Choosing a template after work exists warns that it replaces the draft and offers undo/version recovery.

## 13. Responsive system

### 13.1 Principle

Responsiveness is guaranteed by structure, constraints and tested layout transformations. It is not achieved by scaling the desktop page down until text becomes unreadable.

### 13.2 Behavior

- Phone is the default editor viewport.
- Rows may stack on phone.
- User can choose media-first or copy-first stacking.
- Grids reduce columns predictably.
- Buttons may become full width.
- Padding/gaps scale through tokens.
- Text uses bounded responsive sizes.
- Overlay content has safe insets.
- Sticky CTA respects browser safe areas.
- Nothing creates horizontal page scrolling at 320px.

### 13.3 Override policy

Allow overrides only where needed:

- Direction/stacking.
- Order.
- Alignment.
- Width.
- Font-size preset.
- Padding/gap.
- Visibility, later.

Do not expose an independent completely different design for every viewport by default. That multiplies mistakes and maintenance.

## 14. Action routing and links

All clickable elements use one shared typed action model:

- External URL.
- Internal section.
- Phone.
- Email.
- WhatsApp.
- Maps.
- Form submit.
- File download.
- No action.

Shared behavior:

- Validate scheme and required fields.
- Block `javascript:` and other unsafe protocols.
- Display final resolved destination.
- Do not perform network existence checks during ordinary editing.
- Open-new-tab option only where meaningful.
- Accessible label when visual text is ambiguous.
- Future tracking configuration attaches to the action without rewriting visible content.

## 15. Rules and contextual delivery

Rules are part of the intended product but must be implemented only after a deterministic routing engine exists.

### 15.1 Supported rule dimensions

- Date/time window with timezone.
- Campaign lifecycle state.
- Route/QR identifier.
- Explicit channel/source link.
- Device category.
- Language preference.
- Approximate location where legally and technically appropriate.
- Known visitor segment based on consented session/token.
- Experiment allocation.

### 15.2 Rule editor requirements

- Plain-language sentence builder.
- Explicit AND/OR grouping.
- Default fallback required.
- Conflict/overlap warning.
- Rule priority visible.
- Preview simulation: route, time, device, language and known segment.
- Explanation: `This section is shown because…`.
- Analytics records the selected variant and reason without storing unnecessary personal data.

### 15.3 Privacy limitations

- A QR scan does not identify a person by default.
- IP location is approximate.
- Referrer/platform data may be missing or unreliable.
- Exact source is best established through distinct tracked links/routes.
- Sensitive traits must not be inferred.
- Consent and retention must be designed before personalized tracking ships.

## 16. Mobile editor

The mobile editor is a companion editing experience, not the desktop interface squeezed into 390px.

- Top bar: back, campaign name/status, undo/redo menu, preview.
- Canvas occupies the screen.
- Bottom navigation opens Add, Layers, Assets and Properties sheets.
- Sheets use large touch targets and drag handles.
- Selected-element actions appear in a compact contextual bar without covering content.
- Inline text editing uses the native keyboard safely.
- Reordering supports touch drag and explicit move controls.
- Properties sheet can expand to full height for forms.
- Sheet focus is trapped correctly; Escape/back closes one level.
- Minimum pointer target follows WCAG 2.2 minimum and should target approximately 44px for important touch controls.
- No horizontal editor overflow at 320px.

## 17. Keyboard and accessibility contract

- Full editor navigation without pointer.
- Visible focus indicator.
- Logical landmark and heading structure.
- Toolbars follow a consistent arrow-key pattern.
- `Tab` enters/leaves tool groups rather than visiting dozens of redundant icons where a composite widget is appropriate.
- Every icon button has an accessible name and tooltip.
- Drag operations have menu/keyboard alternatives.
- Status changes use polite live announcements: saving, saved, error, reordered.
- Selection is not communicated by colour alone.
- Text and controls meet contrast requirements.
- Forms keep visible labels.
- Images support alt text/decorative state.
- Video supports captions.
- Motion respects reduced-motion preferences.
- Zoom to 200% remains usable.
- Editor and generated campaign are both tested, not only the editor shell.

## 18. State, failure and conflict behavior

### 18.1 Autosave

- Local UI updates immediately.
- Debounced server save.
- Pending edits visibly indicated.
- Invalid fields block only the affected save and show specific feedback.
- Save retry preserves current input and selection.
- Navigating away with unsaved unrecoverable changes prompts the user.

### 18.2 Conflict

- Stale writes are rejected.
- Conflict view compares saved and current versions.
- Whole-document resolution remains acceptable initially if explained clearly.
- A further remote save during resolution produces another safe conflict rather than overwriting.
- Version download/recovery remains possible.

### 18.3 Permissions

- Owner and Editor can mutate according to permissions.
- Viewer sees a readable canvas and inspector but no misleading enabled mutation controls.
- Permission checks occur server-side; hidden buttons are not security.
- AI later uses the same permission-checked commands.

### 18.4 Common editor failures

Required handling:

- Upload rejected.
- Media processing failed.
- Unsupported drop target.
- Block/section limit reached.
- Required field missing.
- Unsafe URL.
- Offline.
- Save failed.
- Conflict.
- Deleted asset still in use.
- Publish validation failed.

Errors appear near the cause and in a concise summary when multiple errors exist. User input is never silently discarded.

## 19. Performance requirements

- Selection and inspector response should feel immediate.
- Drag preview and insertion indicators should remain smooth on supported hardware.
- Typing must not rerender the full document or move the caret.
- Large media thumbnails use optimized previews.
- Asset lists progressively load/virtualize as needed.
- Public output uses responsive optimized media and lazy loading below the fold.
- Editor changes are incremental; avoid rebuilding the entire preview DOM for one text edit.
- Maintain at least 50 useful undo steps in the current session unless memory constraints require an evidence-based alternative.
- Existing 20-section limit may remain initially, but the UI must call it a section limit and explain it.

## 20. Architecture contract for Astra

### 20.1 Document model

Use a versioned structured document. Every node has:

- Stable ID.
- Node type.
- Schema version.
- Parent/children where applicable.
- Content properties.
- Layout properties.
- Style token references and explicit overrides.
- Action.
- Rules, when implemented.
- Visibility/state metadata.

The model must distinguish section, container and element. Do not store the editor as arbitrary rendered HTML.

### 20.2 Command model

All mutations pass through typed commands, for example:

- Add node.
- Move node.
- Update content.
- Update layout.
- Update style.
- Set action.
- Duplicate subtree.
- Hide/show.
- Delete/restore.
- Apply layout while preserving children.

Commands must be:

- Validated.
- Permission checked.
- Auditable.
- Reversible where appropriate.
- Compatible with autosave and revision checking.
- Callable later by both UI and AI assistant.

Do not let individual UI components write ad-hoc document fragments directly.

### 20.3 Schema evolution

- Existing Phase 2 campaigns require explicit migration or backward-compatible reading.
- No content loss during migration.
- Unknown future fields are handled safely.
- Per-section style/layout additions require a versioned schema.
- Migration fixtures cover every current block type.

### 20.4 Rendering parity

One renderer contract should support:

- Editor canvas.
- Clean preview.
- Published campaign.
- Phone/tablet/desktop behavior.

Editor decoration must be layered around content, not produce a separate interpretation that diverges from the published output.

## 21. Visual system contract

Preserve accepted CometRow branding. Complete the editor design system with:

- 4px-based spacing scale.
- Compact and regular control densities.
- Consistent 32–40px desktop controls and larger touch presentation on mobile.
- Clear type hierarchy for panel titles, labels, helper text and values.
- Semantic colours for success, warning, error, focus, selection and disabled states.
- One icon set.
- Consistent tooltips, menus, popovers, dialogs, sheets and toasts.
- Selection colour distinct from campaign output.
- No unexplained decorative gradients or new brand colours.

The campaign itself may use brand kit styling. The editor chrome remains visually neutral and stable.

## 22. End-to-end acceptance scenarios

### Scenario A: blank product launch

1. Create a genuinely blank campaign.
2. Add a split Hero section.
3. Replace heading, body, image and button.
4. Change button to a Shopify/Amazon/custom URL.
5. Switch media/copy sides.
6. Add a benefits grid and create three items.
7. Add a price/offer section and coupon.
8. Add testimonial and FAQ sections.
9. Reorder sections by pointer and keyboard.
10. Adjust phone stacking without changing desktop accidentally.
11. Preview all viewports.
12. Undo deletion and confirm autosave.

### Scenario B: event campaign

1. Start from an event template.
2. Replace every template text/image/logo.
3. Change date/location and Maps action.
4. Configure RSVP form UI.
5. Add countdown with timezone.
6. Add sponsor logos.
7. Remove an unwanted template section.
8. Verify no remaining template object is unselectable.

### Scenario C: media-led campaign

1. Add video feature.
2. Choose asset, poster and playback behavior.
3. Add CTA overlay in an approved anchor position.
4. Reposition safely on phone.
5. Confirm controls/captions and public preview behavior.

### Scenario D: failure recovery

1. Edit text and trigger save failure.
2. Confirm input and caret remain.
3. Retry successfully.
4. Delete section and undo.
5. Cause two-tab stale revision.
6. Resolve without silent overwrite.

### Scenario E: permissions and accessibility

1. Viewer opens editor and cannot mutate.
2. Editor completes add/edit/reorder with keyboard.
3. Screen reader identifies selected node and saving state.
4. Mobile user operates sheets and reorders with accessible alternative.

## 23. Definition of done

The editor is not complete because it resembles Figma, Canva, Framer or Webflow in a screenshot. It is complete only when:

- Every visible template object follows the selection contract.
- Implemented controls perform real changes and persist them.
- Every supported element satisfies its inspector contract.
- Canvas, Layers and inspector never disagree about selection/order/content.
- Dragging has clear valid/invalid states and an accessible alternative.
- Blank and template creation behave exactly as specified.
- Existing content, permissions, autosave, conflicts and audit history remain intact.
- Phone, tablet, desktop, 320px and 200% zoom checks pass.
- Production rendering matches editor preview.
- No unrelated CometRow logo, product name, application font or colour changes occur.
- No Phase 3 work starts until production editor acceptance.

Automated tests are necessary but not sufficient. Founder usability review remains a release gate.

## 24. Required implementation workflow

Astra must use this sequence:

1. Produce a requirement traceability matrix referencing each numbered section of this specification.
2. Audit the current prototype and mark each requirement as supported, partial, missing or deferred.
3. Propose the versioned node/schema changes and migration plan.
4. Produce a clickable prototype covering P0 interactions with realistic content.
5. Stop for founder review.
6. After explicit approval, integrate in small vertical slices rather than one unreviewable rewrite.
7. Demonstrate each vertical slice in the browser and update traceability.
8. Run unit, integration, browser, accessibility and production build checks.
9. Stop again for production acceptance. Do not self-accept Phase 2.

Suggested vertical slices:

1. Selection model and inspector shell.
2. Section add/reorder/duplicate/hide/delete plus undo.
3. Text/button/image editing.
4. Layout/container controls and responsive overrides.
5. Remaining current block types.
6. Asset integration in Phase 3.

## 25. Explicitly deferred decisions

These require separate founder/product approval and must not be invented during implementation:

- Exact P1 upload quotas and file limits.
- Exact set of external video providers.
- Form submission storage/integrations.
- Whether approximate geolocation will ship.
- Personalization consent model and retention.
- A/B testing allocation and statistics.
- Social/ad/poster asset studio.
- Advanced animations.
- Custom scripts/HTML.
- Multi-select.
- AI assistant.

## 26. Research basis

This specification uses established interaction principles without cloning another product:

- Webflow documents drag-in elements, organized structure, flex/grid layout, typography control, responsive previews and direct visual content editing: https://webflow.com/feature/design
- Framer describes editable canvas output, responsive stack/grid layouts and detailed layout/style properties: https://www.framer.com/design/
- Canva emphasizes approachable drag-and-drop creation and editable templates: https://www.canva.com/create/landing-pages/
- Unbounce combines customizable templates, drag-and-drop elements and campaign experimentation: https://unbounce.com/product/landing-pages/
- WCAG 2.2 target-size guidance: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WAI-ARIA toolbar keyboard pattern: https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/

The governing product choice remains specific to CometRow: campaign-first sections, controlled composition, mobile-first output, future route/lifecycle intelligence and a lower learning burden than a general website builder.

## 27. Short directive to place above Astra’s task

> Do not redesign CometRow’s brand or begin production integration immediately. Preserve the current logo, product name, application colours and application typography. Treat the existing canvas-first prototype as a visual starting point, but replace its shallow template-only behavior with the interaction and capability contract in this specification. First produce traceability, schema/migration design and a revised P0 prototype. Every visible template item must be selectable and editable. Do not implement future media, publish, QR, rules, analytics or AI systems as fake controls. Stop for founder approval before production integration, and do not begin Phase 3.
