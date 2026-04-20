/**
 * Client-side auth provider contract.
 *
 * Abstracts client-side authentication operations so hooks
 * never import a specific auth SDK directly.
 */

export interface IClientAuthProvider {
  /** Sign in with email + password */
  signInWithEmailAndPassword(email: string, password: string): Promise<void>;

  /** Apply an email verification action code */
  applyActionCode(code: string): Promise<void>;

  /** Send a password reset email */
  sendPasswordResetEmail(email: string): Promise<void>;

  /** Confirm a password reset with a code and new password */
  confirmPasswordReset(code: string, newPassword: string): Promise<void>;

  /** Re-authenticate with current password and change to new password */
  reauthenticateAndChangePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;

  /** Reload the current user's profile */
  reloadCurrentUser(): Promise<void>;
}

// --- Runtime registry ------------------------------------------------------
let _provider: IClientAuthProvider | null = null;

export function registerClientAuthProvider(
  provider: IClientAuthProvider,
): void {
  _provider = provider;
}

export function getClientAuthProvider(): IClientAuthProvider {
  if (!_provider) {
    throw new Error(
      "Client auth provider not registered. Call registerClientAuthProvider() before using auth hooks.",
    );
  }
  return _provider;
}
