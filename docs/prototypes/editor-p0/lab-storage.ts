import { validate, type LabDocument, validateFile } from './lab-model.js';
const database =
  'cometrow-editor-lab-1' +
  (location.search.includes('test=1')
    ? '-test-' + new URLSearchParams(location.search).get('run')
    : '');
let connection: Promise<IDBDatabase> | undefined;
function db() {
  return (connection ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(database, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('documents');
      r.result.createObjectStore('assets');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
export async function read(
  store: 'documents' | 'assets',
  key: string,
): Promise<unknown> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function put(store: 'documents' | 'assets', key: string, value: unknown) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const t = d.transaction(store, 'readwrite');
    t.objectStore(store).put(value, key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
export async function save(d: LabDocument) {
  validate(d);
  const connection = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = connection.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    const previous = store.get('draft');
    previous.onsuccess = () => {
      const value: unknown = previous.result;
      if (value && typeof value === 'object' && !('primaryScreen' in value)) {
        store.put(value, 'legacy-before-primary-' + crypto.randomUUID());
      }
      store.put(d, 'draft');
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function upload(key: string, file: File) {
  validateFile(file);
  const bitmap = await createImageBitmap(file);
  bitmap.close();
  await put('assets', key, file);
}
export async function preserveCorrupt(value: unknown) {
  await put('documents', 'recovery-' + Date.now(), value);
}
