import { env } from 'cloudflare:workers';
import { getRawDb } from '@/db';
import {
  digestToken,
  hashPassword,
  needsPasswordUpgrade,
  randomCode,
  randomToken,
  sessionStorageKey,
  verifyPassword,
} from '@/lib/security-crypto';

export const SESSION_COOKIE = 'sync_mobile_session';
export const CHALLENGE_COOKIE = 'sync_mobile_challenge';
const SESSION_TTL = 8 * 60 * 60 * 1000;
const IDLE_TTL = 30 * 60 * 1000;
const CODE_TTL = 10 * 60 * 1000;
const COOLDOWN = 60 * 1000;
const MAX_ATTEMPTS = 5;
export type AuthAdmin = { id: number; email: string; role: string };
type StoredAdmin = AuthAdmin & { password_hash: string };
type Challenge = {
  id: string;
  admin_id: number;
  code_hash: string;
  attempts: number;
  resends: number;
  expires_at: number;
  last_sent_at: number;
  consumed_at: number | null;
};
export type LoginChallenge = {
  challengeId: string;
  email: string;
  maskedEmail: string;
  code: string;
  cookie: string;
  expiresInSeconds: number;
};
export type VerifyCodeResult =
  | { status: 'ok'; session: { admin: AuthAdmin; cookie: string } }
  | { status: 'invalid' | 'expired' | 'locked' };
export class LoginCooldownError extends Error {
  retryAfterSeconds: number;
  constructor(seconds: number) {
    super('AUTH_RATE_LIMIT');
    this.retryAfterSeconds = Math.max(1, seconds);
  }
}
export function cookieValue(request: Request, name: string) {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
function cookie(request: Request, name: string, value: string, ttl: number) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(ttl / 1000)}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export const clearSessionCookie = (request: Request) =>
  cookie(request, SESSION_COOKIE, '', 0);
export const clearChallengeCookie = (request: Request) =>
  cookie(request, CHALLENGE_COOKIE, '', 0);

