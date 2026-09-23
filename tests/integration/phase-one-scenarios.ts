import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import type { Pool } from 'pg';
import { buildApp } from '../../src/app.js';
import { parseConfig } from '../../src/config.js';
import { IdentityService } from '../../src/identity/service.js';
import { digest } from '../../src/identity/password.js';
import { transferOwner } from '../../src/workspaces/transfer-owner.js';

export async function phaseOneScenarios(pool: Pool, t: TestContext) {
  const messages: { to: string; subject: string; text: string }[] = [];
  const mail = {
    send: async (message: (typeof messages)[number]) => {
      messages.push(message);
    },
  };
  const config = parseConfig({
    NODE_ENV: 'test',
    APP_ORIGIN: 'http://127.0.0.1:3000',
    DATABASE_URL: 'postgresql://localhost/test',
    LOG_LEVEL: 'silent',
  });
  const app = await buildApp(config, { pool, mail, ready: async () => {} });
  t.after(() => app.close());
  const identity = new IdentityService(pool, mail, config.APP_ORIGIN);
  const password = 'A long test passphrase 123!';
  let clientIndex = 1;
  function client() {
    const jar = new Map<string, string>();
    const ip = `127.0.0.${clientIndex++}`;
    return {
      jar,
      async request(
        url: string,
        payload?: Record<string, string>,
        origin: string = config.APP_ORIGIN,
      ) {
        const response = await app.inject({
          method: payload ? 'POST' : 'GET',
          url,
          remoteAddress: ip,
          headers: {
            cookie: [...jar.entries()]
              .map(([key, value]) => `${key}=${value}`)
              .join('; '),
            ...(payload
              ? { origin, 'content-type': 'application/x-www-form-urlencoded' }
              : {}),
          },
          ...(payload
            ? {
                payload: new URLSearchParams({
                  _csrf: jar.get('cometrow_csrf') ?? '',
                  ...payload,
                }).toString(),
              }
            : {}),
        });
        for (const value of response.cookies) {
          if (value.value) jar.set(value.name, value.value);
          else jar.delete(value.name);
        }
        return response;
      },
    };
  }
  const owner = client();
  const editor = client();
  const viewer = client();
  const outsider = client();
  const tokenFor = (email: string, purpose: 'verify' | 'reset') => {
    const message = messages
      .filter(
        (message) =>
          message.to === email && message.text.includes(`/${purpose}?`),
      )
      .at(-1);
    assert.ok(message);
    return /token=([a-f0-9]{64})/.exec(message.text)![1]!;
  };
  let personal = '';
  let workspace = '';
  let campaignPath = '';

  await t.test(
    'registration creates one personal workspace and never stores a plaintext password',
    async () => {
      await owner.request('/register');
      assert.equal(
        (
          await owner.request('/register', {
            name: 'Owner',
            email: 'OWNER@example.test',
            password,
          })
        ).statusCode,
        200,
      );
      const result = await pool.query(
        "SELECT id, password_hash, email_verified_at FROM users WHERE email = 'owner@example.test'",
      );
      assert.match(result.rows[0].password_hash, /^scrypt:65536:8:2:/);
      assert.ok(!result.rows[0].password_hash.includes(password));
      assert.equal(result.rows[0].email_verified_at, null);
      const spaces = await pool.query(
        'SELECT id FROM workspaces WHERE owner_id = $1',
        [result.rows[0].id],
      );
      assert.equal(spaces.rowCount, 1);
      personal = spaces.rows[0].id;
      assert.equal(
        (
          await owner.request('/register', {
            name: 'Replacement',
            email: 'owner@example.test',
            password,
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (
          await pool.query('SELECT id FROM workspaces WHERE owner_id = $1', [
            result.rows[0].id,
          ])
        ).rowCount,
        1,
      );
    },
  );
  await t.test(
    'sign-in uses opaque protected cookies and rotates and invalidates old sessions',
    async () => {
      assert.equal(
        (
          await owner.request('/login', {
            email: 'owner@example.test',
            password,
          })
        ).statusCode,
        303,
      );
      const old = owner.jar.get('cometrow_session')!;
      const next = await owner.request('/login', {
        email: 'owner@example.test',
        password,
      });
      assert.equal(next.statusCode, 303);
      assert.notEqual(owner.jar.get('cometrow_session'), old);
      assert.equal(
        (
          await pool.query('SELECT * FROM sessions WHERE token_hash = $1', [
            digest(old),
          ])
        ).rowCount,
        0,
      );
      assert.match(String(next.headers['set-cookie']), /HttpOnly/);
      assert.match(String(next.headers['set-cookie']), /SameSite=Lax/);
      assert.equal(
        (await owner.request('/app')).headers.location,
        `/w/${personal}`,
      );
      assert.equal(
        (await owner.request('/workspaces', { name: 'Too early' })).statusCode,
        403,
      );
    },
  );
  await t.test(
    'verification is explicit, single-use and unlocks organization creation',
    async () => {
      const value = tokenFor('owner@example.test', 'verify');
      assert.equal(
        (await owner.request(`/verify?token=${value}`)).statusCode,
        200,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT email_verified_at FROM users WHERE email = 'owner@example.test'",
          )
        ).rows[0].email_verified_at,
        null,
      );
      assert.equal(
        (await owner.request('/verify', { token: value })).statusCode,
        200,
      );
      assert.equal(
        (await owner.request('/verify', { token: value })).statusCode,
        400,
      );
      const response = await owner.request('/workspaces', {
        name: 'Studio North',
      });
      assert.equal(response.statusCode, 303);
      workspace = String(response.headers.location).split('/').at(-1)!;
    },
  );
  await t.test(
    'collaborator accounts verify and receive only assigned roles',
    async () => {
      for (const [browser, name] of [
        [editor, 'editor'],
        [viewer, 'viewer'],
        [outsider, 'outsider'],
      ] as const) {
        await browser.request('/register');
        assert.equal(
          (
            await browser.request('/register', {
              name,
              email: `${name}@example.test`,
              password,
            })
          ).statusCode,
          200,
        );
        assert.equal(
          (
            await browser.request('/verify', {
              token: tokenFor(`${name}@example.test`, 'verify'),
            })
          ).statusCode,
          200,
        );
        assert.equal(
          (
            await browser.request('/login', {
              email: `${name}@example.test`,
              password,
            })
          ).statusCode,
          303,
        );
      }
      assert.equal(
        (
          await owner.request(`/w/${workspace}/members`, {
            email: 'editor@example.test',
            role: 'editor',
          })
        ).statusCode,
        303,
      );
      assert.equal(
        (
          await owner.request(`/w/${workspace}/members`, {
            email: 'viewer@example.test',
            role: 'viewer',
          })
        ).statusCode,
        303,
      );
      assert.equal(
        (
          await owner.request(`/w/${personal}/members`, {
            email: 'viewer@example.test',
            role: 'viewer',
          })
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await owner.request(`/w/${workspace}/members`, {
            email: 'owner@example.test',
            role: 'remove',
          })
        ).statusCode,
        400,
      );
    },
  );
  await t.test(
    'owner and editor create and rename campaigns; output escapes advertiser input',
    async () => {
      const created = await editor.request(`/w/${workspace}/campaigns`, {
        title: 'Summer opening',
        workspace_id: personal,
        role: 'owner',
      });
      assert.equal(created.statusCode, 303);
      campaignPath = String(created.headers.location);
      assert.equal((await owner.request(campaignPath)).statusCode, 200);
      const renamed = await editor.request(`${campaignPath}/rename`, {
        title: '<script>alert(1)</script> & friends',
      });
      assert.equal(renamed.statusCode, 303);
      const detail = await viewer.request(campaignPath);
      assert.equal(detail.statusCode, 200);
      assert.match(detail.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
      assert.doesNotMatch(detail.body, /<script>/);
      assert.doesNotMatch(detail.body, /Save name/);
      assert.equal(
        (
          await editor.request(`${campaignPath}/rename`, {
            title: 'Summer opening',
          })
        ).statusCode,
        303,
      );
    },
  );
  await t.test(
    'viewer cannot perform any campaign or membership mutation, even by forged POST',
    async () => {
      assert.equal(
        (
          await viewer.request(`/w/${workspace}/campaigns`, {
            title: 'Forbidden',
          })
        ).statusCode,
        403,
      );
      for (const action of [
        'rename',
        'duplicate',
        'archive',
        'unarchive',
        'delete',
        'restore',
      ]) {
        assert.equal(
          (
            await viewer.request(`${campaignPath}/${action}`, {
              title: 'Forbidden',
              confirmation: 'Summer opening',
            })
          ).statusCode,
          403,
          action,
        );
      }
      assert.equal(
        (
          await viewer.request(`/w/${workspace}/members`, {
            email: 'outsider@example.test',
            role: 'editor',
          })
        ).statusCode,
        403,
      );
      assert.equal(
        (await viewer.request(`/w/${workspace}/members`)).statusCode,
        403,
      );
      assert.equal(
        (await editor.request(`/w/${workspace}/activity`)).statusCode,
        403,
      );
    },
  );
  await t.test(
    'cross-workspace reads and writes reveal no campaign data or existence',
    async () => {
      for (const path of [
        `/w/${workspace}`,
        campaignPath,
        `/w/${workspace}/members`,
        `/w/${workspace}/activity`,
        `/w/${workspace}/trash`,
      ]) {
        const response = await outsider.request(path);
        assert.equal(response.statusCode, 404);
        assert.doesNotMatch(response.body, /Summer opening|Studio North/);
      }
      assert.equal(
        (await outsider.request(`${campaignPath}/rename`, { title: 'Stolen' }))
          .statusCode,
        404,
      );
      const forgedPath = campaignPath.replace(workspace, personal);
      assert.equal((await owner.request(forgedPath)).statusCode, 404);
      assert.equal(
        (
          await owner.request(`${forgedPath}/delete`, {
            confirmation: 'Summer opening',
          })
        ).statusCode,
        404,
      );
    },
  );
  await t.test(
    'CSRF rejects missing tokens and foreign origins without mutations',
    async () => {
      assert.equal(
        (
          await owner.request(`${campaignPath}/rename`, {
            title: 'Cross site',
            _csrf: '',
          })
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await owner.request(
            `${campaignPath}/rename`,
            { title: 'Cross site' },
            'https://attacker.example',
          )
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await owner.request(
            `${campaignPath}/rename`,
            { title: 'Cross site' },
            '',
          )
        ).statusCode,
        403,
      );
      assert.match((await owner.request(campaignPath)).body, /Summer opening/);
      assert.equal(
        (await owner.request(`${campaignPath}/rename`, { title: '  ' }))
          .statusCode,
        400,
      );
    },
  );
  await t.test(
    'duplicate has a new identity; lifecycle and owner-only deletion/restore are enforced',
    async () => {
      const duplicated = await editor.request(`${campaignPath}/duplicate`, {});
      assert.equal(duplicated.statusCode, 303);
      assert.notEqual(duplicated.headers.location, campaignPath);
      const original = campaignPath.split('/').at(-1)!;
      const copy = String(duplicated.headers.location).split('/').at(-1)!;
      const identities = await pool.query(
        'SELECT public_id FROM campaigns WHERE id = ANY($1::uuid[])',
        [[original, copy]],
      );
      assert.equal(
        new Set(identities.rows.map((row) => row.public_id)).size,
        2,
      );
      assert.equal(
        (await editor.request(`${campaignPath}/archive`, {})).statusCode,
        303,
      );
      assert.equal(
        (await editor.request(`${campaignPath}/archive`, {})).statusCode,
        409,
      );
      assert.equal(
        (await editor.request(`${campaignPath}/unarchive`, {})).statusCode,
        303,
      );
      assert.equal(
        (
          await editor.request(`${campaignPath}/delete`, {
            confirmation: 'Summer opening',
          })
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await owner.request(`${campaignPath}/delete`, {
            confirmation: 'Wrong name',
          })
        ).statusCode,
        400,
      );
      assert.equal(
        (
          await owner.request(`${campaignPath}/delete`, {
            confirmation: 'Summer opening',
          })
        ).statusCode,
        303,
      );
      assert.equal((await owner.request(campaignPath)).statusCode, 404);
      assert.doesNotMatch(
        (await owner.request(`/w/${workspace}`)).body,
        /<h3>Summer opening<\/h3>/,
      );
      assert.equal(
        (await editor.request(`${campaignPath}/restore`, {})).statusCode,
        403,
      );
      assert.equal(
        (await owner.request(`${campaignPath}/restore`, {})).statusCode,
        303,
      );
      assert.equal((await owner.request(campaignPath)).statusCode, 200);
      assert.equal(
        (await owner.request(`${campaignPath}/publish`, {})).statusCode,
        404,
      );
    },
  );
  await t.test(
    'expired recovery window blocks restore and audit records commit with successful changes only',
    async () => {
      const before = await pool.query(
        'SELECT count(*)::int AS count FROM audit_events WHERE workspace_id = $1',
        [workspace],
      );
      await viewer.request(`${campaignPath}/rename`, { title: 'Blocked' });
      assert.equal(
        (
          await pool.query(
            'SELECT count(*)::int AS count FROM audit_events WHERE workspace_id = $1',
            [workspace],
          )
        ).rows[0].count,
        before.rows[0].count,
      );
      await owner.request(`${campaignPath}/delete`, {
        confirmation: 'Summer opening',
      });
      await pool.query(
        "UPDATE campaigns SET deleted_at = now() - interval '31 days' WHERE id = $1",
        [campaignPath.split('/').at(-1)],
      );
      assert.equal(
        (await owner.request(`${campaignPath}/restore`, {})).statusCode,
        409,
      );
      const activity = await owner.request(`/w/${workspace}/activity`);
      assert.match(activity.body, /campaign · delete/);
      assert.match(activity.body, /membership · editor/);
    },
  );
  await t.test(
    'role changes and revocation take effect for existing sessions immediately',
    async () => {
      assert.equal(
        (
          await owner.request(`/w/${workspace}/members`, {
            email: 'editor@example.test',
            role: 'viewer',
          })
        ).statusCode,
        303,
      );
      assert.equal(
        (
          await editor.request(`/w/${workspace}/campaigns`, {
            title: 'No longer editor',
          })
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await owner.request(`/w/${workspace}/members`, {
            email: 'editor@example.test',
            role: 'remove',
          })
        ).statusCode,
        303,
      );
      assert.equal((await editor.request(`/w/${workspace}`)).statusCode, 404);
      assert.equal(
        (await editor.request('/workspaces')).body.includes('Studio North'),
        false,
      );
    },
  );
  await t.test(
    'password reset responses do not enumerate accounts; token replay fails and all sessions are revoked',
    async () => {
      const response = await viewer.request('/forgot', {
        email: 'viewer@example.test',
      });
      const absent = await viewer.request('/forgot', {
        email: 'absent@example.test',
      });
      assert.equal(response.body, absent.body);
      const value = tokenFor('viewer@example.test', 'reset');
      const before = viewer.jar.get('cometrow_session')!;
      const outcomes = await Promise.all([
        viewer.request('/reset', {
          token: value,
          password: 'A replacement passphrase 456!',
        }),
        outsider.request('/reset', {
          token: value,
          password: 'A replacement passphrase 456!',
        }),
      ]);
      assert.deepEqual(
        outcomes.map((response) => response.statusCode).sort(),
        [200, 400],
      );
      assert.equal(await identity.user(before), undefined);
      assert.equal(
        (
          await viewer.request('/login', {
            email: 'viewer@example.test',
            password,
          })
        ).statusCode,
        401,
      );
      assert.equal(
        (
          await viewer.request('/login', {
            email: 'viewer@example.test',
            password: 'A replacement passphrase 456!',
          })
        ).statusCode,
        303,
      );
    },
  );
  await t.test(
    'expired and superseded email links fail; wrong passwords and unknown accounts share a response',
    async () => {
      const old = tokenFor('outsider@example.test', 'verify');
      assert.equal(
        (await outsider.request('/verify', { token: old })).statusCode,
        400,
      );
      await outsider.request('/forgot', { email: 'outsider@example.test' });
      const first = tokenFor('outsider@example.test', 'reset');
      await outsider.request('/forgot', { email: 'outsider@example.test' });
      assert.equal(
        (await outsider.request('/reset', { token: first, password }))
          .statusCode,
        400,
      );
      const latest = tokenFor('outsider@example.test', 'reset');
      await pool.query(
        "UPDATE account_tokens SET expires_at = now() - interval '1 minute' WHERE token_hash = $1",
        [digest(latest)],
      );
      assert.equal(
        (await outsider.request('/reset', { token: latest, password }))
          .statusCode,
        400,
      );
      assert.equal(
        (
          await outsider.request('/login', {
            email: 'outsider@example.test',
            password: 'wrong password',
          })
        ).body,
        (
          await outsider.request('/login', {
            email: 'nobody@example.test',
            password: 'wrong password',
          })
        ).body,
      );
    },
  );
  await t.test('logout and session expiry remove access', async () => {
    const old = viewer.jar.get('cometrow_session')!;
    assert.equal((await viewer.request('/logout', {})).statusCode, 303);
    assert.equal(await identity.user(old), undefined);
    assert.equal((await viewer.request(`/w/${workspace}`)).statusCode, 401);
    const current = owner.jar.get('cometrow_session')!;
    await pool.query(
      "UPDATE sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1",
      [digest(current)],
    );
    assert.equal((await owner.request(`/w/${workspace}`)).statusCode, 401);
    assert.equal((await owner.request('/app')).headers.location, '/login');
  });
  await t.test(
    'account throttles persist in PostgreSQL and auth endpoints enforce per-IP limits',
    async () => {
      for (let attempt = 0; attempt < 10; attempt++)
        await identity.throttle('rate@example.test', 'login');
      await assert.rejects(identity.throttle('rate@example.test', 'login'), {
        statusCode: 429,
      });
      const bot = client();
      await bot.request('/login');
      let last = 0;
      for (let attempt = 0; attempt < 21; attempt++)
        last = (await bot.request('/login', { email: 'invalid', password: '' }))
          .statusCode;
      assert.equal(last, 429);
    },
  );
  await t.test(
    'production cookies are host-only and Secure; no production local-mail fallback exists',
    async () => {
      const production = {
        ...config,
        NODE_ENV: 'production' as const,
        APP_ORIGIN: 'https://cometrow.example',
      };
      await assert.rejects(
        buildApp(production, { pool, ready: async () => {} }),
        /production email adapter/,
      );
      const secureApp = await buildApp(production, {
        pool,
        mail,
        ready: async () => {},
      });
      try {
        const response = await secureApp.inject('/login');
        assert.match(
          String(response.headers['set-cookie']),
          /__Host-cometrow_csrf=/,
        );
        assert.match(String(response.headers['set-cookie']), /Secure/);
        assert.match(String(response.headers['set-cookie']), /HttpOnly/);
        assert.doesNotMatch(String(response.headers['set-cookie']), /Domain=/);
        assert.equal(response.headers['referrer-policy'], 'strict-origin');
        assert.equal(response.headers['cache-control'], 'no-store');
      } finally {
        await secureApp.close();
      }
    },
  );
  await t.test(
    'administrator-assisted ownership transfer is atomic, audited and restricted to verified organization members',
    async () => {
      await assert.rejects(
        transferOwner(pool, personal, 'viewer@example.test'),
        /organization/,
      );
      await assert.rejects(
        transferOwner(pool, workspace, 'outsider@example.test'),
        /active member/,
      );
      await transferOwner(pool, workspace, 'viewer@example.test');
      const owners = await pool.query(
        "SELECT u.email FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = $1 AND m.role = 'owner' AND m.status = 'active'",
        [workspace],
      );
      assert.deepEqual(owners.rows, [{ email: 'viewer@example.test' }]);
      const recorded = await pool.query(
        "SELECT actor_id, target_id FROM audit_events WHERE workspace_id = $1 AND action = 'workspace.ownership_transferred'",
        [workspace],
      );
      assert.equal(recorded.rowCount, 1);
      assert.equal(recorded.rows[0].actor_id, null);
      await owner.request('/login', { email: 'owner@example.test', password });
      assert.equal(
        (await owner.request(`/w/${workspace}/members`)).statusCode,
        403,
      );
      await viewer.request('/login', {
        email: 'viewer@example.test',
        password: 'A replacement passphrase 456!',
      });
      assert.equal(
        (await viewer.request(`/w/${workspace}/members`)).statusCode,
        200,
      );
    },
  );
  await t.test(
    'concurrent duplicate registrations create exactly one account and personal workspace',
    async () => {
      await Promise.all([
        identity.register({
          email: 'race@example.test',
          name: 'Race',
          password,
        }),
        identity.register({
          email: 'race@example.test',
          name: 'Race',
          password,
        }),
      ]);
      const result = await pool.query(
        "SELECT w.id FROM workspaces w JOIN users u ON u.id = w.owner_id WHERE u.email = 'race@example.test' AND w.kind = 'personal'",
      );
      assert.equal(result.rowCount, 1);
      assert.equal(
        messages.filter((message) => message.to === 'race@example.test').length,
        1,
      );
    },
  );
}
