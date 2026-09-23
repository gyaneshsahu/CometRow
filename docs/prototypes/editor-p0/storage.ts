import type { Project } from './model.js';
export type Saved = { revision: number; project: Project; updated: string };
export type SaveResult =
  { ok: true; saved: Saved } | { ok: false; saved: Saved };
const database = 'cometrow-editor-p0-review-v2';
let connection: Promise<IDBDatabase> | undefined;
function db() {
  return (connection ||= new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
export async function read(): Promise<Saved | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('drafts', 'readonly');
    const r = t.objectStore('drafts').get('review');
    r.onsuccess = () => resolve(r.result as Saved | undefined);
    r.onerror = () => reject(r.error);
  });
}
// IndexedDB serializes readwrite transactions across tabs. Revision comparison
// and write occur in the SAME transaction: there is no localStorage check/write race.
export async function save(
  project: Project,
  expected: number,
): Promise<SaveResult> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('drafts', 'readwrite');
    const store = t.objectStore('drafts');
    const r = store.get('review');
    let result: SaveResult;
    r.onsuccess = () => {
      const current = r.result as Saved | undefined;
      if ((current?.revision || 0) !== expected) {
        result = { ok: false, saved: current! };
        return;
      }
      const saved = {
        revision: expected + 1,
        project: structuredClone(project),
        updated: new Date().toISOString(),
      };
      store.put(saved, 'review');
      result = { ok: true, saved };
    };
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () =>
      reject(t.error || Error('Save transaction was interrupted.'));
  });
}
