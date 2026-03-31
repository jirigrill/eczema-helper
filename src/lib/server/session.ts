import { sql } from './db';
import { SESSION } from '$lib/config/constants';
import { formatDateToIso } from '$lib/utils/date';
import type { ClientUser, Child } from '$lib/domain/models';

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION.DURATION_DAYS * 24 * 60 * 60 * 1000);
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

  // Extend session only if less than threshold days remain (reduces DB writes)
  const extensionThresholdMs = SESSION.EXTENSION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = rows[0].expires_at as Date;
  if (expiresAt.getTime() - Date.now() < extensionThresholdMs) {
    const newExpiry = new Date(Date.now() + SESSION.DURATION_DAYS * 24 * 60 * 60 * 1000);
    await sql`UPDATE sessions SET expires_at = ${newExpiry} WHERE id = ${sessionId}`;
  }

  return { userId: rows[0].user_id as string };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

/**
 * Validates session and fetches user + children in a single optimized query.
 * This reduces 3 sequential queries to 1, improving performance for authenticated requests.
 */
export async function validateSessionWithUserAndChildren(
  sessionId: string
): Promise<{ user: ClientUser; children: Child[]; shouldExtend: boolean } | null> {
  // Single query that joins sessions, users, and children
  const rows = await sql`
    SELECT
      s.expires_at,
      u.id AS user_id,
      u.email AS user_email,
      u.name AS user_name,
      u.role AS user_role,
      c.id AS child_id,
      c.name AS child_name,
      c.birth_date AS child_birth_date,
      c.created_at AS child_created_at,
      c.updated_at AS child_updated_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN user_children uc ON uc.user_id = u.id
    LEFT JOIN children c ON c.id = uc.child_id
    WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    ORDER BY c.created_at ASC
  `;

  if (rows.length === 0) return null;

  // All rows have the same user info, extract from first row
  const firstRow = rows[0];
  const user: ClientUser = {
    id: firstRow.user_id as string,
    email: firstRow.user_email as string,
    name: firstRow.user_name as string,
    role: firstRow.user_role as 'parent',
  };

  // Extract unique children (there may be multiple rows due to LEFT JOIN)
  const children: Child[] = [];
  const seenChildIds = new Set<string>();
  for (const row of rows) {
    if (row.child_id && !seenChildIds.has(row.child_id as string)) {
      seenChildIds.add(row.child_id as string);
      children.push({
        id: row.child_id as string,
        name: row.child_name as string,
        birthDate: formatDateToIso(row.child_birth_date),
        createdAt: String(row.child_created_at),
        updatedAt: String(row.child_updated_at),
      });
    }
  }

  // Check if session needs extension (less than threshold days remaining)
  const extensionThresholdMs = SESSION.EXTENSION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = firstRow.expires_at as Date;
  const shouldExtend = expiresAt.getTime() - Date.now() < extensionThresholdMs;

  return { user, children, shouldExtend };
}

/**
 * Extends session expiry. Called asynchronously after response is sent.
 */
export async function extendSession(sessionId: string): Promise<void> {
  const newExpiry = new Date(Date.now() + SESSION.DURATION_DAYS * 24 * 60 * 60 * 1000);
  await sql`UPDATE sessions SET expires_at = ${newExpiry} WHERE id = ${sessionId}`;
}

/**
 * Delete all expired sessions from the database.
 * Called probabilistically from hooks.server.ts (1% of requests).
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await sql`
    DELETE FROM sessions WHERE expires_at < NOW()
    RETURNING id
  `;
  return result.length;
}

/**
 * Probabilistic session cleanup trigger.
 * Returns true if cleanup should run (1% chance).
 */
export function shouldRunSessionCleanup(): boolean {
  return Math.random() < SESSION.CLEANUP_PROBABILITY;
}
