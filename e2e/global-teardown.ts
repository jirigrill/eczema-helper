/**
 * Playwright global teardown - runs after all E2E tests complete
 *
 * Cleans up test data created during E2E test runs to prevent
 * database pollution from accumulated test users and children.
 */

import postgres from 'postgres';

// E2E test email patterns (must match createTestUser in helpers/auth.ts)
const E2E_EMAIL_PATTERNS = [
  'guard-test-%@example.com',
  'logout-test-%@example.com',
  'login-test-%@example.com',
  'register-test-%@example.com',
  'child-test-%@example.com',
];

function getDatabaseUrl(): string {
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  const db = process.env.POSTGRES_DB ?? 'eczema_helper';
  const user = process.env.POSTGRES_USER ?? 'eczema';
  const password = process.env.POSTGRES_PASSWORD ?? 'eczema_dev';
  return `postgres://${user}:${password}@${host}:${port}/${db}`;
}

async function globalTeardown() {
  const sql = postgres(getDatabaseUrl(), { max: 5 });

  try {
    console.log('\n🧹 Cleaning up E2E test data...');

    // Build OR condition for all patterns
    const patternConditions = E2E_EMAIL_PATTERNS.map(
      (_, i) => `email LIKE $${i + 1}`
    ).join(' OR ');

    // Delete in correct order for foreign key constraints
    // 1. Sessions
    await sql.unsafe(
      `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE ${patternConditions})`,
      E2E_EMAIL_PATTERNS
    );

    // 2. User-children junction
    await sql.unsafe(
      `DELETE FROM user_children WHERE user_id IN (SELECT id FROM users WHERE ${patternConditions})`,
      E2E_EMAIL_PATTERNS
    );

    // 3. Orphaned children (no user_children entry)
    const deletedChildren = await sql`
      DELETE FROM children
      WHERE id NOT IN (SELECT DISTINCT child_id FROM user_children)
      RETURNING id
    `;

    // 4. Test users
    const deletedUsers = await sql.unsafe(
      `DELETE FROM users WHERE ${patternConditions} RETURNING id`,
      E2E_EMAIL_PATTERNS
    );

    console.log(
      `   Removed ${deletedUsers.length} users, ${deletedChildren.length} orphaned children`
    );
    console.log('✅ E2E cleanup complete\n');
  } catch (error) {
    // Don't fail the test run on cleanup errors - just log
    console.error('⚠️  E2E cleanup error (non-fatal):', error);
  } finally {
    await sql.end();
  }
}

export default globalTeardown;
