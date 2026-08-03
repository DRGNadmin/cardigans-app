import crypto from "node:crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN);
  const key = crypto.scryptSync(password, salt, KEY_LEN);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const key = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(key, expected);
}
