import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { EmailService } from '../shared/providers.js';

export class LocalEmail implements EmailService {
  constructor(private directory = resolve('.local/mail')) {}
  async send(message: { to: string; subject: string; text: string }) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(this.directory, `${Date.now()}-${randomUUID()}.json`),
      JSON.stringify(
        { ...message, createdAt: new Date().toISOString() },
        null,
        2,
      ),
      { flag: 'wx', mode: 0o600 },
    );
  }
}
