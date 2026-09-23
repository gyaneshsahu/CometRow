const rename = document.querySelector<HTMLFormElement>('[data-rename]');
if (rename) {
  const input = rename.elements.namedItem('title') as HTMLInputElement;
  const button = rename.querySelector<HTMLButtonElement>(
    'button[type=submit]',
  )!;
  const status = rename.querySelector<HTMLElement>('[role=status]')!;
  let busy = false;
  input.addEventListener('input', () => {
    if (!busy) {
      button.textContent = 'Save name';
      status.textContent = 'Name has unsaved changes.';
      status.dataset.error = 'false';
    }
  });
  rename.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!input.value.trim()) {
      status.textContent = 'Enter a campaign name.';
      status.dataset.error = 'true';
      input.focus();
      return;
    }
    busy = true;
    button.disabled = true;
    button.textContent = 'Saving…';
    status.textContent = 'Saving campaign name…';
    status.dataset.error = 'false';
    const title = input.value.trim();
    try {
      const response = await fetch(rename.action, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          _csrf: (rename.elements.namedItem('_csrf') as HTMLInputElement).value,
        }),
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || 'Could not save the name. Please try again.',
        );
      document.querySelector<HTMLElement>(
        '[data-campaign-title]',
      )!.textContent = result.title;
      document.title = `${result.title} · CometRow`;
      const changedAgain = input.value.trim() !== title;
      status.textContent = changedAgain
        ? 'Previous name saved. Your latest edit is not saved yet.'
        : 'Saved. Campaign name updated.';
      button.textContent = changedAgain ? 'Save name' : 'Saved';
    } catch (error) {
      status.textContent =
        error instanceof Error &&
        error.name !== 'TimeoutError' &&
        error.name !== 'TypeError'
          ? error.message
          : 'We could not confirm the save. Your name is still here. Check your connection and try again.';
      status.dataset.error = 'true';
      button.textContent = 'Try saving again';
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
}
const search = document.querySelector<HTMLInputElement>('#campaign-search');
const filter = document.querySelector<HTMLSelectElement>('#campaign-filter');
function filterCampaigns() {
  const query = search?.value.toLowerCase().trim() || '';
  const state = filter?.value || 'all';
  let count = 0;
  document
    .querySelectorAll<HTMLElement>('[data-campaign-row]')
    .forEach((row) => {
      row.hidden =
        !row.dataset.name!.includes(query) ||
        (state !== 'all' && row.dataset.status !== state);
      if (!row.hidden) count++;
    });
  const summary = document.querySelector<HTMLElement>('#filter-status');
  if (summary)
    summary.textContent = `${count} campaign${count === 1 ? '' : 's'} shown`;
  const empty = document.querySelector<HTMLElement>('#filter-empty');
  if (empty) empty.hidden = count !== 0;
}
search?.addEventListener('input', filterCampaigns);
filter?.addEventListener('change', filterCampaigns);
