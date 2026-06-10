import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

/**
 * Password hashing — Node-native scrypt (OWASP-sprejemljiv KDF), izbran
 * namesto argon2id IZKLJUČNO zato, ker ne zahteva native build odvisnosti
 * (node-gyp na Windows dev strojih, prazen sandbox). Parametri so zapisani V
 * hash niz, zato je kasnejša migracija na argon2id ali močnejši scrypt čista:
 * nova gesla dobijo nov format, stara se preverjajo po svojem, re-hash ob
 * uspešni prijavi. Format: scrypt$N$r$p$saltB64$hashB64
 */

const N = 32768; // 2^15
const R = 8;
const P = 1;
const KEYLEN = 32;

function scryptAsync(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N: n, r, p, maxmem: 128 * 1024 * 1024 }, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(plain, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const n = parseInt(parts[1], 10);
  const r = parseInt(parts[2], 10);
  const p = parseInt(parts[3], 10);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  const actual = await scryptAsync(plain, salt, n, r, p);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
