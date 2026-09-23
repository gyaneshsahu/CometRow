import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import type { Pool } from 'pg';
import { buildApp } from '../../src/app.js';
import { parseConfig } from '../../src/config.js';
import { digest, token } from '../../src/identity/password.js';
import { WorkspaceService } from '../../src/workspaces/service.js';
import { emptyDocument } from '../../src/composer/schema.js';

export async function composerScenarios(pool: Pool, t: TestContext) {
  const config = parseConfig({
    NODE_ENV: 'test',
    APP_ORIGIN: 'http://127.0.0.1:3000',
    DATABASE_URL: 'postgresql://localhost/test',
    LOG_LEVEL: 'silent',
  });
  const app = await buildApp(config, {
    pool,
    mail: { send: async () => {} },
    ready: async () => {},
  });
  t.after(() => app.close());
  const workspace = randomUUID();
  const actors = [];
  for (const role of ['owner', 'editor', 'viewer', 'outsider']) {
    const id = randomUUID();
    const session = token();
    const csrf = token();
    await pool.query(
      'INSERT INTO users (id,email,display_name,email_verified_at) VALUES ($1,$2,$3,now())',
      [id, `${id}@example.test`, role],
    );
    await pool.query(
      "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '1 hour')",
      [digest(session), id],
    );
    if (role === 'owner')
      await pool.query(
        "INSERT INTO workspaces (id,name,kind,owner_id) VALUES ($1,'Composer tests','organization',$2)",
        [workspace, id],
      );
    if (role !== 'outsider')
      await pool.query(
        "INSERT INTO memberships (workspace_id,user_id,role,status) VALUES ($1,$2,$3,'active')",
        [workspace, id, role],
      );
    actors.push({
      id,
      cookie: `cometrow_session=${session}; cometrow_csrf=${csrf}`,
      csrf,
    });
  }
  const [owner, editor, viewer, outsider] = actors;
  const spaces = new WorkspaceService(pool);
  const campaign = await spaces.createCampaign(
    owner!.id,
    workspace,
    'Composer test',
  );
  const base = `/w/${workspace}/campaigns/${campaign}`;
  const doc = emptyDocument();
  doc.theme.preset = 'paper';
  const request = (
    actor = owner!,
    input?: unknown,
    route = '/draft',
    origin = config.APP_ORIGIN,
  ) =>
    app.inject({
      method: input ? 'POST' : 'GET',
      url: base + route,
      headers: { cookie: actor.cookie, accept: 'application/json', origin },
      ...(input
        ? { payload: { ...(input as object), _csrf: actor.csrf } }
        : {}),
    });
  const save = (revision: number, document = doc) => ({
    revision,
    document,
    mutationId: randomUUID(),
  });
  await t.test(
    'enhanced rename returns a confirmed name, rejects errors and retains authorization',
    async () => {
      const renamed = await request(
        owner,
        { title: '  Updated name  ' },
        '/rename',
      );
      assert.equal(renamed.statusCode, 200);
      assert.deepEqual(renamed.json(), { title: 'Updated name', saved: true });
      assert.equal(
        (await request(owner, { title: '   ' }, '/rename')).statusCode,
        400,
      );
      assert.equal(
        (await request(viewer, { title: 'Forbidden' }, '/rename')).statusCode,
        403,
      );
      assert.equal(
        (
          await request(
            owner,
            { title: 'Cross site' },
            '/rename',
            'https://evil.test',
          )
        ).statusCode,
        403,
      );
      const page = await request(owner, undefined, '');
      assert.match(page.body, /data-rename/);
      assert.match(page.body, /data-campaign-title>Updated name/);
      assert.match(
        String(page.headers['content-security-policy']),
        /script-src 'self'/,
      );
      assert.doesNotMatch(
        String(page.headers['content-security-policy']),
        /unsafe-inline/,
      );
    },
  );
  await t.test(
    'composer and saved preview require membership and safely boot the document',
    async () => {
      for (const route of ['/compose', '/preview', '/draft']) {
        assert.equal((await request(owner, undefined, route)).statusCode, 200);
        assert.equal((await request(viewer, undefined, route)).statusCode, 200);
        assert.equal(
          (await request(outsider, undefined, route)).statusCode,
          404,
        );
        assert.equal(
          (
            await app.inject({
              url: base + route,
              headers: { accept: 'application/json' },
            })
          ).statusCode,
          401,
        );
      }
      const response = await request(owner, undefined, '/compose');
      assert.match(
        String(response.headers['content-security-policy']),
        /script-src 'self'/,
      );
      assert.ok(
        !String(response.headers['content-security-policy']).includes(
          'unsafe-inline',
        ),
      );
      assert.match(
        (await request(viewer, undefined, '/compose')).body,
        /"readonly":true/,
      );
    },
  );
  await t.test(
    'editor saves canonical document, advances revision, and duplicate retry is idempotent',
    async () => {
      const input = save(1);
      const response = await request(editor, input);
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().revision, 2);
      assert.deepEqual((await request(editor, input)).json(), response.json());
      assert.equal(
        (await request(editor, { ...input, document: emptyDocument() }))
          .statusCode,
        409,
      );
      assert.deepEqual((await request()).json().document, doc);
    },
  );
  await t.test(
    'stale and simultaneous revisions cannot overwrite another writer',
    async () => {
      const stale = await request(owner, save(1));
      assert.equal(stale.statusCode, 409);
      assert.equal(stale.json().latest.revision, 2);
      const results = await Promise.all([
        request(owner, save(2)),
        request(editor, save(2)),
      ]);
      assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
      assert.equal((await request()).json().revision, 3);
    },
  );
  await t.test(
    'viewer, outsider, cross-workspace and CSRF writes fail without changing revision',
    async () => {
      assert.equal((await request(viewer, save(3))).statusCode, 403);
      assert.equal((await request(outsider, save(3))).statusCode, 404);
      assert.equal(
        (await request(owner, save(3), '/draft', 'https://evil.test'))
          .statusCode,
        403,
      );
      const cross = await app.inject({
        url: `/w/${randomUUID()}/campaigns/${campaign}/draft`,
        headers: { cookie: owner!.cookie, accept: 'application/json' },
      });
      assert.equal(cross.statusCode, 404);
      assert.equal((await request()).json().revision, 3);
    },
  );
  await t.test(
    'server rejects unknown schema and injection independently of client validation',
    async () => {
      for (const document of [
        { ...doc, schemaVersion: 9 },
        { ...doc, theme: { ...doc.theme, accent: 'red;evil' } },
        { ...doc, script: '<script>alert(1)</script>' },
      ])
        assert.equal(
          (await request(owner, { ...save(3), document })).statusCode,
          400,
        );
      assert.equal((await request()).json().revision, 3);
    },
  );
  await t.test(
    'duplicate copies content and theme into an independently editable draft',
    async () => {
      const duplicate = await spaces.mutateCampaign(
        owner!.id,
        workspace,
        campaign,
        'duplicate',
      );
      const result = await pool.query(
        'SELECT document,revision,last_save_id FROM campaign_drafts WHERE campaign_id=$1',
        [duplicate],
      );
      assert.deepEqual(result.rows[0].document, doc);
      assert.equal(result.rows[0].revision, 1);
      assert.equal(result.rows[0].last_save_id, null);
    },
  );
  await t.test(
    'two stale snapshots and stale conflict resolution cannot silently replace newer content',
    async () => {
      const id = await spaces.createCampaign(
        owner!.id,
        workspace,
        'Conflict procedure',
      );
      const url = `/w/${workspace}/campaigns/${id}/draft`;
      const send = (input?: object) =>
        app.inject({
          method: input ? 'POST' : 'GET',
          url,
          headers: {
            cookie: owner!.cookie,
            origin: config.APP_ORIGIN,
            accept: 'application/json',
          },
          ...(input ? { payload: { ...input, _csrf: owner!.csrf } } : {}),
        });
      const a = (await send()).json();
      const b = (await send()).json();
      assert.equal(a.revision, b.revision);
      const aDocument = emptyDocument();
      aDocument.theme.preset = 'paper';
      const bDocument = emptyDocument();
      bDocument.theme.preset = 'midnight';
      assert.equal((await send(save(a.revision, aDocument))).statusCode, 200);
      const conflict = await send(save(b.revision, bDocument));
      assert.equal(conflict.statusCode, 409);
      assert.equal(conflict.json().latest.document.theme.preset, 'paper');
      aDocument.theme.corners = 'square';
      assert.equal(
        (await send(save(conflict.json().latest.revision, aDocument)))
          .statusCode,
        200,
      );
      const staleChoice = await send(
        save(conflict.json().latest.revision, bDocument),
      );
      assert.equal(staleChoice.statusCode, 409);
      assert.equal((await send()).json().document.theme.corners, 'square');
      assert.equal(
        (await send({ document: bDocument, mutationId: randomUUID() }))
          .statusCode,
        400,
      );
      assert.equal(
        (await send(save(staleChoice.json().latest.revision, bDocument)))
          .statusCode,
        200,
      );
      assert.deepEqual((await send()).json().document, bDocument);
    },
  );
  await t.test(
    'membership revocation takes effect on both reads and writes',
    async () => {
      await pool.query(
        "UPDATE memberships SET status='revoked' WHERE workspace_id=$1 AND user_id=$2",
        [workspace, editor!.id],
      );
      assert.equal((await request(editor)).statusCode, 404);
      assert.equal((await request(editor, save(3))).statusCode, 404);
    },
  );
  await t.test(
    'archived drafts are read-only; deleted campaigns and expired sessions cannot access content',
    async () => {
      await spaces.mutateCampaign(owner!.id, workspace, campaign, 'archive');
      assert.equal((await request(owner, save(3))).statusCode, 409);
      assert.match(
        (await request(owner, undefined, '/compose')).body,
        /"readonly":true/,
      );
      await pool.query(
        "UPDATE campaigns SET status='deleted',deleted_at=now(),deleted_from_status='archived' WHERE id=$1",
        [campaign],
      );
      assert.equal((await request()).statusCode, 404);
      await pool.query('DELETE FROM sessions WHERE user_id=$1', [owner!.id]);
      assert.equal((await request()).statusCode, 401);
    },
  );
}
