/**
 * Domain services barrel export.
 *
 * Services contain pure business logic, depend only on port interfaces,
 * and return Result types for expected failures.
 */

export {
  createAuthService,
  type AuthService,
  type AuthError,
  type AuthResult,
  type ValidateCredentialsError,
  type ValidateCredentialsResult,
  type RegisterUserError,
  type RegisterUserResult,
  type ClientUser
} from './auth.service';
export { createChildService, type ChildService, type ChildError, type ChildResult } from './child.service';
