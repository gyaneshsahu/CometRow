# CometRow — Hosted Campaign Platform — Start Here for Astra
**during development dont waste tokenx when not neded  but also dont compromise when needed **
## Startup and product identity

The startup and platform name is **CometRow**. Use this exact capitalization in product UI, application metadata, documentation and platform-owned communications. Advertiser names and campaign branding remain specific to each advertiser. The production domain is still to be decided.

## Mission

Build CometRow as an industry-standard, portable MVP for publishing complete hosted advertising campaigns. An advertiser assembles existing videos, images, copy, proof and actions from controlled blocks; the platform hosts the result at a permanent URL and dynamic QR code; viewers see a fast mobile-first campaign; the advertiser can update it and measure engagement by distribution channel.

This is **not** a general website builder, ad network, design suite or hosting product. It is a campaign publishing, distribution and measurement product.

## Core proposition and USP

**Publish once. Distribute everywhere. Update anytime. Know what worked.**

The initial differentiation is the combination of:

1. A constrained, fast campaign composer rather than a free-form page builder.
2. One permanent campaign identity whose content can be versioned without breaking links or printed QR codes.
3. Channel-specific links/QR codes for posters, packaging, Instagram, WhatsApp, creators and similar sources.
4. Video engagement and CTA analytics tied to those channels.
5. Responsive viewer experiences generated once and rendered well on phone, tablet and desktop.

## Initial market posture

- Validate in Germany with an English UI; design for localization and later US commercialization.
- Initial pilot users: small event/campaign agencies, while the underlying block engine remains reusable for trade shows, products and local-business promotions.
- Payments and subscriptions are outside the first build.

## Product principles

- Viewer experience is mobile-first and extremely fast.
- Publisher experience works on mobile but is optimized for comfortable desktop/tablet editing.
- One responsive campaign, not three separately authored device versions.
- Controlled blocks and presets, not arbitrary element placement.
- Standard PostgreSQL and replaceable provider adapters; no avoidable vendor lock-in.
- Use free/local tooling when it gives the same result. Do not reduce architecture, security or test quality merely to avoid justified costs.
- Start as a modular monolith. Do not introduce microservices without demonstrated need.

## Authority and escalation rules for Astra

Astra may improve the proposed implementation when it finds a safer, simpler, more maintainable or more portable solution. The documents define product outcomes and boundaries, not permission to repeat a bad implementation.

Astra should independently fix ordinary bugs, refactor code, adjust internal module boundaries, select equivalent open-source libraries and improve tests without asking.

Astra **must ask the founder before**:

- changing the product promise, MVP boundary or public campaign behavior;
- removing a required capability or adding a major new one;
- introducing a paid service or a service that needs billing details;
- using an external API requiring credentials, contracts or material personal-data sharing;
- creating significant vendor lock-in;
- performing a destructive or irreversible data migration;
- weakening security, privacy, portability or acceptance criteria;
- choosing between materially different UX/product alternatives not resolved here;
- making legal/compliance assumptions that materially affect the product.

When blocked, Astra should explain the decision, recommend one option, state alternatives and ask one focused question. It should not repeatedly force an approach that is failing merely because it appears in this specification.

## Required reading order

1. `01_PRODUCT_REQUIREMENTS.md`
2. `02_ARCHITECTURE_AND_OPERATIONS.md`
3. `03_DATA_AND_API_CONTRACT.md`
4. `04_SECURITY_PRIVACY_AND_TRUST.md`
5. `05_TEST_AND_ACCEPTANCE_PLAN.md`
6. `06_IMPLEMENTATION_PHASES.md`

Do not begin feature implementation until repository constraints and existing files have been inspected and a short implementation plan has been presented.

