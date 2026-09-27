import { readFile } from 'node:fs/promises';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import { registerComposer } from '../composer/routes.js';
import { DraftConflict } from '../composer/service.js';
import formbody from '@fastify/formbody';
import rateLimit from '@fastify/rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Pool } from 'pg';
import type { Config } from '../config.js';
import type { EmailService } from '../shared/providers.js';
import { IdentityService, type User } from '../identity/service.js';
import { WorkspaceService } from '../workspaces/service.js';
import { token } from '../identity/password.js';
import { AppError } from '../shared/errors.js';
import { date, escapeHtml as e, field, input, page, post } from './ui.js';

const body = (request: FastifyRequest) =>
  (request.body ?? {}) as Record<string, unknown>;
const params = (request: FastifyRequest) =>
  request.params as { workspace: string; campaign: string };
const authLimit = {
  config: {
    rateLimit: { max: 20, timeWindow: '15 minutes', groupId: 'authentication' },
  },
};

export async function registerPhaseOne(
  app: FastifyInstance,
  config: Config,
  pool: Pool,
  mail: EmailService,
) {
  const identity = new IdentityService(pool, mail, config.APP_ORIGIN);
  const workspaces = new WorkspaceService(pool);
  const secure = config.NODE_ENV === 'production';
  const sessionCookie = secure ? '__Host-cometrow_session' : 'cometrow_session';
  const csrfCookie = secure ? '__Host-cometrow_csrf' : 'cometrow_csrf';
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
  };
  const csrfValues = new WeakMap<FastifyRequest, string>();
  const csrf = (request: FastifyRequest) => csrfValues.get(request)!;
  const send = (reply: FastifyReply, html: string) =>
    reply.type('text/html; charset=utf-8').send(html);
  const redirect = (reply: FastifyReply, url: string) =>
    reply.code(303).redirect(url);
  const user = async (request: FastifyRequest): Promise<User> => {
    const value = await identity.user(request.cookies[sessionCookie]);
    if (!value) throw new AppError(401, 'Please sign in to continue.');
    return value;
  };
  await app.register(cookie);
  await app.register(formbody);
  await app.register(rateLimit, { max: 180, timeWindow: '1 minute' });
  app.addHook('onRequest', async (request, reply) => {
    reply
      .header('Cache-Control', 'no-store')
      .header('Referrer-Policy', 'strict-origin');
    let value = request.cookies[csrfCookie];
    if (!value || !/^[a-f0-9]{64}$/.test(value)) {
      value = token();
      reply.setCookie(csrfCookie, value, cookieOptions);
    }
    csrfValues.set(request, value);
  });
  app.addHook('preValidation', async (request) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    const incoming = request.cookies[csrfCookie];
    const supplied = body(request)._csrf;
    if (
      request.headers.origin !== config.APP_ORIGIN ||
      !incoming ||
      typeof supplied !== 'string' ||
      !/^[a-f0-9]{64}$/.test(supplied) ||
      !/^[a-f0-9]{64}$/.test(incoming) ||
      !timingSafeEqual(Buffer.from(incoming), Buffer.from(supplied))
    ) {
      throw new AppError(
        403,
        'This form has expired or came from another site. Reload the page and try again.',
      );
    }
  });
  app.setErrorHandler((error, request, reply) => {
    const known = error instanceof AppError;
    const invalid = error instanceof z.ZodError;
    const status = known
      ? error.statusCode
      : invalid
        ? 400
        : error &&
            typeof error === 'object' &&
            'statusCode' in error &&
            typeof error.statusCode === 'number'
          ? error.statusCode
          : 500;
    const message = known
      ? error.message
      : invalid
        ? 'Check your entries. Names cannot be empty, email must be valid, and new passwords need 15–128 characters.'
        : status === 429
          ? 'Too many requests. Please wait before trying again.'
          : 'Something went wrong. Please try again.';
    if (status >= 500)
      request.log.error({ requestId: request.id }, 'Request failed');
    reply.code(status);
    if (request.headers.accept?.includes('application/json'))
      return reply.send({
        error: invalid ? 'Check the campaign fields.' : message,
        ...(error instanceof DraftConflict ? { latest: error.latest } : {}),
        ...(invalid ? { issues: error.issues } : {}),
      });
    return send(
      reply,
      page(
        status === 401 ? 'Sign in required' : 'Unable to complete this action',
        `<div class="card"><p class="overline">LET’S GET YOU BACK ON TRACK</p><h1>${status === 401 ? 'Sign in to continue.' : 'We couldn’t complete that.'}</h1><div class="notice error" role="alert">${e(message)}</div><p class="subtle">Use your browser’s Back button to return to the form, or choose a destination below.</p><div class="actions"><a class="button" href="/app">My workspace</a><a class="button secondary" href="/login">Sign in</a><a class="link" href="/forgot">Reset password</a></div></div>`,
        csrf(request) ?? '',
      ),
    );
  });
  registerComposer(app, pool, user, csrf);
  app.get('/app.css', async (_request, reply) =>
    reply
      .type('text/css')
      .send(await readFile('dist/public/workspace-style.css', 'utf8')),
  );

  for (const mode of ['login', 'register', 'forgot'] as const) {
    app.get(`/${mode}`, async (request, reply) => {
      const title =
        mode === 'register'
          ? 'Make room for your next campaign.'
          : mode === 'forgot'
            ? 'Let’s get you back in.'
            : 'Good to have you back.';
      return send(
        reply,
        page(
          title,
          `<p class="overline">${mode === 'register' ? 'START YOUR COMETROW WORKSPACE' : 'YOUR NEXT CHAPTER STARTS HERE'}</p><h1>${title}</h1><p class="subtle">${mode === 'register' ? 'Create your account and start with a private personal workspace.' : mode === 'forgot' ? 'Enter your email to request a password reset link.' : 'Sign in to your campaigns, team and workspace.'}</p><div class="card"><form class="form-grid" method="post" action="/${mode}">${field(csrf(request))}${mode === 'register' ? input('Your name', 'name', 'autocomplete="name" maxlength="120"') : ''}${input('Email address', 'email', 'type="email" autocomplete="email" maxlength="254"')}${mode !== 'forgot' ? input('Password', 'password', `type="password" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" ${mode === 'register' ? 'minlength="15"' : ''} maxlength="128"`) : ''}${mode === 'register' ? '<p class="hint">Use a passphrase of 15–128 characters. Spaces are welcome.</p>' : ''}<button type="submit">${mode === 'register' ? 'Create account ↗' : mode === 'forgot' ? 'Send reset link' : 'Sign in →'}</button></form></div><p class="subtle">${mode === 'login' ? '<a class="link" href="/register">Create an account</a> &nbsp; · &nbsp; <a class="link" href="/forgot">Forgot password?</a>' : '<a class="link" href="/login">Back to sign in</a>'}</p>`,
          csrf(request),
        ),
      );
    });
  }
  app.post('/register', authLimit, async (request, reply) => {
    await identity.register(body(request));
    return send(
      reply,
      page(
        'Check your email',
        `<div class="card"><span class="spark">✉</span><h1>Check your email.</h1><p class="subtle">If this address is available, your account has been created and a verification link is on its way. If you already have an account, sign in or reset your password.</p><p class="hint">Local development emails are saved on this computer. Run <code>npm run mail</code> in the project folder to read them.</p><div class="actions"><a class="button" href="/login">Continue to sign in →</a></div></div>`,
        csrf(request),
      ),
    );
  });
  app.post('/login', authLimit, async (request, reply) => {
    const value = await identity.login(body(request));
    await identity.logout(request.cookies[sessionCookie]);
    reply.setCookie(sessionCookie, value, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    });
    reply.setCookie(csrfCookie, token(), cookieOptions);
    return redirect(reply, '/app');
  });
  app.post('/logout', async (request, reply) => {
    await identity.logout(request.cookies[sessionCookie]);
    reply.clearCookie(sessionCookie, cookieOptions);
    reply.clearCookie(csrfCookie, cookieOptions);
    return redirect(reply, '/login');
  });
  app.post('/forgot', authLimit, async (request, reply) => {
    await identity.forgot(body(request).email);
    return send(
      reply,
      page(
        'Check your email',
        '<div class="card"><h1>Check your email.</h1><p class="subtle">If an account matches that address, we’ve sent a reset link. The link expires in 30 minutes.</p><p class="hint">For local development, read messages with <code>npm run mail</code>.</p><div class="actions"><a class="button" href="/login">Back to sign in</a></div></div>',
        csrf(request),
      ),
    );
  });
  for (const purpose of ['verify', 'reset'] as const) {
    app.get(`/${purpose}`, async (request, reply) => {
      const value = z
        .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
        .parse(request.query).token;
      return send(
        reply,
        page(
          purpose === 'verify' ? 'Verify your email' : 'Choose a new password',
          `<div class="card"><h1>${purpose === 'verify' ? 'Confirm your email.' : 'A fresh start.'}</h1><p class="subtle">${purpose === 'verify' ? 'Confirm that this email address belongs to you.' : 'Resetting your password signs you out on every device.'}</p><form method="post" class="form-grid" action="/${purpose}">${field(csrf(request))}<input type="hidden" name="token" value="${value}">${purpose === 'reset' ? input('New password', 'password', 'type="password" autocomplete="new-password" minlength="15" maxlength="128"') : ''}<button type="submit">${purpose === 'verify' ? 'Verify email' : 'Save new password'}</button></form></div>`,
          csrf(request),
        ),
      );
    });
    app.post(`/${purpose}`, authLimit, async (request, reply) => {
      await identity.consume(
        body(request).token,
        purpose,
        body(request).password,
      );
      if (purpose === 'reset') reply.clearCookie(sessionCookie, cookieOptions);
      return send(
        reply,
        page(
          'All set',
          `<div class="card"><span class="spark">✓</span><h1>${purpose === 'verify' ? 'Email verified.' : 'Password updated.'}</h1><p class="subtle">${purpose === 'verify' ? 'Your email is confirmed. You can now create an organization and manage its members.' : 'Your previous sessions have been signed out. Use your new password to continue.'}</p><div class="actions"><a class="button" href="${purpose === 'verify' ? '/app' : '/login'}">Continue →</a></div></div>`,
          csrf(request),
        ),
      );
    });
  }
  app.get('/account', async (request, reply) => {
    const current = await user(request);
    return send(
      reply,
      page(
        'My account',
        `<div class="narrow"><p class="overline">YOUR IDENTITY</p><h1>My account</h1><div class="card"><h2>${e(current.display_name)}</h2><p class="subtle">${e(current.email)}</p><span class="pill">${current.email_verified_at ? 'Email verified' : 'Verification needed'}</span>${!current.email_verified_at ? `<div class="actions">${post('/account/verify', csrf(request), 'Send a new verification email', '', 'button')}</div><p class="subtle">Read local messages with <code>npm run mail</code>.</p>` : ''}<hr class="divider"><a class="link" href="/forgot">Reset password and sign out all devices</a></div></div>`,
        csrf(request),
        current,
      ),
    );
  });
  app.post('/account/verify', authLimit, async (request, reply) => {
    const current = await user(request);
    await identity.resend(current);
    return send(
      reply,
      page(
        'Email sent',
        '<div class="card"><h1>Check your email.</h1><p class="subtle">A fresh verification link was created if your email still needs verification. Read local messages with <code>npm run mail</code>.</p><a class="link" href="/account">Back to account</a></div>',
        csrf(request),
        current,
      ),
    );
  });
  app.get('/app', async (request, reply) => {
    const current = await identity.user(request.cookies[sessionCookie]);
    if (!current) return redirect(reply, '/login');
    const list = await workspaces.list(current.id);
    return redirect(reply, list[0] ? `/w/${list[0].id}` : '/workspaces');
  });
  app.get('/workspaces', async (request, reply) => {
    const current = await user(request);
    const list = await workspaces.list(current.id);
    return send(
      reply,
      page(
        'Workspaces',
        `<div class="page-head"><div><p class="overline">A PLACE FOR EVERY TEAM</p><h1>Your workspaces</h1><p class="subtle">Keep your campaigns and collaborators together.</p></div></div><div class="campaign-list">${list.map((workspace) => `<a class="campaign-row" href="/w/${workspace.id}"><div><h3>${e(workspace.name)}</h3><span class="pill">${workspace.kind} · ${workspace.role}</span></div><span class="chevron" aria-hidden="true">↗</span></a>`).join('')}</div><div class="card narrow"><h2>Create an organization</h2><p class="subtle">A shared workspace for your agency, business or team.</p><form class="inline-form" method="post" action="/workspaces">${field(csrf(request))}${input('Organization name', 'name', 'maxlength="120"')}<button type="submit">Create workspace</button></form></div>`,
        csrf(request),
        current,
      ),
    );
  });
  app.post('/workspaces', async (request, reply) =>
    redirect(
      reply,
      `/w/${await workspaces.create(await user(request), body(request).name)}`,
    ),
  );

  app.get('/w/:workspace', async (request, reply) => {
    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    const current = await user(request);
    const { workspace, campaigns } = await workspaces.dashboard(
      current.id,
      params(request).workspace,
    );
    const base = `/w/${workspace.id}`;
    return send(
      reply,
      page(
        'Campaigns',
        `<div class="page-head"><div><p class="overline">${e(workspace.name)}</p><h1>Campaigns</h1><p class="subtle">Create, organize and refine your campaigns.</p></div>${workspace.role !== 'viewer' ? '<a class="button" href="#new-campaign">Create campaign</a>' : '<span class="pill">Viewer access</span>'}</div><div class="workspace-metrics"><div class="metric"><span>Total campaigns</span><strong>${campaigns.length}</strong></div><div class="metric"><span>Drafts</span><strong>${campaigns.filter((c) => c.status === 'draft').length}</strong></div><div class="metric"><span>Archived</span><strong>${campaigns.filter((c) => c.status === 'archived').length}</strong></div></div>${workspace.role !== 'viewer' ? `<section id="new-campaign" class="card create-card"><h2>Create a campaign</h2><p class="subtle">Give it a name. You can change it anytime.</p><form class="inline-form" method="post" action="${base}/campaigns">${field(csrf(request))}${input('Campaign name', 'title', 'maxlength="160" placeholder="e.g. Studio open day"')}<button type="submit">Create campaign ↗</button></form></section>` : '<div class="notice">You have Viewer access. An Owner or Editor can make changes.</div>'}<div class="collection-toolbar"><h2>Your campaigns</h2><div class="collection-filters"><label>Search campaigns<input type="search" id="campaign-search" placeholder="Search by name"></label><label>Status<select id="campaign-filter"><option value="all">All statuses</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label></div></div><div class="campaign-list">${campaigns.map((campaign, index) => `<a data-campaign-row data-name="${e(campaign.title.toLowerCase())}" data-status="${campaign.status}" class="campaign-row" href="${base}/campaigns/${campaign.id}"><span class="campaign-avatar" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div class="campaign-copy"><h3>${e(campaign.title)}</h3><div class="row-meta"><span class="pill" data-status="${campaign.status}">${campaign.status}</span><span>Updated ${date(campaign.updated_at)}</span><span>Private workspace</span></div></div><span class="row-action">Open campaign →</span></a>`).join('')}</div><div id="filter-empty" class="empty" ${campaigns.length ? 'hidden' : ''}><h2>${campaigns.length ? 'No matching campaigns' : 'Your first campaign starts here'}</h2><p>${campaigns.length ? 'Try another name or choose All statuses.' : 'Start with a name, then bring your story together on the canvas.'}</p>${!campaigns.length && workspace.role !== 'viewer' ? '<a class="button" href="#new-campaign">Create your first campaign</a>' : ''}</div><p id="filter-status" role="status" class="hint">${campaigns.length} campaigns shown · Most recently updated first</p>`,
        csrf(request),
        current,
        workspace,
        true,
      ),
    );
  });
  app.post('/w/:workspace/campaigns', async (request, reply) => {
    const current = await user(request);
    const workspace = params(request).workspace;
    const id = await workspaces.createCampaign(
      current.id,
      workspace,
      body(request).title,
    );
    return redirect(reply, `/w/${workspace}/campaigns/${id}`);
  });
  app.get('/w/:workspace/campaigns/:campaign', async (request, reply) => {
    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    const current = await user(request);
    const { workspace, campaign } = await workspaces.campaign(
      current.id,
      params(request).workspace,
      params(request).campaign,
    );
    const base = `/w/${workspace.id}/campaigns/${campaign.id}`;
    return send(
      reply,
      page(
        campaign.title,
        `<a class="back" href="/w/${workspace.id}">← All campaigns</a><section class="overview-hero"><div><p class="overline">Campaign overview</p><h1 data-campaign-title>${e(campaign.title)}</h1><div class="statusline"><span class="pill" data-status="${campaign.status}">${campaign.status}</span><p>Private to ${e(workspace.name)}</p></div></div><div class="actions"><a class="button" href="${base}/customize">Customize ↗</a><a class="button secondary" href="${base}/preview">Saved preview</a></div></section><div class="overview-grid"><section class="card"><h2>Campaign details</h2><p class="subtle">Use a clear name so your team can find this campaign.</p>${workspace.role !== 'viewer' ? `<form data-rename class="form-grid" action="${base}/rename" method="post">${field(csrf(request))}${input('Campaign name', 'title', `maxlength="160" value="${e(campaign.title)}"`)}<div class="name-actions"><button type="submit">Save name</button></div><p class="name-status" role="status" aria-live="polite">${(request.query as { saved?: string }).saved === 'name' ? 'Saved. Campaign name updated.' : ''}</p></form>` : '<p class="notice">Your Viewer role gives you read-only access to this campaign.</p>'}<div class="campaign-summary"><div><span>Last updated</span><strong>${date(campaign.updated_at)}</strong></div><div><span>Visibility</span><strong>Private draft</strong></div><div><span>Layout</span><strong>Responsive</strong></div></div></section><section class="card"><p class="overline">Make it yours</p><h2>From a name to a story</h2><ol class="workflow-list"><li><span class="step">1</span><div><strong>Build your content</strong><small>Add and arrange containers on the canvas.</small></div></li><li><span class="step">2</span><div><strong>Choose your look</strong><small>Apply one theme across the campaign.</small></div></li><li><span class="step">3</span><div><strong>Review every screen</strong><small>Preview phone, tablet and desktop.</small></div></li></ol><p class="hint">Publishing and media uploads are not available yet.</p></section></div>${workspace.role !== 'viewer' ? `<details class="card manage-campaign"><summary>Manage campaign</summary><div class="actions">${post(`${base}/duplicate`, csrf(request), 'Duplicate')}${post(`${base}/${campaign.status === 'archived' ? 'unarchive' : 'archive'}`, csrf(request), campaign.status === 'archived' ? 'Return to drafts' : 'Archive')}</div>${workspace.role === 'owner' ? `<details><summary>Delete campaign</summary><p class="subtle">Move this campaign to Recently deleted. Owners can restore it within 30 days. Type its exact name to confirm.</p><form class="inline-form" method="post" action="${base}/delete">${field(csrf(request))}${input('Confirm campaign name', 'confirmation', 'maxlength="160" autocomplete="off"')}<button class="danger" type="submit">Move to recently deleted</button></form></details>` : ''}</details>` : ''}`,
        csrf(request),
        current,
        workspace,
        true,
      ),
    );
  });
  for (const action of [
    'rename',
    'duplicate',
    'archive',
    'unarchive',
    'delete',
    'restore',
  ] as const) {
    app.post(
      `/w/:workspace/campaigns/:campaign/${action}`,
      async (request, reply) => {
        const current = await user(request);
        const { workspace, campaign } = params(request);
        const id = await workspaces.mutateCampaign(
          current.id,
          workspace,
          campaign,
          action,
          body(request).title,
          body(request).confirmation,
        );
        if (
          action === 'rename' &&
          request.headers.accept?.includes('application/json')
        )
          return reply.send({
            title: String(body(request).title).trim(),
            saved: true,
          });
        return redirect(
          reply,
          action === 'delete'
            ? `/w/${workspace}/trash`
            : `/w/${workspace}/campaigns/${id}${action === 'rename' ? '?saved=name' : ''}`,
        );
      },
    );
  }
  app.get('/w/:workspace/trash', async (request, reply) => {
    const current = await user(request);
    const { workspace, campaigns } = await workspaces.dashboard(
      current.id,
      params(request).workspace,
      true,
    );
    return send(
      reply,
      page(
        'Recently deleted',
        `<p class="overline">ROOM TO CHANGE YOUR MIND</p><h1>Recently deleted</h1><p class="subtle">Owners can restore campaigns within 30 days of deletion.</p><div class="campaign-list">${campaigns.length ? campaigns.map((campaign) => `<div class="campaign-row"><div><h3>${e(campaign.title)}</h3><p class="hint">Deleted ${date(campaign.deleted_at!)}</p></div>${workspace.role === 'owner' && Date.now() - campaign.deleted_at!.getTime() < 30 * 86400000 ? post(`/w/${workspace.id}/campaigns/${campaign.id}/restore`, csrf(request), 'Restore') : '<span class="pill">Not available to restore</span>'}</div>`).join('') : '<div class="empty"><h2>Nothing here.</h2><p>Your deleted campaigns will appear here.</p></div>'}</div>`,
        csrf(request),
        current,
        workspace,
      ),
    );
  });
  app.get('/w/:workspace/members', async (request, reply) => {
    const current = await user(request);
    const { workspace, members } = await workspaces.members(
      current.id,
      params(request).workspace,
    );
    const base = `/w/${workspace.id}/members`;
    return send(
      reply,
      page(
        'Members',
        `<p class="overline">THE PEOPLE BEHIND THE CAMPAIGNS</p><h1>Workspace members</h1><p class="subtle">Owners manage access and deletion. Editors create and manage campaigns. Viewers can read campaigns.</p><div class="card">${members.map((member) => `<div class="member"><div><h3>${e(member.display_name)}</h3><p>${e(member.email)}</p><span class="pill">${member.role}</span></div>${member.role !== 'owner' ? `<form method="post" action="${base}">${field(csrf(request))}<input type="hidden" name="email" value="${e(member.email)}"><label>Role for ${e(member.display_name)}<select name="role"><option value="editor" ${member.role === 'editor' ? 'selected' : ''}>Editor</option><option value="viewer" ${member.role === 'viewer' ? 'selected' : ''}>Viewer</option><option value="remove">Remove access</option></select></label><button type="submit">Update</button></form>` : ''}</div>`).join('')}</div>${workspace.kind === 'organization' ? `<div class="card narrow"><h2>Add a collaborator</h2><p class="subtle">Ask them to register and verify their CometRow email first. Access takes effect immediately.</p><form class="form-grid" action="${base}" method="post">${field(csrf(request))}${input('Collaborator email', 'email', 'type="email" maxlength="254"')}<label>Role<select name="role"><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label><button type="submit">Add member</button></form></div>` : '<div class="notice">Personal workspaces have one owner. Create an organization to collaborate.</div>'}<p class="hint">Ownership transfer is administrator-assisted and is not available in this interface.</p>`,
        csrf(request),
        current,
        workspace,
      ),
    );
  });
  app.post('/w/:workspace/members', async (request, reply) => {
    const current = await user(request);
    await workspaces.changeMember(
      current,
      params(request).workspace,
      body(request).email,
      body(request).role,
    );
    return redirect(reply, `/w/${params(request).workspace}/members`);
  });
  app.get('/w/:workspace/activity', async (request, reply) => {
    const current = await user(request);
    const { workspace, events } = await workspaces.activity(
      current.id,
      params(request).workspace,
    );
    return send(
      reply,
      page(
        'Workspace activity',
        `<p class="overline">A CLEAR RECORD</p><h1>Workspace activity</h1><p class="subtle">The latest 100 account, membership and campaign actions in this workspace.</p><div class="card"><ul class="activity">${events.map((event) => `<li><div><strong>${e(event.action.replaceAll('.', ' · '))}</strong><p class="hint">${e(event.display_name ?? 'System')}</p></div><small>${date(event.created_at)}</small></li>`).join('')}</ul>${events.length ? '' : '<p class="subtle">No activity yet.</p>'}</div>`,
        csrf(request),
        current,
        workspace,
      ),
    );
  });
}
