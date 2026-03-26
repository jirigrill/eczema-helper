import { Page, APIRequestContext } from '@playwright/test';

/**
 * Authentication helpers for E2E tests
 * Uses API calls for reliable login instead of UI automation
 */

export interface User {
  email: string;
  password: string;
  name: string;
}

export function createTestUser(prefix: string): User {
  return {
    email: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: 'password123',
    name: 'Test User'
  };
}

/**
 * Login via API call - more reliable than UI automation
 */
export async function loginViaAPI(
  request: APIRequestContext,
  baseURL: string,
  user: User
): Promise<string> {
  // First register the user
  const registerRes = await request.post(`${baseURL}/api/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      name: user.name
    }
  });
  
  // User might already exist (409), that's ok
  if (!registerRes.ok() && registerRes.status() !== 409) {
    throw new Error(`Registration failed: ${registerRes.status()}`);
  }
  
  // Now login to get session cookie
  const loginRes = await request.post(`${baseURL}/api/auth/login`, {
    data: {
      email: user.email,
      password: user.password
    }
  });
  
  if (!loginRes.ok()) {
    throw new Error(`Login failed: ${loginRes.status()}`);
  }
  
  // Get session cookie from response
  const cookies = await loginRes.headers()['set-cookie'];
  if (!cookies) {
    throw new Error('No session cookie returned');
  }
  
  // Extract session_id from cookie string
  const match = cookies.match(/session_id=([^;]+)/);
  return match ? match[1] : '';
}

/**
 * Set up authenticated page context
 */
export async function setupAuthenticatedPage(
  page: Page,
  request: APIRequestContext,
  baseURL: string,
  prefix: string = 'test'
): Promise<User> {
  const user = createTestUser(prefix);
  
  // Get session via API
  const sessionCookie = await loginViaAPI(request, baseURL, user);
  
  // Set cookie in browser context
  await page.context().addCookies([{
    name: 'session_id',
    value: sessionCookie,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false, // localhost is not secure
    sameSite: 'Lax'
  }]);
  
  return user;
}

/**
 * Clear all cookies and storage
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
