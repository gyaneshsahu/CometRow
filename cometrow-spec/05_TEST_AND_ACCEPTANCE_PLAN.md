# CometRow — Test and Acceptance Plan

## 1. Testing layers

- **Unit:** schemas, lifecycle rules, role checks, slug rules, limits, attribution and analytics calculations.
- **Integration:** PostgreSQL repositories, migrations, transactional publishing, object/media adapters and event ingestion.
- **Contract:** provider adapters, webhook verification and API schemas.
- **End-to-end:** critical founder/user journeys in real browsers.
- **Security:** tenant isolation, broken authorization, XSS, unsafe URLs, upload spoofing, rate limits and secret exposure.
- **Accessibility:** keyboard, focus, semantics, contrast and reduced-motion behavior.
- **Performance:** public-page payload, render timing, media lazy loading and analytics ingestion.
- **Responsive/visual:** representative phone, tablet and desktop sizes without distorted media or clipped actions.

Tests must be deterministic where possible. External providers use fakes in ordinary CI and isolated integration tests only when credentials are intentionally configured.

## 2. Required end-to-end scenarios

1. Register, verify and enter personal workspace.
2. Create campaign, assemble blocks and autosave draft.
3. Upload valid images/video and reject invalid/oversized content.
4. Preview phone/tablet/desktop from one campaign definition.
5. Publish and open public URL unauthenticated.
6. Generate QR/channel link, resolve it and attribute events correctly.
7. Edit live campaign; verify live page stays unchanged until republish.
8. Publish new version; verify URL/QR stay stable and content changes atomically.
9. Restore an old version into draft and republish.
10. Exercise Owner/Editor/Viewer permissions and cross-workspace denial.
11. Pause, expire, archive, soft-delete and restore according to rules.
12. Suspend through administration and confirm links/redirects stop.
13. View analytics with bot/duplicate protections and correct ratios.

## 3. Release acceptance criteria

- All required journeys pass in supported browsers.
- No known critical/high security issue.
- No cross-tenant data exposure.
- Database can be created from migrations on an empty environment.
- Backup/restore procedure is documented and tested before pilot.
- Public page remains usable without JavaScript where reasonably possible; essential CTA/content has graceful fallback.
- Public images are optimized and video does not download eagerly.
- Error states are understandable and do not expose implementation details.
- Accessibility and performance budgets are measured, not assumed.
- CI passes from a clean checkout.
- Setup and operating documentation matches the actual repository.

## 4. Definition of done for any feature

- Product behavior and permissions are defined.
- Implementation contains no embedded secrets or scattered plan limits.
- Validation exists on client for usability and server for trust.
- Automated tests cover happy path, authorization, invalid input and failure states.
- Loading, empty, processing and error states are handled.
- Logs/metrics support diagnosis without exposing sensitive data.
- Documentation/migrations are updated.

