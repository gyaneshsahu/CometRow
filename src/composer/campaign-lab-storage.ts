import type { LabDocument } from '../../docs/prototypes/editor-p0/lab-model.js';
import { measureText } from '../../docs/prototypes/editor-p0/lab-render.js';
import { Autosave, type SaveResult } from './autosave.js';
import {
  documentSchema,
  type CampaignDocument,
  type DraftSnapshot,
} from './schema.js';
import { resolveVisual } from './visual/document.js';

type Boot = DraftSnapshot & {
  title: string;
  base: string;
  userId: string;
  csrf: string;
  readonly: boolean;
};
const boot = JSON.parse(
  document.querySelector('#composer-data')!.textContent!,
) as Boot;
const backupKey = `cometrow-draft:${boot.userId}:${boot.base}`;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let dialogOpen = false;
let leaving = false;
let commandPending = false;
let loadFailed = false;
const waiters: { resolve: () => void; reject: (e: Error) => void }[] = [];
const visual = (document: CampaignDocument) => {
  const block = document.blocks.find((b) => b.type === 'visual-section');
  if (!block || block.type !== 'visual-section')
    throw Error('Campaign has no visual section.');
  return block;
};
const saver = new Autosave(
  boot,
  async (request): Promise<SaveResult> => {
    const response = await fetch(`${boot.base}/draft`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ...request, _csrf: boot.csrf }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json();
    if (response.ok) return { kind: 'saved', snapshot: data };
    if (response.status === 409 && data.latest)
      return { kind: 'conflict', latest: data.latest };
    return {
      kind:
        response.status === 429 || response.status >= 500 ? 'retry' : 'blocked',
      message: String(
        data.error || 'Saving is unavailable. Export a copy before leaving.',
      ),
    };
  },
  changed,
  () => crypto.randomUUID(),
);

function status() {
  if (loadFailed) return;
  const el = document.querySelector('#lab-status');
  if (!el) return;
  const labels = {
    saved: commandPending
      ? 'Unsaved changes'
      : `All changes saved · revision ${saver.revision}`,
    dirty: 'Waiting to save…',
    saving: 'Saving…',
    invalid: 'Cannot save — export a copy',
    retry: 'Waiting to reconnect',
    conflict: 'Review conflicting changes',
    blocked: 'Saving paused — export a copy',
  };
  if (el.textContent !== labels[saver.state])
    el.textContent = labels[saver.state];
}
function changed() {
  try {
    if (saver.unsaved)
      sessionStorage.setItem(
        backupKey,
        JSON.stringify({ document: saver.document, revision: saver.revision }),
      );
    else sessionStorage.removeItem(backupKey);
  } catch {
    /* The server remains authoritative; beforeunload protects pending work. */
  }
  status();
  clearTimeout(retryTimer);
  if (saver.state === 'dirty') queueMicrotask(() => void saver.flush());
  if (saver.state === 'retry')
    retryTimer = setTimeout(() => void saver.flush(), 15000);
  if (saver.state === 'saved') waiters.splice(0).forEach((w) => w.resolve());
  if (saver.state === 'invalid' || saver.state === 'blocked') {
    waiters
      .splice(0)
      .forEach((w) =>
        w.reject(
          new Error(
            saver.message ||
              'This document cannot be saved. Uploads and external media are not supported yet. Export a copy to retain your work.',
          ),
        ),
      );
  }
  if (saver.state === 'conflict' && !dialogOpen) void resolveConflict();
}
function choose(
  title: string,
  description: string,
  choices: string[],
): Promise<number> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'lab-confirm';
    dialog.setAttribute('aria-label', title);
    const heading = document.createElement('h2');
    heading.textContent = title;
    const text = document.createElement('p');
    text.textContent = description;
    dialog.append(heading, text);
    choices.forEach((label, index) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.onclick = () => {
        dialog.close();
        dialog.remove();
        resolve(index);
      };
      dialog.append(button);
    });
    dialog.oncancel = (event) => event.preventDefault();
    document.body.append(dialog);
    dialog.showModal();
  });
}
async function resolveConflict() {
  dialogOpen = true;
  const choice = await choose(
    'This campaign changed in another tab',
    `Your changes are based on revision ${saver.revision}. Revision ${saver.latest!.revision} is now saved. Keeping yours replaces that version only if it has not changed again.`,
    ['Keep my version', 'Use saved version'],
  );
  dialogOpen = false;
  saver.resolve(choice === 0 ? 'local' : 'saved');
  if (choice === 1) {
    leaving = true;
    location.reload();
  } else await saver.flush();
}

