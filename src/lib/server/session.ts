import { sql } from './db';

const SESSION_DURATION_DAYS = 30;

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const rows = await sql`
    INSERT INTO sessions (user_id, expires_at)
    VALUES (${userId}, ${expiresAt})
    RETURNING id
  `;
  return rows[0].id as string;
}

export async function validateAndExtendSession(
  sessionId: string
): Promise<{ userId: string } | null> {
  const rows = await sql`
    SELECT user_id, expires_at FROM sessions
    WHERE id = ${sessionId} AND expires_at > NOW()
  `;
  if (rows.length === 0) return null;

  // Extend session only if less than 15 days remain (reduces DB writes)
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  const expiresAt = rows[0].expires_at as Date;
  if (expiresAt.getTime() - Date.now() < fifteenDays) {
    const newExpiry = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
    await sql`UPDATE sessions SET expires_at = ${newExpiry} WHERE id = ${sessionId}`;
  }

  return { userId: rows[0].user_id as string };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}
