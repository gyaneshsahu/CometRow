# CometRow

**Product brand is fixed:** preserve the current CometRow name, logo, application colours, typography and overall identity. Future editor UX work may change layout and interactions only unless the founder explicitly approves a brand change. See [AGENTS.md](AGENTS.md) for repository-wide guidance.

Publish once. Distribute everywhere. Update anytime. Know what worked.

CometRow is a hosted campaign publishing platform. **Phase 1 is accepted. Phase 2 is not accepted; its UX revision is ready for another founder review. Phase 3 has not begun.** Accounts, workspaces, permissions, campaign management and the responsive campaign composer work locally. Uploads, public publishing, QR codes and analytics remain later phases.

Start with the [Phase 2 review guide](docs/PHASE_2_REVIEW.md), [current status](docs/STATUS.md) and [composer security notes](docs/SECURITY_PHASE_2.md).

For the **latest isolated P0 editor prototype**, run `npx.cmd tsx scripts/editor-p0.ts` and open `http://127.0.0.1:3002` (no login). Read the [founder walkthrough](docs/EDITOR_P0_REVIEW.md), [complete requirement audit](docs/EDITOR_P0_TRACEABILITY.md) and [schema/migration proposal](docs/EDITOR_P0_SCHEMA_DESIGN.md). This review copy has no production connection. Partial requirements remain documented; integration and Phase 3 are not authorized.

## Try the composer

Run `npm run setup`. In a second terminal, run `npm run demo` for test credentials, then `npm run demo:composer` for a populated campaign with all twelve core blocks. Both demo commands preserve existing fixtures. Open the printed composer link after signing in as the demo Owner. Use **Campaign overview → Manage campaign → Duplicate** to experiment on a copy.

The composer uses one versioned document across Phone, Tablet and Desktop previews. Build opens labelled block cards; selecting a block opens focused editing with a contextual preview. Preview campaign shows the complete responsive document. Mobile has explicit All blocks, Next block and Preview this block navigation. Drafts autosave after a short pause. Competing saves require an explicit choice. Media is represented by placeholders and preview links are inactive.

## Try the accounts and workspaces

Open **http://127.0.0.1:3000/app**. Use this exact origin: `localhost` is a different origin for CSRF validation. Register an account, or run `npm run demo` in a second terminal for optional Owner, Editor, Viewer and outsider accounts. The demo command creates random credentials, prints them and stores them in ignored `.local/demo-accounts.json`. Subsequent runs show the existing fixture details.

After signing in with a demo account, select **Workspaces → Studio North · Demo agency**. Every account also owns its personal workspace; demo roles apply to the shared organization.

Verification and recovery emails are local files, with no external delivery. Run `npm run mail` (optionally `npm run mail -- you@example.test`) to read the latest ten messages. Open the link and explicitly confirm verification or choose a new password. The mailbox lives in ignored `.local/mail/` and is never served over HTTP.

Docker Desktop **29.8.0** and PostgreSQL **18.6** are installed on this workstation. The previous conclusion that they were absent was incorrect; their commands were not on this shell's PATH. This milestone preserves the existing local database. Automated tests still use isolated PostgreSQL 18.4 binaries from the development dependency.

## Start locally

Requires Node.js 24 and npm. From the repository root:

```sh
npm ci
npm run setup
```

Open **http://127.0.0.1:3000**. Setup generates `.env` with a random local database password if it does not exist, initializes real PostgreSQL on `127.0.0.1:5433`, applies migrations, inserts synthetic draft data and starts the application. No Docker, cloud account or external credentials are required. Initial installation downloads dependencies and platform-specific PostgreSQL binaries.

Stop with Ctrl+C. Data persists under `.local/postgres`; subsequent starts preserve it. Do not run setup and Docker's database on the same port. If the process is forcibly terminated, inspect the existing local server before starting another instance. Setup never deletes an existing database or overwrites `.env`.

On systems with a corporate certificate authority, Node 24 can use the system certificate store (`$env:NODE_OPTIONS='--use-system-ca'` in PowerShell). Never disable TLS verification. In PowerShell environments that restrict npm scripts, use `npm.cmd` instead of `npm`.

## Commands

| Command                    | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `npm run setup`            | Build composer, start local PostgreSQL, migrate, seed and serve |
| `npm run services:start`   | Start PostgreSQL through Docker Compose instead                 |
| `npm run services:stop`    | Stop Compose services while preserving data                     |
| `npm run db:migrate`       | Apply checked, transactional migrations                         |
| `npm run db:seed`          | Seed synthetic data, development/test only                      |
| `npm run dev`              | Watch application sources using an already running database     |
| `npm test`                 | Schema, rendering, autosave, configuration and HTTP unit tests  |
| `npm run test:integration` | Real PostgreSQL tests using an isolated local cluster           |
| `npm run check`            | Typecheck, lint, formatting, unit/integration tests and build   |
| `npm run build`            | Compile server/scripts and bundle the composer into `dist`      |
| `npm start`                | Run compiled server using the configured database               |

Integration tests keep isolated data under `.local/tests` for failure inspection and shut their database processes down after execution. They do not touch the development database. Docker-based development requires a `.env` based on `.env.example` with a chosen local password, then `services:start`, `db:migrate`, `db:seed`, and `dev`. In that mode, keep the password in `DATABASE_URL` and `POSTGRES_PASSWORD` consistent.

Composer assets are built automatically by `setup`, `dev`, and `build`. After changing browser code during a `dev` session, run `npm run build:client` and reload the browser. Serve the compiled application from the repository root so it can locate `dist/public`.

## Health and security

`GET /health/live` checks process liveness. `GET /health/ready` checks database access and the Phase 2 migration. The readiness endpoint returns HTTP 503 when unavailable without exposing connection details. The initial page remains available independently of the database.

Private campaign routes now require authentication and active workspace membership. Seed and demo data is fictional and unpublished. The complete publishing lifecycle remains future work; do not invite pilot users until later security and acceptance gates pass. Production startup rejects the local email fallback until an approved production adapter is supplied.

Additional Phase 1 commands: `npm run demo`, `npm run mail`, `npm run auth:cleanup` (removes expired authentication records), and `npm run workspace:transfer -- <workspace-id> <new-owner-email> --confirm` (local administrator-assisted ownership transfer). Expired sessions and tokens are rejected even before cleanup. No cleanup scheduler is installed.

Docker CLI on this workstation: `C:\Users\sahug\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`. PostgreSQL client: `C:\Program Files\PostgreSQL\18\bin\psql.exe`. Add the appropriate directory to your shell PATH for short commands. The Docker Compose configuration is provided as an alternative; existing Docker containers and system PostgreSQL instances were not reconfigured.

## Project map

- `cometrow-spec/`: the original product requirements with CometRow naming.
- `docs/IMPLEMENTATION_PLAN.md`: analysis, phase sequence and deferred decisions.
- `docs/ARCHITECTURE.md`: stack choice, module ownership and operational limits.
- `src/`: HTTP application, configuration, database foundation and provider contracts.
- `migrations/`: versioned SQL; add a new file instead of editing applied migrations.
- `scripts/`: local startup, migration and seed entry points.
- `tests/`: unit and PostgreSQL integration tests.
- `.github/workflows/ci.yml`: clean-install verification and production dependency audit.

Production hosting, object storage, managed video, email, legal documents and domain configuration remain future decisions. No costs or production credentials were introduced.
