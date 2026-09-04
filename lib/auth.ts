import { env } from 'cloudflare:workers';
import { getRawDb } from '@/db';

export const SESSION_COOKIE = 'sync_mobile_session';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const LOGIN_CODE_TTL_MS = 1000 * 60 * 10;
const LOGIN_CODE_COOLDOWN_MS = 1000 * 60;
const MAX_CODE_ATTEMPTS = 5;
const PBKDF2_ITERATIONS = 210_000;

export type AuthAdmin = {
  id: number;
  email: string;
  role: string;
};

export type LoginChallenge = {
  challengeId: string;
  email: string;
  maskedEmail: string;
  code: string;
};

export type VerifyCodeResult =
  | { status: 'ok'; session: { admin: AuthAdmin; cookie: string } }
  | { status: 'invalid' | 'expired' | 'locked' };

type StoredAdmin = AuthAdmin & { password_hash: string };
type StoredChallenge = {
  id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: number;
  consumed_at: number | null;
  created_at: number;
};

export class LoginCooldownError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('LOGIN_CODE_COOLDOWN');
    this.name = 'LoginCooldownError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

function hexToBytes(value: string) {
  if (!/^[\da-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(left: string, right: string) {
  const leftBytes = hexToBytes(left);
  const rightBytes = hexToBytes(right);
  if (!leftBytes || !rightBytes || leftBytes.length !== rightBytes.length)
    return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function derivePbkdf2(
  password: string,
  salt: string,
  iterations: number,
) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const digest = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(salt),
      iterations,
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(digest));
}

async function hashPassword(
  password: string,
  salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16))),
) {
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${await derivePbkdf2(password, salt, PBKDF2_ITERATIONS)}`;
}

async function verifyPassword(password: string, storedHash: string) {
  if (storedHash.startsWith('pbkdf2$')) {
    const [, iterationsValue, salt, expectedHash] = storedHash.split('$');
    const iterations = Number(iterationsValue);
    if (
      !salt ||
      !expectedHash ||
      !Number.isInteger(iterations) ||
      iterations < 100_000
    )
      return false;
    return timingSafeEqual(
      await derivePbkdf2(password, salt, iterations),
      expectedHash,
    );
  }

  // Compatibilidade temporária: o próximo login válido atualiza o hash antigo.
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${password}`),
  );
  return timingSafeEqual(bytesToHex(new Uint8Array(digest)), expectedHash);
}

function readSessionToken(request: Request) {
  const cookies = request.headers.get('cookie')?.split(';') ?? [];
  const sessionCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${SESSION_COOKIE}=`),
  );
  return sessionCookie?.split('=')[1]?.trim() ?? null;
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function getSessionAdmin(
  request: Request,
): Promise<AuthAdmin | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const row = await getRawDb()
    .prepare(`
    SELECT admins.id, admins.email, admins.role
    FROM auth_sessions
    INNER JOIN admins ON admins.id = auth_sessions.admin_id
    WHERE auth_sessions.id = ? AND auth_sessions.expires_at > ?
    LIMIT 1
  `)
    .bind(token, Date.now())
    .first<AuthAdmin>();
  return row ?? null;
}

async function findOrBootstrapAdmin(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  let admin = await getRawDb()
    .prepare(
      'SELECT id, email, role, password_hash FROM admins WHERE email = ? LIMIT 1',
    )
    .bind(normalizedEmail)
    .first<StoredAdmin>();

  const initialEmail = env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const initialPassword = env.INITIAL_ADMIN_PASSWORD;
  if (
    !admin &&
    initialEmail &&
    initialPassword &&
    normalizedEmail === initialEmail &&
    password === initialPassword
  ) {
    const passwordHash = await hashPassword(initialPassword);
    await getRawDb()
      .prepare(
        'INSERT INTO admins (email, password_hash, role, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING',
      )
      .bind(initialEmail, passwordHash, 'owner', Date.now())
      .run();
    admin = await getRawDb()
      .prepare(
        'SELECT id, email, role, password_hash FROM admins WHERE email = ? LIMIT 1',
      )
      .bind(normalizedEmail)
      .first<StoredAdmin>();
  }

  if (!admin || !(await verifyPassword(password, admin.password_hash)))
    return null;
  if (!admin.password_hash.startsWith('pbkdf2$')) {
    await getRawDb()
      .prepare('UPDATE admins SET password_hash = ? WHERE id = ?')
      .bind(await hashPassword(password), admin.id)
      .run();
  }
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  } satisfies AuthAdmin;
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visibleName = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${visibleName}${'•'.repeat(Math.max(2, Math.min(5, name.length - visibleName.length)))}@${domain}`;
}

function createCode() {
  const values = crypto.getRandomValues(new Uint32Array(1));
  return String(values[0] % 1_000_000).padStart(6, '0');
}

