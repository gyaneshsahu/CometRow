import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { AppError } from '../shared/errors.js';
import type { EmailService } from '../shared/providers.js';
import { digest, hashPassword, token, verifyPassword } from './password.js';

export const emailSchema = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export const passwordSchema = z
  .string()
  .min(15, 'Use at least 15 characters.')
  .max(128, 'Use at most 128 characters.');
export const nameSchema = z.string().trim().min(1).max(120);
export type User = {
  id: string;
  email: string;
  display_name: string;
  email_verified_at: Date | null;
};

export class IdentityService {
  constructor(
    private pool: Pool,
    private mail: EmailService,
    private origin: string,
  ) {}

  async throttle(email: string, purpose: string) {
    const result = await this.pool.query(
      `INSERT INTO auth_throttles (key_hash, attempts, expires_at) VALUES ($1, 1, now() + interval '15 minutes')
      ON CONFLICT (key_hash) DO UPDATE SET attempts = CASE WHEN auth_throttles.expires_at < now() THEN 1 ELSE auth_throttles.attempts + 1 END,
      expires_at = CASE WHEN auth_throttles.expires_at < now() THEN now() + interval '15 minutes' ELSE auth_throttles.expires_at END RETURNING attempts`,
      [digest(`${purpose}:${email}`)],
    );
    if (result.rows[0].attempts > 10)
      throw new AppError(
        429,
        'Too many attempts. Please try again in 15 minutes.',
      );
  }

  private async accountToken(
    client: PoolClient,
    userId: string,
    purpose: 'verify' | 'reset',
  ) {
    const value = token();
    await client.query(
      `INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at) VALUES ($1, $2, $3, now() + $4::interval)
      ON CONFLICT (user_id, purpose) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at`,
      [
        digest(value),
        userId,
        purpose,
        purpose === 'verify' ? '24 hours' : '30 minutes',
      ],
    );
    return value;
  }

  private async sendLink(
    email: string,
    value: string,
    purpose: 'verify' | 'reset',
  ) {
    await this.mail.send({
      to: email,
      subject:
        purpose === 'verify'
          ? 'Verify your CometRow email'
          : 'Reset your CometRow password',
      text: `${purpose === 'verify' ? 'Confirm your email address' : 'Choose a new password'}:\n${this.origin}/${purpose}?token=${value}\n\nThis link expires in ${purpose === 'verify' ? '24 hours' : '30 minutes'} and can be used once. If you did not request this, ignore this message.`,
    });
  }

  async register(input: unknown) {
    const data = z
      .object({
        email: emailSchema,
        password: passwordSchema,
        name: nameSchema,
      })
      .parse(input);
    await this.throttle(data.email, 'register');
    const passwordHash = await hashPassword(data.password);
    const created = await transaction(this.pool, async (client) => {
      const id = randomUUID();
      const inserted = await client.query(
        'INSERT INTO users (id, email, display_name, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id',
        [id, data.email, data.name, passwordHash],
      );
      if (!inserted.rowCount) return null;
      const workspace = randomUUID();
      await client.query(
        "INSERT INTO workspaces (id, name, kind, owner_id) VALUES ($1, $2, 'personal', $3)",
        [workspace, `${data.name.slice(0, 95)}’s workspace`, id],
      );
      await client.query(
        "INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
        [workspace, id],
      );
      await client.query(
        "INSERT INTO audit_events (id, workspace_id, actor_id, action, target_id) VALUES ($1, $2, $3, 'account.registered', $3)",
        [randomUUID(), workspace, id],
      );
      return this.accountToken(client, id, 'verify');
    });
    if (created) await this.sendLink(data.email, created, 'verify');
  }

  async login(input: unknown) {
    const data = z
      .object({ email: emailSchema, password: z.string().min(1).max(128) })
      .parse(input);
    await this.throttle(data.email, 'login');
    const result = await this.pool.query<User & { password_hash: string }>(
      'SELECT * FROM users WHERE email = $1',
      [data.email],
    );
    const user = result.rows[0];
    if (!(await verifyPassword(data.password, user?.password_hash)) || !user)
      throw new AppError(401, 'Email or password is incorrect.');
    return transaction(this.pool, async (client) => {
      const locked = await client.query(
        'SELECT password_hash FROM users WHERE id = $1 FOR UPDATE',
        [user.id],
      );
      if (locked.rows[0].password_hash !== user.password_hash)
        throw new AppError(401, 'Please sign in again.');
      const value = token();
      await client.query(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')",
        [digest(value), user.id],
      );
      return value;
    });
  }

  async user(session?: string): Promise<User | undefined> {
    if (!session || !/^[a-f0-9]{64}$/.test(session)) return;
    const result = await this.pool.query<User>(
      'SELECT u.id, u.email, u.display_name, u.email_verified_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()',
      [digest(session)],
    );
    return result.rows[0];
  }
  async logout(session?: string) {
    if (session)
      await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [
        digest(session),
      ]);
  }

  async resend(user: User) {
    await this.throttle(user.email, 'verify');
    const value = await transaction(this.pool, async (client) => {
      const current = await client.query(
        'SELECT email_verified_at FROM users WHERE id = $1 FOR UPDATE',
        [user.id],
      );
      if (current.rows[0].email_verified_at) return null;
      return this.accountToken(client, user.id, 'verify');
    });
    if (value) await this.sendLink(user.email, value, 'verify');
  }

  async forgot(input: unknown) {
    const email = emailSchema.parse(input);
    await this.throttle(email, 'reset');
    const value = await transaction(this.pool, async (client) => {
      const result = await client.query<User>(
        'SELECT * FROM users WHERE email = $1 AND password_hash IS NOT NULL FOR UPDATE',
        [email],
      );
      if (!result.rows[0]) return null;
      return this.accountToken(client, result.rows[0].id, 'reset');
    });
    if (value) await this.sendLink(email, value, 'reset');
  }

  async consume(raw: unknown, purpose: 'verify' | 'reset', password?: unknown) {
    const value = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(raw);
    const passwordHash =
      purpose === 'reset'
        ? await hashPassword(passwordSchema.parse(password))
        : null;
    await transaction(this.pool, async (client) => {
      const found = await client.query<{ user_id: string }>(
        'SELECT user_id FROM account_tokens WHERE token_hash = $1 AND purpose = $2',
        [digest(value), purpose],
      );
      if (!found.rows[0])
        throw new AppError(
          400,
          'This link is invalid or has expired. Request a new one.',
        );
      const userId = found.rows[0].user_id;
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [
        userId,
      ]);
      const consumed = await client.query(
        'DELETE FROM account_tokens WHERE token_hash = $1 AND purpose = $2 AND expires_at > now() RETURNING user_id',
        [digest(value), purpose],
      );
      if (!consumed.rowCount)
        throw new AppError(
          400,
          'This link is invalid or has expired. Request a new one.',
        );
      if (purpose === 'verify')
        await client.query(
          'UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1',
          [userId],
        );
      else {
        await client.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [passwordHash, userId],
        );
        await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      }
      await client.query(
        `INSERT INTO audit_events (id, workspace_id, actor_id, action, target_id)
        SELECT $1, id, $2, $3, $2 FROM workspaces WHERE owner_id = $2 AND kind = 'personal'`,
        [
          randomUUID(),
          userId,
          purpose === 'verify' ? 'account.verified' : 'account.password_reset',
        ],
      );
    });
  }
}
