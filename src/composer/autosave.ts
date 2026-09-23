import {
  documentSchema,
  type CampaignDocument,
  type DraftSnapshot,
} from './schema.js';

export type SaveRequest = {
  document: CampaignDocument;
  revision: number;
  mutationId: string;
};
export type SaveResult =
  | { kind: 'saved'; snapshot: DraftSnapshot }
  | { kind: 'conflict'; latest: DraftSnapshot }
  | { kind: 'retry'; message: string }
  | { kind: 'blocked'; message: string };
export type SaveState =
  'saved' | 'dirty' | 'saving' | 'invalid' | 'retry' | 'conflict' | 'blocked';
const same = (a: CampaignDocument, b: CampaignDocument) =>
  JSON.stringify(a) === JSON.stringify(b);

// One request at a time. A failed request retains its identifier and snapshot
// so a lost response never turns into a blind overwrite or duplicate revision.
export class Autosave {
  document: CampaignDocument;
  revision: number;
  state: SaveState = 'saved';
  message = '';
  latest?: DraftSnapshot;
  private acknowledged: CampaignDocument;
  private pending?: SaveRequest;
  private busy = false;
  constructor(
    initial: DraftSnapshot,
    private send: (request: SaveRequest) => Promise<SaveResult>,
    private changed: () => void,
    private makeId: () => string,
  ) {
    this.document = structuredClone(initial.document);
    this.acknowledged = structuredClone(initial.document);
    this.revision = initial.revision;
  }
  get unsaved() {
    return !!this.pending || !same(this.document, this.acknowledged);
  }
  edit(document: CampaignDocument) {
    // Canonical schema field order must match the server acknowledgement.
    // A freshly added block can otherwise appear dirty forever after saving.
    const parsed = documentSchema.safeParse(document);
    this.document = structuredClone(parsed.success ? parsed.data : document);
    if (!['conflict', 'blocked'].includes(this.state) && !this.busy)
      this.state = parsed.success
        ? this.unsaved
          ? 'dirty'
          : 'saved'
        : 'invalid';
    this.changed();
  }
  async flush() {
    if (this.busy || ['conflict', 'blocked'].includes(this.state)) return;
    if (!this.pending) {
      const parsed = documentSchema.safeParse(this.document);
      if (!parsed.success) {
        this.state = 'invalid';
        this.changed();
        return;
      }
      if (!this.unsaved) {
        this.state = 'saved';
        this.changed();
        return;
      }
      this.pending = {
        document: structuredClone(parsed.data),
        revision: this.revision,
        mutationId: this.makeId(),
      };
    }
    this.busy = true;
    this.state = 'saving';
    this.changed();
    const request = this.pending;
    let result: SaveResult;
    try {
      result = await this.send(request);
    } catch {
      result = {
        kind: 'retry',
        message: 'Connection interrupted. Your changes are kept in this tab.',
      };
    }
    this.busy = false;
    if (result.kind === 'saved') {
      this.revision = result.snapshot.revision;
      this.acknowledged = structuredClone(result.snapshot.document);
      if (same(this.document, request.document))
        this.document = structuredClone(result.snapshot.document);
      this.pending = undefined;
      this.state = this.unsaved ? 'dirty' : 'saved';
      this.message = '';
    } else if (result.kind === 'conflict') {
      this.latest = result.latest;
      this.state = 'conflict';
      this.message =
        'Another tab saved changes. Review both versions before continuing.';
    } else {
      this.state = result.kind;
      this.message = result.message;
    }
    this.changed();
  }
  resolve(choice: 'local' | 'saved') {
    if (!this.latest || this.busy) return;
    this.revision = this.latest.revision;
    this.acknowledged = structuredClone(this.latest.document);
    if (choice === 'saved')
      this.document = structuredClone(this.latest.document);
    this.pending = undefined;
    this.latest = undefined;
    this.state = this.unsaved ? 'dirty' : 'saved';
    this.message = '';
    this.changed();
  }
}
