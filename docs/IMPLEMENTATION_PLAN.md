# CometRow implementation plan

Current gate: Phase 0 and Phase 1 accepted. Phase 2 remains unaccepted; its UX revision is ready for another founder review. Do not begin Phase 3 until the founder reviews and authorizes it. Historical foundation planning below is retained as context; current details are in `STATUS.md` and `PHASE_2_REVIEW.md`.

## Scope and interpretation

The seven documents in `cometrow-spec/` define a hosted campaign publishing product. The current request authorizes beginning implementation. This first milestone is Phase 0, the executable foundation. It does not claim that a usable campaign MVP already exists.

The key invariants are tenant isolation, controlled blocks, immutable published snapshots, stable campaign/channel identities, and privacy-conscious native analytics. Payments, arbitrary scripts, general website building and managed customer domains stay outside the core MVP.

## Sequence

1. **Foundation:** typed server, validated environment, PostgreSQL migrations, local setup, seeds, health checks, tests and CI.
2. **Identity and tenancy:** verified email, secure sessions and recovery, organization/personal workspaces, Owner/Editor/Viewer authorization, campaign CRUD and audit trail. Prove the authorization matrix and cross-tenant denial before proceeding.
3. **Composer:** strict versioned block schemas, autosave revision conflicts, controlled themes, responsive previews and an accessible renderer. Present the working experience for founder review at the specified Phase 2 gate.
4. **Media:** bounded uploads, processing/quarantine and replaceable storage/video/email adapters using local implementations first.
5. **Publishing:** atomic immutable snapshots, stable links/QR, lifecycle and restore-to-draft.
6. **Analytics:** allowlisted events, channel attribution, privacy/retention, bot protection and accurate ratios.
7. **Hardening:** abuse reports, moderation, accessibility/performance, backup/restore and complete end-to-end tests before pilot review.

## Decisions that can wait

Production domain, providers, deployment, legal documents and commercial limits remain undecided. No external integration, paid account or product-scope change is needed for the foundation. The spec includes scheduling in lifecycle states; scheduling behavior must be specified before that feature is implemented. Public pause/expiry messages and verified redirects need precise validation rules in the publishing phase.

## Foundation boundaries

The database schema starts with users, workspaces, memberships, clients, campaigns, drafts and audit events. It is a foundation for Phase 1, not an authentication implementation. No private data endpoint is exposed. Composite foreign keys enforce tenant consistency for linked records, but do not replace application authorization or prove complete tenant isolation. Those tests belong to Phase 1.

The initial page is a branded development preview. The illustrated campaign is conceptual; it does not expose database contents or pretend to publish campaigns.
