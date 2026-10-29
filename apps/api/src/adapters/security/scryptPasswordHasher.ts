//~ Driven adapter: PasswordHasher backed by Node's own scrypt — no native
// module to compile on the Raspberry Pi. Stored as
// "scrypt$<N>$<r>$<p>$<salt>$<hash>" (base64), so the cost can be raised
// later without breaking existing passwords.
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import type { PasswordHasher } from '../../core/user/ports.js';

const COST = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 64;
// N=2^15, r=8 needs 32 MB; the default 32 MB cap leaves no room
const MAX_MEMORY = 64 * 1024 * 1024;

const derive = (password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, KEY_LENGTH, { ...options, maxmem: MAX_MEMORY }, (error, key) =>
      error ? reject(error) : resolve(key)
    )
  );

export class ScryptPasswordHasher implements PasswordHasher {
  hash = async (plain: string): Promise<string> => {
    const salt = randomBytes(16);
    const key = await derive(plain, salt, COST);
    return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64'), key.toString('base64')].join('$');
  };

  compare = async (plain: string, stored: string): Promise<boolean> => {
    const [scheme, N, r, p, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !hash) return false;
    const expected = Buffer.from(hash, 'base64');
    const key = await derive(plain, Buffer.from(salt, 'base64'), { N: Number(N), r: Number(r), p: Number(p) });
    return key.length === expected.length && timingSafeEqual(key, expected);
  };
}