export async function read(
  store: 'documents' | 'assets',
  key: string,
): Promise<unknown> {
  if (store === 'assets')
    throw Error('Device-local images are not stored in campaigns.');
  if (key !== 'draft') return undefined;
  if (boot.readonly) throw Error('This campaign is read-only.');
  const brand = document.querySelector<HTMLAnchorElement>('#lab .brand')!;
  brand.href = boot.base;
  brand.setAttribute('aria-label', 'Back to ' + boot.title);
  const label = document.querySelector('#lab-status')!.parentElement!;
  // Change only host identity and persistence text, retaining the accepted UI.
  if (label.firstChild?.nodeType === Node.TEXT_NODE)
    label.firstChild.textContent = boot.title;
  document.querySelector('#lab-message')!.textContent =
    'Private campaign · Alt disables snapping';
  const statusElement = document.querySelector('#lab-status')!;
  new MutationObserver(() => {
    if (statusElement.textContent === 'Unsaved changes') commandPending = true;
    status();
  }).observe(statusElement, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  let initial = saver.document;
  try {
    const raw = sessionStorage.getItem(backupKey);
    if (raw) {
      const backup = JSON.parse(raw) as DraftSnapshot;
      const parsed = documentSchema.safeParse(backup.document);
      if (
        parsed.success &&
        parsed.data.schemaVersion === 2 &&
        Number.isInteger(backup.revision) &&
        backup.revision > 0 &&
        JSON.stringify(parsed.data) !== JSON.stringify(boot.document)
      ) {
        const choice = await choose(
          'Recover unsaved campaign changes',
          'This tab has unsaved work for this campaign.',
          ['Recover my changes', 'Use saved campaign'],
        );
        if (choice === 0) {
          initial = parsed.data;
          saver.revision = backup.revision;
          saver.edit(initial);
        } else sessionStorage.removeItem(backupKey);
      } else sessionStorage.removeItem(backupKey);
    }
  } catch {
    /* A malformed browser backup must not replace the saved campaign. */
  }
  return structuredClone(visual(initial).data.document);
}
export async function save(document: LabDocument) {
  if (boot.readonly) throw Error('This campaign is read-only.');
  const copy = structuredClone(saver.document);
  visual(copy).data = resolveVisual(document, measureText);
  commandPending = false;
  const saved = new Promise<void>((resolve, reject) =>
    waiters.push({ resolve, reject }),
  );
  saver.edit(copy);
  void saver.flush();
  await saved;
}
export async function upload(_key: string, _file: File): Promise<void> {
  void _key;
  void _file;
  throw Error(
    'Campaign uploads are not available yet. Use the existing sample media.',
  );
}
export async function preserveCorrupt(_value: unknown): Promise<void> {
  void _value;
  loadFailed = true;
  // Prevent the Lab's empty fallback from replacing an unreadable campaign.
  throw Error(
    'The saved campaign could not load. Saving is disabled; return to the campaign overview.',
  );
}
window.addEventListener('online', () => void saver.flush());
window.addEventListener('beforeunload', (event) => {
  if (
    !leaving &&
    (saver.unsaved ||
      commandPending ||
      document.querySelector('#lab-status')?.textContent === 'Unsaved changes')
  ) {
    event.preventDefault();
    event.returnValue = '';
  }
});
