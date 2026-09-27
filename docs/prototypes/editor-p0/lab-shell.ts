// Editor chrome only. Preferences never enter the campaign document or history.
export type ShellPreferences = {
  width: number;
  collapsed: boolean;
  tab: 'layout' | 'structure' | 'assets';
  accordions: Record<string, boolean>;
};
export function shellPreferences(value: unknown): ShellPreferences {
  const v = (
    value && typeof value === 'object' ? value : {}
  ) as Partial<ShellPreferences>;
  return {
    width:
      typeof v.width === 'number' && Number.isFinite(v.width)
        ? Math.max(220, Math.min(380, v.width))
        : 270,
    collapsed: v.collapsed === true,
    tab: v.tab === 'structure' || v.tab === 'assets' ? v.tab : 'layout',
    accordions: Object.fromEntries(
      Object.entries(v.accordions ?? {}).filter(
        ([, state]) => typeof state === 'boolean',
      ),
    ),
  };
}

export const shellMarkup = `<header class="lab-header">
  <div class="tools lab-identity"><a class="brand" href="/editor-lab" title="Back to campaign"><span aria-hidden="true">↗</span>CometRow</a><div class="lab-document-name">Editor Lab<div id="lab-status" role="status">Loading draft…</div></div><button id="lab-rename" aria-label="Rename campaign" title="Rename campaign" hidden>✎</button></div>
  <div class="tools lab-actions"><button id="lab-undo" aria-label="Undo" title="Undo (Ctrl / Cmd + Z)"><span class="lab-sr-only">Undo</span><span aria-hidden="true">↶</span></button><button id="lab-redo" aria-label="Redo" title="Redo (Ctrl / Cmd + Shift + Z)"><span class="lab-sr-only">Redo</span><span aria-hidden="true">↷</span></button><button id="lab-preview" class="primary" title="Preview the page">Preview</button><details class="lab-more"><summary aria-label="More actions" title="More actions">•••</summary><div class="lab-more-popover"><button id="lab-export">Export</button><button id="lab-import">Import</button></div></details></div>
  </header><div id="lab-message" role="status"></div>
  <div class="lab-workspace"><aside class="lab-left" aria-label="Editor panels"><nav class="lab-panel-tabs" role="tablist" aria-label="Editor panels"><button id="lab-tab-layout" role="tab" aria-controls="lab-panel-layout" aria-selected="true" title="Responsive layouts">Layout</button><button id="lab-tab-structure" role="tab" aria-controls="lab-panel-structure" aria-selected="false" tabindex="-1" title="Elements and layer order">Structure</button><button id="lab-tab-assets" role="tab" aria-controls="lab-panel-assets" aria-selected="false" tabindex="-1" title="Media used in this document">Assets</button></nav><div id="lab-panel-layout" role="tabpanel" aria-labelledby="lab-tab-layout"><aside class="lab-rail" aria-label="Live breakpoint previews"></aside></div><div id="lab-panel-structure" role="tabpanel" aria-labelledby="lab-tab-structure" hidden><div class="lab-structure"></div></div><div id="lab-panel-assets" role="tabpanel" aria-labelledby="lab-tab-assets" hidden><div class="lab-assets"></div></div><button id="lab-collapse" aria-label="Collapse left panel" title="Collapse left panel" aria-expanded="true">‹</button><div id="lab-panel-resize" role="separator" tabindex="0" aria-label="Resize left panel" aria-orientation="vertical" aria-valuemin="220" aria-valuemax="380" aria-valuenow="270" title="Drag to resize; use Left and Right arrow keys"></div></aside>
  <main class="lab-main"><div class="lab-insert-toolbar"><strong id="lab-device">Desktop</strong><button id="lab-add" class="primary" title="Click to add or drag a container onto the canvas">＋ Add Container</button></div><div class="lab-canvas-scroll"><div id="lab-space"><div class="lab-stage"></div></div></div><div class="lab-toolbar" aria-label="Canvas view"><label>Zoom <select id="lab-zoom"><option value="fit">Fit</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option></select></label><output id="lab-scale" aria-label="Current zoom"></output></div><span id="lab-origin" hidden></span><div id="lab-warning" hidden></div></main><aside class="lab-inspector" aria-label="Properties and Layers"></aside></div><dialog class="lab-picker" aria-labelledby="lab-picker-title"><h2 id="lab-picker-title">Choose container type</h2><div class="tools"></div><button id="lab-cancel">Cancel</button></dialog>`;

