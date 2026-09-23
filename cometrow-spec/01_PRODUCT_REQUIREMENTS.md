# CometRow — Product Requirements Document

## 1. Product definition

CometRow is a hosted campaign platform that lets an individual or organization create a hosted campaign from controlled content blocks, preview it across devices, publish it at a stable URL, create dynamic QR/channel links, edit and republish versions, and inspect native engagement analytics.

## 2. Primary actors

- **Owner:** controls workspace, members, campaigns and destructive actions.
- **Editor:** creates, edits and publishes campaigns.
- **Viewer:** reads campaigns and analytics inside the workspace.
- **Public visitor:** views a published campaign and may play media or follow CTAs.
- **Platform administrator:** handles abuse, suspension and exceptional ownership transfer.

An individual automatically receives a personal workspace. Organizations may contain members and optional clients. The data model must support agency/client separation even if the first UI is minimal.

## 3. Core user journey

Sign up → verify email → create/select workspace → create campaign from preset or blank structure → configure blocks → upload/embed media → add CTA → preview phone/tablet/desktop → publish → receive stable URL and QR → create named channel links → share → inspect analytics → edit draft → publish new version → pause, expire or archive.

## 4. Functional requirements

### FR-1 Authentication and workspaces

- Secure email-based registration, login, logout and recovery.
- Email verification before public publishing.
- Personal and organization workspaces.
- Owner, Editor and Viewer authorization enforced server-side.
- MVP ownership transfer may be administrator-assisted.

### FR-2 Campaign composer

- Create, rename, duplicate and delete a campaign.
- Add, remove and reorder supported blocks.
- Edit block content with validation and safe defaults.
- Choose a limited theme, brand colors and typography.
- Autosave a private working draft with visible save status.
- No free-form canvas, arbitrary code, complex columns or multipage sites.

### FR-3 MVP block library

- Brand identity: business name and logo.
- Hero: headline, description and cover image or primary video.
- Media: up to two videos and ten images.
- Rich information: safe formatted text.
- Benefits/features.
- Date/time and location/map link.
- Price, offer or coupon text.
- Testimonials/reviews with source label.
- Primary CTA.
- Optional secondary actions: call, WhatsApp, email, directions, registration, tickets, store or marketplace.
- Contact/business information.
- Footer: advertiser identity, required legal links and report-campaign action.

Specialist schedule, speaker, brochure and built-in lead-form blocks are MVP-plus unless they become necessary for a real pilot.

### FR-4 Responsive preview and public rendering

- One campaign definition renders responsively on phone, tablet and desktop.
- Composer includes three device previews; these do not create independent campaign versions.
- Portrait, square and landscape media are handled without distortion.
- Published campaign is accessible by a stable canonical URL.
- Public page displays only the last successfully published version.
- Viewer page does not require login.

### FR-5 Lifecycle and versioning

Lifecycle: Draft → Scheduled/Published → Paused → Expired → Archived → Soft-deleted.

- Editing a live campaign changes its working draft, not the live version.
- **Publish changes** creates an immutable published version atomically.
- Retain the latest ten published versions initially.
- An authorized user can restore an old version into a new draft and republish it.
- Paused/expired pages show an owner-configurable safe message or verified redirect.
- Soft-deleted campaigns remain recoverable for 30 days.
- Stable URL and QR identity survive edits and version changes.

### FR-6 URLs, slugs, QR and channels

- Every campaign receives an immutable internal public ID and stable system URL.
- Optional unique human-readable slug with reserved-word, impersonation and validation controls.
- QR codes resolve through a managed channel-link record, never directly to a media asset or version.
- User can create, rename, disable and inspect up to ten named channel links per campaign.
- Channel links show the same campaign while recording source attribution.
- Prevent arbitrary unsafe open redirects.
- Custom customer domains are architecture-ready but MVP-plus, not a core release blocker.

### FR-7 Media

- Up to two videos, maximum two minutes and 200 MB each during pilot.
- Up to ten source images, maximum 10 MB each before server-side optimization.
- Direct video upload plus YouTube embed; Vimeo is optional later.
- User thumbnail or generated thumbnail.
- Caption-file upload; automatic transcription is later.
- Muted autoplay only where browser rules permit; sound requires interaction.
- Lazy loading and responsive image delivery.
- Validate actual file type, not only extension.

### FR-8 Native analytics

Capture privacy-conscious events:

- campaign view;
- approximate unique visit;
- channel/referrer;
- video start and 25/50/75/100 percent milestones;
- primary and secondary CTA click;
- device class, browser family and coarse country/region when permitted.

Filter known bots and rate-limit event ingestion. Show totals, conversion ratios and simple time trends. Never present an outbound click as a confirmed purchase.

Meta/TikTok/Google pixels, Amazon Attribution and arbitrary scripts are deferred. Arbitrary JavaScript is prohibited.

### FR-9 Administration and trust

- Public report-campaign flow.
- Administrator can inspect, suspend and restore campaigns/accounts with a recorded reason.
- Suspended campaigns must not redirect visitors to advertiser destinations.
- Basic prohibited-content workflow and audit record.

## 5. Initial limits

| Resource | Pilot limit |
|---|---:|
| Videos per campaign | 2 |
| Video duration | 2 minutes each |
| Direct upload | 200 MB each |
| Images | 10 |
| Source image | 10 MB each |
| Blocks | 20 |
| Channel links | 10 |
| Retained published versions | 10 |
| Analytics retention | 90 days |

Limits must be configuration, not scattered hard-coded constants.

## 6. Non-functional requirements

- Mobile-first public experience, keyboard accessible and compatible with current major browsers.
- Target useful visible public content in roughly two seconds on a normal mobile connection, excluding full video download.
- No cumulative layout shift caused by unknown media dimensions.
- Server-side authorization on every private operation.
- Structured logs without secrets or unnecessary personal data.
- Database migrations are versioned and repeatable.
- Development environment is reproducible with documented commands.
- Graceful empty, error, processing and unavailable states.
- English first; user-facing strings structured for localization.
- Germany/EU pilot assumptions documented; no unsupported compliance claims.

## 7. Explicitly out of scope

- Payments/subscriptions.
- General website builder or multipage sites.
- AI creative generation and video editing.
- Built-in checkout.
- Advertisement buying/management.
- Advanced A/B testing.
- Public advertisement marketplace/feed.
- Full CRM or marketing automation.
- Arbitrary scripts/pixels.
- Complex client approval workflow.
- User-managed custom domains in the core MVP.

## 8. Product success for the build

The build is successful when a new verified user can create a credible campaign, publish it, open it from a generated QR/channel link on a phone, update it without changing that link, and see correctly attributed engagement—all without developer assistance.

