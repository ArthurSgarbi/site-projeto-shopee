import { createHash, randomBytes } from 'node:crypto';

export async function insertAuthenticatedSession(
  db,
  adminId = 1,
  ttl = 300_000,
) {
  const token = randomBytes(32).toString('hex');
  const stored = `v2:${createHash('sha256').update(token).digest('hex')}`;
  const now = Date.now();
  await db
    .prepare(`INSERT INTO auth_sessions
    (id, admin_id, expires_at, created_at, last_seen_at, mfa_verified)
    VALUES (?, ?, ?, ?, ?, 1)`)
    .bind(stored, adminId, now + ttl, now, now)
    .run();
  return token;
}
