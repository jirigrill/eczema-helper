import { sql } from './db';
import { auditLogger } from './logger';

type AuditAction =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'registration'
  | 'child_created'
  | 'child_updated'
  | 'child_deleted'
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
  // Always log audit events to application logs for observability
  // Security: Exclude sensitive details from log, only include safe metadata
  auditLogger.info(
    {
      action,
      userId: options.userId,
      ipAddress: options.ipAddress,
      // Only include non-sensitive detail keys for traceability
      detailKeys: options.details ? Object.keys(options.details) : undefined,
    },
    `Audit: ${action}`
  );

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
  } catch (error) {
    // Security: Audit failures must never crash the app, but log for debugging
    // Note: Do not log sensitive data from options.details
    auditLogger.error(
      {
        action,
        userId: options.userId,
        err: error instanceof Error ? { message: error.message, name: error.name } : { message: 'Unknown error' },
      },
      `Audit log DB insert failed for action "${action}"`
    );
  }
}
