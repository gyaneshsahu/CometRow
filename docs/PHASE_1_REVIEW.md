# Phase 1 review guide

Run `npm run setup` from `C:\Gyanesh\Startups\CometRow` if the preview is stopped. Keep that terminal running and use a second terminal for helper commands. Open `http://127.0.0.1:3000/app`.

## Create and verify an account

1. Choose **Create an account**. Enter a name, email and a password with 15–128 characters. An `@example.test` address is fine for local testing.
2. Run `npm run mail`. Open the verification URL for your address and choose **Verify email**. Opening the URL alone does not consume the token.
3. Sign in. You should have one personal workspace and an empty campaign list.
4. Sign out and sign in again. Invalid passwords must not give access.

Unverified accounts may prepare private drafts. They cannot create organizations or manage members. There is no publishing endpoint yet.

## Campaign management

1. Enter a campaign name and choose **Create campaign**.
2. Rename it and save; inspect the heading and campaign list.
3. Choose **Duplicate**. The copy has a separate identity and draft.
4. Choose **Archive**, then **Return to drafts**.
5. Expand **Delete campaign**, type the exact name and confirm. The item moves to **Recently deleted**.
6. Restore it. The recovery window is 30 days; the previous draft/archived state is preserved.
7. Open **Activity** to see successful actions in the correct workspace.

Content cannot be edited yet. The Phase 2 panel describes future work, not an enabled composer.

## Collaboration and permissions

Run `npm run demo` to create/show four synthetic accounts and the shared demo workspace URL. Random credentials are stored only in ignored `.local/` and printed by this command.

After signing in, choose **Workspaces → Studio North · Demo agency**. Each account also owns a personal workspace; that role is separate from its organization role.

| Shared organization action                   | Owner | Editor | Viewer | Outsider |
| -------------------------------------------- | ----- | ------ | ------ | -------- |
| Read campaigns and recently deleted list     | Yes   | Yes    | Yes    | No       |
| Create, rename, duplicate, archive/unarchive | Yes   | Yes    | No     | No       |
| Delete or restore campaigns                  | Yes   | No     | No     | No       |
| View/manage members and view audit activity  | Yes   | No     | No     | No       |

As Owner, change an Editor to Viewer or remove their access. Their existing session must immediately follow the new permissions. Add people by verified account email; invitation delivery is not implemented. Personal workspaces cannot have additional members.

Sign in as the outsider and paste the shared organization URL. It should return a not-found page without disclosing organization or campaign contents.

## Password recovery

1. Sign out, choose **Forgot password?**, enter a test email and submit.
2. Run `npm run mail` and open the latest reset link for that address.
3. Choose a new password. The link expires after 30 minutes; requesting another invalidates the old one.
4. All previous sessions must stop working. The new password must work; the old one must fail.
5. Try the used link again. It must be rejected.

Unknown addresses receive the same confirmation page. Rate limits apply; repeated attempts may require a 15-minute wait. Resetting a demo account password makes its fixture-file password outdated.

## Mobile and keyboard review

Use responsive mode around 390 pixels wide. Review sign-in, workspaces, campaign details and members. Forms should stack, navigation should wrap, and controls should remain reachable without horizontal scrolling. Tab through controls and use **Skip to content**.

## Administrator-assisted ownership transfer

This operator command is restricted to development. The recipient must be a verified active member of the organization:

```sh
npm run workspace:transfer -- WORKSPACE_UUID new-owner@example.test --confirm
```

The previous Owner becomes an Editor. Membership changes, the owner field and audit event commit atomically. This command is not exposed through HTTP. Production administrator authorization remains future work.

## Automated checks

```sh
npm run check
npm audit --audit-level=high
```

Tests use an isolated database and do not change your drafts. The browser-review campaign in the demo organization is synthetic and retained for your review.

**Review gate:** Phase 2 starts only after the founder reviews Phase 1 and asks to proceed.
