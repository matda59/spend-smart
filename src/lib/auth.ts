import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const SESSION_COOKIE = "household_session";

const MAX_ATTEMPTS = 8;
const LOCK_MS = 60_000;

const attempts = { failures: 0, lockedUntil: 0 };

export function envPassword() {
  const value = process.env.BUDGET_PASSWORD?.trim() ?? "";
  return value.length > 0 ? value : null;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

type SettingsRow = { password_hash: string | null; session_token: string | null };

function settings() {
  return getDb().prepare("SELECT password_hash, session_token FROM settings WHERE id = 1").get() as SettingsRow;
}

export function hasStoredPassword() {
  return Boolean(settings().password_hash);
}

export function loginIsConfigured() {
  return Boolean(envPassword() || hasStoredPassword());
}

export async function isUnlocked() {
  const secret = envPassword();
  const row = settings();
  if (!secret && !row.password_hash) return false;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return Boolean(token && row.session_token && sameText(token, row.session_token));
}

export function checkPassphrase(password: string) {
  const now = Date.now();
  if (attempts.lockedUntil > now) {
    return "Too many tries. Wait a minute, then try again.";
  }
  const secret = envPassword();
  const row = settings();
  const ok = secret
    ? sameText(password, secret)
    : Boolean(row.password_hash && verifyPassword(password, row.password_hash));
  if (!ok) {
    attempts.failures += 1;
    if (attempts.failures >= MAX_ATTEMPTS) {
      attempts.lockedUntil = Date.now() + LOCK_MS;
      attempts.failures = 0;
    }
    return "That password does not match.";
  }
  attempts.failures = 0;
  attempts.lockedUntil = 0;
  return null;
}

export function startSession() {
  const token = randomBytes(32).toString("hex");
  getDb().prepare("UPDATE settings SET session_token = ? WHERE id = 1").run(token);
  return token;
}

export function clearSession() {
  getDb().prepare("UPDATE settings SET session_token = NULL WHERE id = 1").run();
}

export function savePassword(password: string) {
  const passwordHash = hashPassword(password);
  getDb().prepare("UPDATE settings SET password_hash = ? WHERE id = 1").run(passwordHash);
}

export function clearPassword() {
  getDb()
    .prepare("UPDATE settings SET password_hash = NULL, session_token = NULL WHERE id = 1")
    .run();
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
