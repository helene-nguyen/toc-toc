import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from './scryptPasswordHasher.js';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('recognises the right password only', async () => {
    const stored = await hasher.hash('correct-horse-battery');

    expect(stored).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(await hasher.compare('correct-horse-battery', stored)).toBe(true);
    expect(await hasher.compare('wrong-horse-battery', stored)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hasher.hash('same')).not.toBe(await hasher.hash('same'));
  });

  it('refuses something that is not one of its hashes', async () => {
    expect(await hasher.compare('x', 'bcrypt$whatever')).toBe(false);
  });
});
