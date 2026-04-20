import {
  applyActionCode as fbApplyActionCode,
  confirmPasswordReset as fbConfirmPasswordReset,
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  updatePassword,
} from "firebase/auth";
import type { IClientAuthProvider } from "../../contracts/client-auth";

/**
 * Firebase Auth client SDK implementation of IClientAuthProvider.
 */
export class FirebaseClientAuthProvider implements IClientAuthProvider {
  async signInWithEmailAndPassword(
    email: string,
    password: string,
  ): Promise<void> {
    await fbSignInWithEmailAndPassword(getAuth(), email, password);
  }

  async applyActionCode(code: string): Promise<void> {
    await fbApplyActionCode(getAuth(), code);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await fbSendPasswordResetEmail(getAuth(), email);
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    await fbConfirmPasswordReset(getAuth(), code, newPassword);
  }

  async reauthenticateAndChangePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = getAuth().currentUser;
    if (!user?.email) throw new Error("No authenticated user.");
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword,
    );
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }

  async reloadCurrentUser(): Promise<void> {
    await getAuth().currentUser?.reload();
  }
}