export function initializeShell(host: HTMLElement, resize: () => void) {
  const bootElement = document.querySelector('#composer-data');
  const boot = bootElement
    ? (JSON.parse(bootElement.textContent!) as {
        userId: string;
        base: string;
        title: string;
        csrf: string;
      })
    : undefined;
  const key = 'cometrow-editor-shell:' + (boot?.userId ?? 'local');
  let prefs = shellPreferences(null);
  try {
    prefs = shellPreferences(JSON.parse(localStorage.getItem(key) ?? 'null'));
  } catch {
    /* Chrome remains usable with storage unavailable. */
  }
  const persist = () => {
    try {
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch {
      /* Preferences are optional, campaign persistence is independent. */
    }
  };
  const q = <T extends HTMLElement>(selector: string) =>
    host.querySelector<T>(selector)!;
  const tabs = ['layout', 'structure', 'assets'] as const;
  function apply() {
    host.style.setProperty('--editor-left-width', prefs.width + 'px');
    host.classList.toggle('lab-left-collapsed', prefs.collapsed);
    q('#lab-collapse').setAttribute('aria-expanded', String(!prefs.collapsed));
    q('#lab-collapse').setAttribute(
      'aria-label',
      prefs.collapsed ? 'Expand left panel' : 'Collapse left panel',
    );
    q('#lab-collapse').title = prefs.collapsed
      ? 'Expand left panel'
      : 'Collapse left panel';
    q('#lab-collapse').textContent = prefs.collapsed ? '›' : '‹';
    q('#lab-panel-resize').setAttribute('aria-valuenow', String(prefs.width));
    for (const name of tabs) {
      const tab = q<HTMLButtonElement>('#lab-tab-' + name);
      tab.setAttribute('aria-selected', String(name === prefs.tab));
      tab.tabIndex = name === prefs.tab ? 0 : -1;
      q('#lab-panel-' + name).hidden = prefs.collapsed || name !== prefs.tab;
    }
  }
  for (const [index, name] of tabs.entries()) {
    const tab = q<HTMLButtonElement>('#lab-tab-' + name);
    tab.onclick = () => {
      prefs.tab = name;
      prefs.collapsed = false;
      apply();
      persist();
      resize();
    };
    tab.onkeydown = (e) => {
      const target =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? 2
            : e.key === 'ArrowRight'
              ? (index + 1) % 3
              : e.key === 'ArrowLeft'
                ? (index + 2) % 3
                : -1;
      if (target < 0) return;
      e.preventDefault();
      const next = q<HTMLButtonElement>('#lab-tab-' + tabs[target]);
      next.click();
      next.focus();
    };
  }
  q('#lab-collapse').onclick = () => {
    prefs.collapsed = !prefs.collapsed;
    apply();
    persist();
    resize();
  };
  const splitter = q('#lab-panel-resize');
  const width = (value: number) => {
    prefs.width = shellPreferences({ width: value }).width;
    apply();
    resize();
  };
  splitter.onkeydown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    width(
      e.key === 'Home'
        ? 220
        : e.key === 'End'
          ? 380
          : prefs.width + (e.key === 'ArrowRight' ? 10 : -10),
    );
    persist();
  };
  splitter.onpointerdown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    splitter.setPointerCapture(e.pointerId);
    const x = e.clientX,
      initial = prefs.width;
    splitter.onpointermove = (move) => width(initial + move.clientX - x);
    const finish = () => {
      splitter.onpointermove = null;
      splitter.onpointerup = null;
      splitter.onpointercancel = null;
      persist();
    };
    splitter.onpointerup = finish;
    splitter.onpointercancel = finish;
  };
  const more = q<HTMLDetailsElement>('.lab-more');
  more.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      more.open = false;
      more.querySelector('summary')!.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!more.contains(e.target as Node)) more.open = false;
  });
  more.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      more.open = false;
    }),
  );
  // Keep adapter-produced status/error messages intact; hide only the old help strip.
  const notice = q('#lab-message');
  const updateNotice = () => {
    notice.hidden =
      !notice.textContent ||
      /^(Isolated P0 review|Private campaign ·)/.test(notice.textContent);
  };
  new MutationObserver(updateNotice).observe(notice, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  updateNotice();
  const rawStatus = q('#lab-status');
  const visibleStatus = document.createElement('div');
  visibleStatus.id = 'lab-save-state';
  visibleStatus.setAttribute('role', 'status');
  rawStatus.hidden = true;
  rawStatus.removeAttribute('role');
  rawStatus.after(visibleStatus);
  const updateStatus = () => {
    const text = rawStatus.textContent ?? '';
    visibleStatus.textContent = /^(All changes saved|Saved locally)/.test(text)
      ? 'Saved'
      : text;
  };
  new MutationObserver(updateStatus).observe(rawStatus, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  updateStatus();
  if (boot) {
    const rename = q<HTMLButtonElement>('#lab-rename');
    rename.hidden = false;
    rename.onclick = () => {
      const dialog = document.createElement('dialog');
      dialog.className = 'lab-confirm';
      dialog.setAttribute('aria-label', 'Rename campaign');
      const form = document.createElement('form');
      const label = document.createElement('label');
      label.textContent = 'Campaign name';
      const input = document.createElement('input');
      input.value = boot.title;
      input.required = true;
      input.maxLength = 160;
      const issue = document.createElement('p');
      issue.setAttribute('role', 'alert');
      const save = document.createElement('button');
      save.textContent = 'Save name';
      save.className = 'primary';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.onclick = () => dialog.close();
      label.append(input);
      form.append(label, issue, cancel, save);
      dialog.append(form);
      dialog.onclose = () => dialog.remove();
      form.onsubmit = async (e) => {
        e.preventDefault();
        save.disabled = true;
        try {
          const response = await fetch(boot.base + '/rename', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({ title: input.value, _csrf: boot.csrf }),
          });
          const result = await response.json();
          if (!response.ok || !result.saved)
            throw Error(
              result.error || 'The name could not be saved. Try again.',
            );
          boot.title = result.title;
          q('.lab-document-name').firstChild!.textContent = boot.title;
          q('.brand').setAttribute('aria-label', 'Back to ' + boot.title);
          document.title = boot.title + ' · CometRow';
          dialog.close();
        } catch (e) {
          issue.textContent =
            e instanceof Error ? e.message : 'The name could not be saved.';
        } finally {
          save.disabled = false;
        }
      };
      document.body.append(dialog);
      dialog.showModal();
      input.select();
    };
  }
  apply();
  return {
    production: !!boot,
    accordion(details: HTMLDetailsElement, name: string, defaultOpen = false) {
      details.open = prefs.accordions[name] ?? defaultOpen;
      // Listen only after initial state has been applied, avoiding synthetic toggle saves.
      details.addEventListener('toggle', () => {
        if (!details.isConnected) return;
        prefs.accordions[name] = details.open;
        persist();
      });
    },
  };
}
