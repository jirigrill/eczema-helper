import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { getDatabaseUrl } from '../test-utils';

const DATABASE_URL = getDatabaseUrl();

describe('Audit Logging', () => {
  let sql: ReturnType<typeof postgres>;

  async function cleanupTestData() {
    // Clean up test audit logs
    await sql`DELETE FROM audit_log WHERE details->>'testMarker' = 'audit-test'`;
    // Clean up test users
    await sql`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-audit-%@example.com')`;
    await sql`DELETE FROM user_children WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-audit-%@example.com')`;
    await sql`
      DELETE FROM children
      WHERE id NOT IN (SELECT DISTINCT child_id FROM user_children)
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    await sql`DELETE FROM users WHERE email LIKE 'test-audit-%@example.com'`;
  }

  async function hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 12);
  }

  async function createTestUser(email: string, passwordHash: string) {
    const users = await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email}, 'Test User', ${passwordHash})
      RETURNING id, email
    `;
    return users[0];
  }

  async function getAuditLogs(action: string, userId?: string) {
    if (userId) {
      return sql`
        SELECT * FROM audit_log
        WHERE action = ${action} AND user_id = ${userId}
        ORDER BY created_at DESC
      `;
    }
    return sql`
      SELECT * FROM audit_log
      WHERE action = ${action}
      ORDER BY created_at DESC
      LIMIT 10
    `;
  }

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 5 });
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await sql.end();
  });

  describe('authentication events', () => {
    it('logs successful registration', async () => {
      const email = `test-audit-reg-${Date.now()}@example.com`;

      const res = await fetch('http://localhost:5173/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', name: 'Audit Test' }),
      });
      expect(res.status).toBe(201);

      const json = await res.json();
      const userId = json.data.id;

      // Check audit log
      const logs = await getAuditLogs('registration', userId);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe('registration');
      expect(logs[0].user_id).toBe(userId);
    });

    it('logs successful login', async () => {
      const email = `test-audit-login-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('password123');
      const user = await createTestUser(email, passwordHash);

      const res = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      expect(res.status).toBe(200);

      // Check audit log
      const logs = await getAuditLogs('login_success', user.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe('login_success');
      expect(logs[0].user_id).toBe(user.id);
    });

    it('logs failed login attempt', async () => {
      const email = `test-audit-fail-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('password123');
      const user = await createTestUser(email, passwordHash);

      const res = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrongpassword' }),
      });
      expect(res.status).toBe(401);

      // Check audit log
      const logs = await getAuditLogs('login_failure', user.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe('login_failure');
      expect(logs[0].user_id).toBe(user.id);
      // Verify password is NOT in the details
      const details = logs[0].details;
      expect(details).not.toHaveProperty('password');
      expect(details).not.toHaveProperty('passwordHash');
    });

    it('logs logout', async () => {
      const email = `test-audit-logout-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('password123');
      const user = await createTestUser(email, passwordHash);

      // Login first
      const loginRes = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const cookie = loginRes.headers.get('set-cookie');

      // Logout
      const res = await fetch('http://localhost:5173/api/auth/logout', {
        method: 'POST',
        headers: { 'Cookie': cookie ?? '' },
      });
      expect(res.status).toBe(200);

      // Check audit log
      const logs = await getAuditLogs('logout', user.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe('logout');
    });
  });

  describe('child management events', () => {
    it('logs child creation', async () => {
      const email = `test-audit-child-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('password123');
      const user = await createTestUser(email, passwordHash);

      // Login
      const loginRes = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const cookie = loginRes.headers.get('set-cookie');

      // Create child
      const res = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie ?? '' },
        body: JSON.stringify({ name: 'AuditChild', birthDate: '2025-01-01' }),
      });
      expect(res.status).toBe(201);

      // Check audit log
      const logs = await getAuditLogs('child_created', user.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe('child_created');
    });

    it('logs child update', async () => {
      const email = `test-audit-update-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('password123');
      const user = await createTestUser(email, passwordHash);

      // Login
      const loginRes = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const cookie = loginRes.headers.get('set-cookie');

      // Create child
      const createRes = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie ?? '' },
        body: JSON.stringify({ name: 'OriginalName', birthDate: '2025-01-01' }),
      });
      const child = (await createRes.json()).data;

      // Update child
      const res = await fetch(`http://localhost:5173/api/children/${child.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie ?? '' },
        body: JSON.stringify({ name: 'UpdatedName' }),
      });
      expect(res.status).toBe(200);

      // Check audit log
      const logs = await getAuditLogs('child_updated', user.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe('child_updated');
    });

    it('logs child deletion', async () => {
      const email = `test-audit-delete-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('password123');
      const user = await createTestUser(email, passwordHash);

      // Login
      const loginRes = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const cookie = loginRes.headers.get('set-cookie');

      // Create child
      const createRes = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie ?? '' },
        body: JSON.stringify({ name: 'ToDelete', birthDate: '2025-01-01' }),
      });
      const child = (await createRes.json()).data;

      // Delete child
      const res = await fetch(`http://localhost:5173/api/children/${child.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookie ?? '' },
      });
      expect(res.status).toBe(200);

      // Check audit log
      const logs = await getAuditLogs('child_deleted', user.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe('child_deleted');
    });
  });

  describe('security properties', () => {
    it('never logs passwords in audit details', async () => {
      const email = `test-audit-nopwd-${Date.now()}@example.com`;

      // Register (which creates audit log)
      await fetch('http://localhost:5173/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'supersecretpassword123', name: 'Test' }),
      });

      // Check ALL audit logs for this email
      const logs = await sql`
        SELECT * FROM audit_log
        WHERE details::text ILIKE '%${sql.unsafe(email.replace('@', '%40'))}%'
        OR (user_id IN (SELECT id FROM users WHERE email = ${email}))
      `;

      for (const log of logs) {
        const detailsStr = JSON.stringify(log.details ?? {});
        expect(detailsStr).not.toContain('supersecret');
        expect(detailsStr).not.toContain('password');
        expect(detailsStr).not.toContain('passwordHash');
      }
    });

    it('includes IP address in audit log', async () => {
      const email = `test-audit-ip-${Date.now()}@example.com`;

      await fetch('http://localhost:5173/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', name: 'IP Test' }),
      });

      const logs = await sql`
        SELECT * FROM audit_log
        WHERE user_id IN (SELECT id FROM users WHERE email = ${email})
        AND action = 'registration'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      expect(logs.length).toBe(1);
      // IP should be set (might be ::1 or 127.0.0.1 in test environment)
      expect(logs[0].ip_address).toBeTruthy();
    });
  });
});
