import {
  applyActionCode as fbApplyActionCode,
  confirmPasswordReset as fbConfirmPasswordReset,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  updatePassword,
  verifyBeforeUpdateEmail,
  type Auth,
} from "firebase/auth";
import type { IClientAuthProvider } from "../../contracts/client-auth";

/**
 * Firebase Auth client SDK implementation of IClientAuthProvider.
 *
 * Accepts the already-initialized Auth instance explicitly to avoid relying on
 * the global Firebase app registry — which breaks when Turbopack resolves
 * firebase/auth to a different module copy than the one that called initializeApp().
 */
export class FirebaseClientAuthProvider implements IClientAuthProvider {
  constructor(private readonly _auth: Auth) {}

  async signInWithEmailAndPassword(
    email: string,
    password: string,
  ): Promise<void> {
    await fbSignInWithEmailAndPassword(this._auth, email, password);
  }

  async applyActionCode(code: string): Promise<void> {
    await fbApplyActionCode(this._auth, code);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await fbSendPasswordResetEmail(this._auth, email);
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    await fbConfirmPasswordReset(this._auth, code, newPassword);
  }

  async reauthenticateAndChangePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = this._auth.currentUser;
    if (!user?.email) throw new Error("No authenticated user.");
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword,
    );
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }

  async reauthenticateAndSendEmailUpdateVerification(
    currentPassword: string,
    newEmail: string,
  ): Promise<void> {
    const user = this._auth.currentUser;
    if (!user?.email) throw new Error("No authenticated user.");
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await verifyBeforeUpdateEmail(user, newEmail);
  }

  async reloadCurrentUser(): Promise<void> {
    await this._auth.currentUser?.reload();
  }
}