export async function getSessionAdmin(
  request: Request,
): Promise<AuthAdmin | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const now = Date.now();
  // Atualização condicionada impede reativar uma sessão ociosa ou pré-MFA.
  const session = await getRawDb()
    .prepare(`UPDATE auth_sessions SET last_seen_at = ?
    WHERE id = ? AND mfa_verified = 1 AND expires_at > ? AND last_seen_at > ?
    AND admin_id IN (SELECT id FROM admins WHERE role IN ('owner', 'admin')) RETURNING admin_id`)
    .bind(now, await sessionStorageKey(token), now, now - IDLE_TTL)
    .first<{ admin_id: number }>();
  if (!session) return null;
  return getRawDb()
    .prepare('SELECT id, email, role FROM admins WHERE id = ?')
    .bind(session.admin_id)
    .first<AuthAdmin>();
}
export async function rateLimit(
  key: string,
  maximum: number,
  windowMs: number,
) {
  const now = Date.now();
  const db = getRawDb();
  const result = await db.batch([
    db.prepare('DELETE FROM auth_rate_limits WHERE reset_at <= ?').bind(now),
    db
      .prepare(`INSERT INTO auth_rate_limits (key, hits, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET hits = MIN(auth_rate_limits.hits + 1, ?)
      RETURNING hits, reset_at`)
      .bind(key, now + windowMs, maximum + 1),
  ]);
  const row = result[1].results[0] as { hits: number; reset_at: number };
  if (row.hits > maximum)
    throw new LoginCooldownError(Math.ceil((row.reset_at - now) / 1000));
}
async function findAdmin(email: string, password: string) {
  const db = getRawDb();
  const lookup = () =>
    db
      .prepare(
        'SELECT id, email, role, password_hash FROM admins WHERE email = ?',
      )
      .bind(email)
      .first<StoredAdmin>();
  let admin = await lookup();
  const initialEmail = env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const initialPassword = env.INITIAL_ADMIN_PASSWORD;
  if (
    !admin &&
    initialEmail === email &&
    initialPassword &&
    password === initialPassword
  ) {
    // As variáveis iniciais não recriam uma conta em banco já configurado.
    await db
      .prepare(`INSERT INTO admins (email, password_hash, role, created_at)
      SELECT ?, ?, 'owner', ? WHERE NOT EXISTS (SELECT 1 FROM admins) ON CONFLICT(email) DO NOTHING`)
      .bind(email, await hashPassword(password), Date.now())
      .run();
    admin = await lookup();
  }
  if (!admin) {
    await hashPassword(password);
    return null;
  }
  if (
    !(await verifyPassword(password, admin.password_hash)) ||
    !['owner', 'admin'].includes(admin.role)
  )
    return null;
  if (needsPasswordUpgrade(admin.password_hash)) {
    await db
      .prepare(
        'UPDATE admins SET password_hash = ? WHERE id = ? AND password_hash = ?',
      )
      .bind(await hashPassword(password), admin.id, admin.password_hash)
      .run();
  }
  return { id: admin.id, email: admin.email, role: admin.role };
}
function maskedEmail(email: string) {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}••••@${domain}`;
}
export async function createLoginChallenge(
  request: Request,
  email: string,
  password: string,
): Promise<LoginChallenge | null> {
  const normalized = email.trim().toLowerCase();
  // Limite global limita contas inventadas; não confiar em IP fornecido em headers.
  await rateLimit('login:global', 60, 60_000);
  await rateLimit(`login:${await digestToken(normalized)}`, 5, 15 * 60_000);
  const admin = await findAdmin(normalized, password);
  if (!admin) return null;
  const token = randomToken();
  const code = randomCode();
  const id = randomToken();
  const now = Date.now();
  const row = await getRawDb()
    .prepare(`INSERT INTO auth_challenges
    (id, admin_id, browser_hash, code_hash, attempts, resends, expires_at, last_sent_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?)
    ON CONFLICT(admin_id) DO UPDATE SET id = excluded.id, browser_hash = excluded.browser_hash,
    code_hash = excluded.code_hash, attempts = 0, resends = 0, expires_at = excluded.expires_at,
    last_sent_at = excluded.last_sent_at, consumed_at = NULL, session_hash = NULL
    WHERE auth_challenges.expires_at <= ? OR auth_challenges.consumed_at IS NOT NULL
    RETURNING id`)
    .bind(
      id,
      admin.id,
      await digestToken(token),
      await hashPassword(code),
      now + CODE_TTL,
      now,
      now,
    )
    .first();
  // Voltar à senha durante um desafio ativo não zera as tentativas.
  if (!row) throw new LoginCooldownError(600);
  return {
    challengeId: id,
    email: admin.email,
    maskedEmail: maskedEmail(admin.email),
    code,
    cookie: cookie(request, CHALLENGE_COOKIE, token, CODE_TTL),
    expiresInSeconds: 600,
  };
}
export async function resendLoginChallenge(
  request: Request,
  id: string,
): Promise<LoginChallenge | null> {
  const browser = cookieValue(request, CHALLENGE_COOKIE);
  if (!browser) return null;
  const browserHash = await digestToken(browser);
  const db = getRawDb();
  const old = await db
    .prepare('SELECT * FROM auth_challenges WHERE id = ? AND browser_hash = ?')
    .bind(id, browserHash)
    .first<Challenge>();
  const now = Date.now();
  if (
    !old ||
    old.consumed_at ||
    old.expires_at <= now ||
    old.attempts >= MAX_ATTEMPTS ||
    old.resends >= 3
  )
    return null;
  if (old.last_sent_at + COOLDOWN > now)
    throw new LoginCooldownError(
      Math.ceil((old.last_sent_at + COOLDOWN - now) / 1000),
    );
  const code = randomCode();
  const nextId = randomToken();
  const updated = await db
    .prepare(`UPDATE auth_challenges SET id = ?, code_hash = ?, last_sent_at = ?, resends = resends + 1
    WHERE id = ? AND browser_hash = ? AND consumed_at IS NULL AND expires_at > ?
    AND attempts < ? AND resends < 3 AND last_sent_at <= ? RETURNING admin_id`)
    .bind(
      nextId,
      await hashPassword(code),
      now,
      id,
      browserHash,
      Date.now(),
      MAX_ATTEMPTS,
      now - COOLDOWN,
    )
    .first<{ admin_id: number }>();
  if (!updated) return null;
  const admin = await db
    .prepare('SELECT email FROM admins WHERE id = ?')
    .bind(updated.admin_id)
    .first<{ email: string }>();
  if (!admin) return null;
  const remaining = old.expires_at - Date.now();
  return {
    challengeId: nextId,
    email: admin.email,
    maskedEmail: maskedEmail(admin.email),
    code,
    cookie: cookie(request, CHALLENGE_COOKIE, browser, remaining),
    expiresInSeconds: Math.max(0, Math.floor(remaining / 1000)),
  };
}
export async function discardLoginChallenge(id: string) {
  // Preserva cooldown mesmo se o provedor de e-mail falhar.
  await getRawDb()
    .prepare('UPDATE auth_challenges SET attempts = ? WHERE id = ?')
    .bind(MAX_ATTEMPTS, id)
    .run();
}
export async function verifyLoginCode(
  request: Request,
  id: string,
  code: string,
): Promise<VerifyCodeResult> {
  const browser = cookieValue(request, CHALLENGE_COOKIE);
  if (!browser) return { status: 'expired' };
  const db = getRawDb();
  const browserHash = await digestToken(browser);
  // Reserva atômica antes do hash: chamadas paralelas compartilham cinco tentativas.
  const challenge = await db
    .prepare(`UPDATE auth_challenges SET attempts = attempts + 1
    WHERE id = ? AND browser_hash = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < ? RETURNING *`)
    .bind(id, browserHash, Date.now(), MAX_ATTEMPTS)
    .first<Challenge>();
  if (!challenge) return { status: 'expired' };
  if (
    !/^\d{6}$/.test(code) ||
    !(await verifyPassword(code, challenge.code_hash))
  )
    return {
      status: challenge.attempts >= MAX_ATTEMPTS ? 'locked' : 'invalid',
    };
  const admin = await db
    .prepare(
      "SELECT id, email, role FROM admins WHERE id = ? AND role IN ('owner', 'admin')",
    )
    .bind(challenge.admin_id)
    .first<AuthAdmin>();
  if (!admin) return { status: 'expired' };
  const token = randomToken();
  const sessionHash = await sessionStorageKey(token);
  const now = Date.now();
  // session_hash permite criar sessão apenas para a requisição que consumiu o código.
  const results = await db.batch([
    db
      .prepare(`UPDATE auth_challenges SET consumed_at = ?, session_hash = ? WHERE id = ? AND browser_hash = ?
      AND consumed_at IS NULL AND expires_at > ? AND code_hash = ?`)
      .bind(now, sessionHash, id, browserHash, now, challenge.code_hash),
    db
      .prepare(`INSERT INTO auth_sessions (id, admin_id, expires_at, created_at, last_seen_at, mfa_verified)
      SELECT ?, admin_id, ?, ?, ?, 1 FROM auth_challenges WHERE id = ? AND session_hash = ? AND consumed_at = ?`)
      .bind(sessionHash, now + SESSION_TTL, now, now, id, sessionHash, now),
    db
      .prepare(
        'DELETE FROM auth_sessions WHERE expires_at <= ? OR mfa_verified = 0',
      )
      .bind(now),
    db.prepare('DELETE FROM login_challenges WHERE expires_at <= ?').bind(now),
  ]);
  if (!results[1].meta.changes) return { status: 'expired' };
  return {
    status: 'ok',
    session: {
      admin,
      cookie: cookie(request, SESSION_COOKIE, token, SESSION_TTL),
    },
  };
}
export async function revokeSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token)
    await getRawDb()
      .prepare('DELETE FROM auth_sessions WHERE id = ?')
      .bind(await sessionStorageKey(token))
      .run();
}
export async function changePassword(
  admin: AuthAdmin,
  current: string,
  next: string,
) {
  await rateLimit(`password:${admin.id}`, 5, 15 * 60_000);
  const db = getRawDb();
  const stored = await db
    .prepare('SELECT password_hash FROM admins WHERE id = ?')
    .bind(admin.id)
    .first<{ password_hash: string }>();
  if (!stored || !(await verifyPassword(current, stored.password_hash)))
    return false;
  const result = await db.batch([
    db
      .prepare(
        'UPDATE admins SET password_hash = ? WHERE id = ? AND password_hash = ?',
      )
      .bind(await hashPassword(next), admin.id, stored.password_hash),
    db.prepare('DELETE FROM auth_sessions WHERE admin_id = ?').bind(admin.id),
    db.prepare('DELETE FROM auth_challenges WHERE admin_id = ?').bind(admin.id),
  ]);
  return Boolean(result[0].meta.changes);
}
