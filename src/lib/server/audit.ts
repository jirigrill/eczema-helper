import { sql } from './db';

type AuditAction =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'registration'
  | 'photo_upload'
  | 'photo_delete'
  | 'analysis_requested';

export async function logAudit(
  action: AuditAction,
  options: {
    userId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  } = {}
): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_log (user_id, action, details, ip_address)
      VALUES (
        ${options.userId ?? null},
        ${action},
        ${options.details ? JSON.stringify(options.details) : null},
        ${options.ipAddress ?? null}
      )
    `;
  } catch {
    // Audit failures must never crash the app
  }
}
