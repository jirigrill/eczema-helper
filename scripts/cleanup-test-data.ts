#!/usr/bin/env bun
/**
 * Cleanup test data from the database
 *
 * This script removes all test users, children, sessions, and user_children
 * records created by E2E and integration tests.
 *
 * Usage:
 *   bun scripts/cleanup-test-data.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 */

import postgres from 'postgres';

// Test email patterns used by E2E and integration tests
const TEST_EMAIL_PATTERNS = [
  // E2E test patterns (e2e/*.spec.ts)
  'guard-test-%@example.com',
  'logout-test-%@example.com',
  'login-test-%@example.com',
  'register-test-%@example.com',
  'child-test-%@example.com',
  // Integration test patterns (tests/integration/*.test.ts)
  'test-%@example.com',
  'test-child-%@example.com',
];

function getDatabaseUrl(): string {
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  const db = process.env.POSTGRES_DB ?? 'eczema_helper';
  const user = process.env.POSTGRES_USER ?? 'eczema';
  const password = process.env.POSTGRES_PASSWORD ?? 'eczema_dev';
  return `postgres://${user}:${password}@${host}:${port}/${db}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const sql = postgres(getDatabaseUrl(), { max: 5 });

  try {
    console.log(dryRun ? '=== DRY RUN ===' : '=== Cleaning test data ===');
    console.log('');

    // Build OR condition for all patterns
    const patternConditions = TEST_EMAIL_PATTERNS.map(
      (_, i) => `email LIKE $${i + 1}`
    ).join(' OR ');

    // Count test users
    const userCount = await sql.unsafe(
      `SELECT COUNT(*) as count FROM users WHERE ${patternConditions}`,
      TEST_EMAIL_PATTERNS
    );
    console.log(`Test users found: ${userCount[0].count}`);

    // Count sessions for test users
    const sessionCount = await sql.unsafe(
      `SELECT COUNT(*) as count FROM sessions WHERE user_id IN (SELECT id FROM users WHERE ${patternConditions})`,
      TEST_EMAIL_PATTERNS
    );
    console.log(`Test sessions found: ${sessionCount[0].count}`);

    // Count user_children for test users
    const ucCount = await sql.unsafe(
      `SELECT COUNT(*) as count FROM user_children WHERE user_id IN (SELECT id FROM users WHERE ${patternConditions})`,
      TEST_EMAIL_PATTERNS
    );
    console.log(`Test user_children found: ${ucCount[0].count}`);

    // Count orphaned children (no user_children entry)
    const orphanCount = await sql`
      SELECT COUNT(*) as count FROM children
      WHERE id NOT IN (SELECT DISTINCT child_id FROM user_children)
    `;
    console.log(`Orphaned children found: ${orphanCount[0].count}`);

    console.log('');

    if (dryRun) {
      console.log('Dry run complete. No data was deleted.');
      console.log('Run without --dry-run to actually delete.');
    } else {
      // Delete in correct order for foreign key constraints
      console.log('Deleting sessions...');
      const deletedSessions = await sql.unsafe(
        `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE ${patternConditions}) RETURNING id`,
        TEST_EMAIL_PATTERNS
      );
      console.log(`  Deleted ${deletedSessions.length} sessions`);

      console.log('Deleting user_children...');
      const deletedUC = await sql.unsafe(
        `DELETE FROM user_children WHERE user_id IN (SELECT id FROM users WHERE ${patternConditions}) RETURNING user_id`,
        TEST_EMAIL_PATTERNS
      );
      console.log(`  Deleted ${deletedUC.length} user_children`);

      console.log('Deleting orphaned children...');
      const deletedChildren = await sql`
        DELETE FROM children
        WHERE id NOT IN (SELECT DISTINCT child_id FROM user_children)
        RETURNING id
      `;
      console.log(`  Deleted ${deletedChildren.length} children`);

      console.log('Deleting test users...');
      const deletedUsers = await sql.unsafe(
        `DELETE FROM users WHERE ${patternConditions} RETURNING email`,
        TEST_EMAIL_PATTERNS
      );
      console.log(`  Deleted ${deletedUsers.length} users`);

      console.log('');
      console.log('Cleanup complete!');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