function assertChallengeCanBeSent(challenge: StoredChallenge | null) {
  const now = Date.now();
  if (
    challenge &&
    !challenge.consumed_at &&
    challenge.expires_at > now &&
    challenge.created_at + LOGIN_CODE_COOLDOWN_MS > now
  ) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((challenge.created_at + LOGIN_CODE_COOLDOWN_MS - now) / 1000),
    );
    throw new LoginCooldownError(retryAfterSeconds);
  }
}

export async function createLoginChallenge(
  email: string,
  password: string,
): Promise<LoginChallenge | null> {
  const admin = await findOrBootstrapAdmin(email, password);
  if (!admin) return null;

  const previous = await getRawDb()
    .prepare(
      'SELECT id, email, code_hash, attempts, expires_at, consumed_at, created_at FROM login_challenges WHERE email = ? ORDER BY created_at DESC LIMIT 1',
    )
    .bind(admin.email)
    .first<StoredChallenge>();
  assertChallengeCanBeSent(previous ?? null);

  const challengeId = crypto.randomUUID();
  const code = createCode();
  const now = Date.now();
  await getRawDb()
    .prepare('DELETE FROM login_challenges WHERE email = ? OR expires_at <= ?')
    .bind(admin.email, now)
    .run();
  await getRawDb()
    .prepare(
      'INSERT INTO login_challenges (id, email, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      challengeId,
      admin.email,
      await hashPassword(code),
      0,
      now + LOGIN_CODE_TTL_MS,
      now,
    )
    .run();
  return {
    challengeId,
    email: admin.email,
    maskedEmail: maskEmail(admin.email),
    code,
  };
}

export async function resendLoginChallenge(
  challengeId: string,
): Promise<LoginChallenge | null> {
  const previous = await getRawDb()
    .prepare(
      'SELECT id, email, code_hash, attempts, expires_at, consumed_at, created_at FROM login_challenges WHERE id = ? LIMIT 1',
    )
    .bind(challengeId)
    .first<StoredChallenge>();
  if (!previous || previous.consumed_at || previous.expires_at <= Date.now())
    return null;
  assertChallengeCanBeSent(previous);

  const nextChallengeId = crypto.randomUUID();
  const code = createCode();
  const now = Date.now();
  await getRawDb()
    .prepare(
      'INSERT INTO login_challenges (id, email, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      nextChallengeId,
      previous.email,
      await hashPassword(code),
      0,
      now + LOGIN_CODE_TTL_MS,
      now,
    )
    .run();
  return {
    challengeId: nextChallengeId,
    email: previous.email,
    maskedEmail: maskEmail(previous.email),
    code,
  };
}

export async function discardLoginChallenge(challengeId: string) {
  await getRawDb()
    .prepare('DELETE FROM login_challenges WHERE id = ?')
    .bind(challengeId)
    .run();
}

async function createSessionForAdmin(request: Request, admin: AuthAdmin) {
  const now = Date.now();
  const token = crypto.randomUUID();
  const expiresAt = now + SESSION_TTL_MS;
  await getRawDb().batch([
    getRawDb()
      .prepare('DELETE FROM auth_sessions WHERE expires_at <= ?')
      .bind(now),
    getRawDb()
      .prepare('DELETE FROM login_challenges WHERE expires_at <= ?')
      .bind(now),
    getRawDb()
      .prepare(
        'INSERT INTO auth_sessions (id, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(token, admin.id, expiresAt, now),
  ]);
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return {
    admin,
    cookie: `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`,
  };
}

export async function verifyLoginCode(
  request: Request,
  challengeId: string,
  code: string,
): Promise<VerifyCodeResult> {
  const challenge = await getRawDb()
    .prepare(
      'SELECT id, email, code_hash, attempts, expires_at, consumed_at, created_at FROM login_challenges WHERE id = ? LIMIT 1',
    )
    .bind(challengeId)
    .first<StoredChallenge>();
  if (!challenge || challenge.consumed_at || challenge.expires_at <= Date.now())
    return { status: 'expired' };
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) return { status: 'locked' };

  const isValid =
    /^\d{6}$/.test(code) && (await verifyPassword(code, challenge.code_hash));
  if (!isValid) {
    const attempts = challenge.attempts + 1;
    await getRawDb()
      .prepare('UPDATE login_challenges SET attempts = ? WHERE id = ?')
      .bind(attempts, challengeId)
      .run();
    return { status: attempts >= MAX_CODE_ATTEMPTS ? 'locked' : 'invalid' };
  }

  const admin = await getRawDb()
    .prepare('SELECT id, email, role FROM admins WHERE email = ? LIMIT 1')
    .bind(challenge.email)
    .first<AuthAdmin>();
  if (!admin) return { status: 'expired' };
  const consumed = await getRawDb()
    .prepare(
      'UPDATE login_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL',
    )
    .bind(Date.now(), challengeId)
    .run();
  if (!consumed.meta.changes) return { status: 'expired' };
  return { status: 'ok', session: await createSessionForAdmin(request, admin) };
}

export async function revokeSession(request: Request) {
  const token = readSessionToken(request);
  if (token)
    await getRawDb()
      .prepare('DELETE FROM auth_sessions WHERE id = ?')
      .bind(token)
      .run();
}
