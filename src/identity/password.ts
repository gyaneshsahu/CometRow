import { scrypt, randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export const token = () => randomBytes(32).toString('hex');
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 65536, r: 8, p: 2, maxmem: 128 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:65536:8:2:${salt}:${(await derive(password, salt)).toString('hex')}`;
}
// An absent account performs the same expensive derivation as an existing one.
export async function verifyPassword(
  password: string,
  encoded?: string | null,
) {
  const parts = encoded?.split(':');
  const salt = parts?.[4] ?? '00000000000000000000000000000000';
  const actual = await derive(password, salt);
  const expected = Buffer.from(parts?.[5] ?? '00'.repeat(64), 'hex');
  return (
    !!encoded &&
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
}
