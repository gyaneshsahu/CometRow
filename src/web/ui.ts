import type { User } from '../identity/service.js';
import type { Workspace } from '../workspaces/service.js';

export const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
export const field = (csrf: string) =>
  `<input type="hidden" name="_csrf" value="${escapeHtml(csrf)}">`;
export const date = (value: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(value);
export const post = (
  url: string,
  csrf: string,
  label: string,
  extras = '',
  style = 'button secondary',
) =>
  `<form method="post" action="${url}">${field(csrf)}${extras}<button class="${style}" type="submit">${escapeHtml(label)}</button></form>`;
export const input = (label: string, name: string, options = '') =>
  `<label>${escapeHtml(label)}<input name="${name}" ${options} required></label>`;

export function page(
  title: string,
  content: string,
  csrf: string,
  user?: User,
  workspace?: Workspace,
  enhanced = false,
) {
  const base = workspace ? `/w/${workspace.id}` : '/app';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · CometRow</title><link rel="stylesheet" href="/app.css">${enhanced ? '<script type="module" src="/assets/workspace.js"></script>' : ''}</head><body>
    <a class="skip" href="#main">Skip to content</a><header><a class="brand" href="${user ? '/app' : '/'}"><span aria-hidden="true">↗</span>CometRow</a><div class="account">${user ? `<a href="/account">${escapeHtml(user.display_name)}</a>${post('/logout', csrf, 'Sign out', '', 'text-button')}` : '<a href="/login">Sign in</a><a class="button small" href="/register">Get started ↗</a>'}</div></header>
    <div class="shell ${user ? '' : 'public'}">${user ? `<aside><p class="overline">YOUR WORKSPACE</p><h2>${escapeHtml(workspace?.name ?? 'CometRow')}</h2>${workspace ? `<span class="pill">${workspace.kind} · ${workspace.role}</span>` : ''}<nav aria-label="Main navigation"><a ${title === 'Campaigns' ? 'aria-current="page"' : ''} href="${base}">Campaigns</a><a ${title === 'Workspaces' ? 'aria-current="page"' : ''} href="/workspaces">Workspaces</a>${workspace ? `<a href="${base}/trash">Recently deleted</a>${workspace.role === 'owner' ? `<a href="${base}/members">Members</a><a href="${base}/activity">Activity</a>` : ''}` : ''}<a ${title === 'My account' ? 'aria-current="page"' : ''} href="/account">My account</a></nav><div class="aside-note"><span class="spark">✳</span><p>One campaign.<br>Every touchpoint.</p><small>Publishing comes in a later phase.</small></div></aside>` : ''}
    <main id="main">${user && !user.email_verified_at ? `<div class="notice"><strong>One more step: verify your email.</strong><p>You can prepare drafts now. Verify your email to create an organization and manage members.</p><a href="/account">Manage email verification →</a></div>` : ''}${content}</main></div><footer>CometRow <span>Publish once. Distribute everywhere.</span><small>PHASE 2 · LOCAL PREVIEW</small></footer></body></html>`;
}
