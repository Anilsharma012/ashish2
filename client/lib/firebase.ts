// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  ConfirmationResult,
  AuthError,
} from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Firebase configuration (exact keys as provided)
export const firebaseConfig = {
  apiKey: "AIzaSyAAB9dXWrymvyJSrE8Qg3Op4vXQMEtv2hw",
  authDomain: "aashish-properties.firebaseapp.com",
  projectId: "aashish-properties",
  storageBucket: "aashish-properties.appspot.com",
  messagingSenderId: "1074799820866",
  appId: "1:1074799820866:web:60035a614911eb876faddb",
  measurementId: "G-WJS8TWNW00",
};

// Initialize Firebase (idempotent)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export default app;
export const isFirebaseConfigured = true;

let analytics: any = undefined;
if (
  typeof window !== "undefined" &&
  Boolean(firebaseConfig.measurementId) &&
  import.meta.env.MODE === "production"
) {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics initialization skipped:", (e as any)?.message || e);
  }
}
export { analytics };

// Initialize Firebase Auth/Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence (best-effort)
if (typeof window !== "undefined" && db) {
  enableIndexedDbPersistence(db).catch((err: any) => {
    if (err?.code === "failed-precondition") {
      console.warn("Firestore persistence disabled: multiple tabs open.");
    } else if (err?.code === "unimplemented") {
      console.warn("Firestore persistence not available in this browser.");
    } else {
      console.warn("Failed to enable Firestore persistence:", err?.message || err);
    }
  });
}

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Phone Auth helpers
export class PhoneAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private confirmationResult: ConfirmationResult | null = null;

  // Initialize reCAPTCHA verifier (default invisible)
  initializeRecaptcha(
    containerId: string,
    size: "normal" | "compact" | "invisible" = "invisible",
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const w = typeof window !== "undefined" ? (window as any) : {};
        if (w.recaptchaVerifier) {
          this.recaptchaVerifier = w.recaptchaVerifier as RecaptchaVerifier;
          return resolve();
        }

        this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          size,
          callback: () => resolve(),
          "expired-callback": () => reject(new Error("reCAPTCHA expired")),
          "error-callback": (error: any) => reject(error),
        });

        // Store globally for reuse
        if (typeof window !== "undefined") {
          (window as any).recaptchaVerifier = this.recaptchaVerifier;
        }

        this.recaptchaVerifier
          .render()
          .then(() => resolve())
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Send OTP to phone number
  async sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
    if (!this.recaptchaVerifier) {
      throw new Error("reCAPTCHA not initialized. Call initializeRecaptcha first.");
    }

    try {
      const formattedPhoneNumber = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;

      this.confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhoneNumber,
        this.recaptchaVerifier,
      );

      return this.confirmationResult;
    } catch (error) {
      throw this.handleAuthError(error as AuthError);
    }
  }

  // Verify OTP code
  async verifyOTP(code: string): Promise<FirebaseUser> {
    if (!this.confirmationResult) {
      throw new Error("No confirmation result available. Send OTP first.");
    }
    try {
      const result = await this.confirmationResult.confirm(code);
      return result.user;
    } catch (error) {
      throw this.handleAuthError(error as AuthError);
    }
  }

  // Clear reCAPTCHA
  clearRecaptcha(): void {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
    this.confirmationResult = null;
  }

  // Handle auth errors with user-friendly messages
  private handleAuthError(error: AuthError): Error {
    let message = "Authentication failed";
    switch (error.code) {
      case "auth/invalid-phone-number":
        message = "Invalid phone number. Please check and try again.";
        break;
      case "auth/missing-phone-number":
        message = "Phone number is required.";
        break;
      case "auth/quota-exceeded":
        message = "SMS quota exceeded. Please try again later.";
        break;
      case "auth/invalid-verification-code":
        message = "Invalid verification code. Please check and try again.";
        break;
      case "auth/code-expired":
        message = "Verification code has expired. Please request a new one.";
        break;
      case "auth/too-many-requests":
        message = "Too many attempts. Please try again later.";
        break;
      case "auth/operation-not-allowed":
        message = "Phone authentication is not enabled.";
        break;
      case "auth/captcha-check-failed":
        message = "reCAPTCHA verification failed. Please try again.";
        break;
      default:
        message = (error as any)?.message || "Authentication failed";
    }
    return new Error(message);
  }
}

// Google Auth helpers
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  try {
    // First, handle redirect result (for environments where popups are blocked)
    try {
      const redirectRes = await getRedirectResult(auth);
      if (redirectRes && redirectRes.user) {
        return redirectRes.user;
      }
    } catch {}

    // Try popup normally
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (popupError: any) {
      const code = popupError?.code || "";
      if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
        await signInWithRedirect(auth, googleProvider);
        throw new Error("Redirecting to Google sign-in (popup blocked)");
      }
      throw popupError;
    }
  } catch (error) {
    const authError = error as AuthError;
    let message = "Google authentication failed";
    switch (authError?.code) {
      case "auth/popup-closed-by-user":
        message = "Authentication cancelled by user";
        break;
      case "auth/popup-blocked":
        message = "Popup blocked by browser. Redirecting to Google sign-in...";
        break;
      case "auth/cancelled-popup-request":
        message = "Authentication cancelled";
        break;
      case "auth/operation-not-allowed":
        message = "Google authentication is not enabled";
        break;
      case "auth/unauthorized-domain":
        message = "This domain is not authorized for Google authentication";
        break;
      case "auth/network-request-failed":
        message = "Network error. Add this preview domain to Firebase > Authentication > Settings > Authorized domains, then retry.";
        break;
      default:
        message = (error as any)?.message || authError?.message || "Google authentication failed";
    }
    throw new Error(message);
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Auth state listener
export const onAuthStateChange = (
  callback: (user: FirebaseUser | null) => void,
) => {
  return onAuthStateChanged(auth, callback);
};

// Utility functions
export const getCurrentUser = (): FirebaseUser | null => auth.currentUser;
export const isUserSignedIn = (): boolean => !!auth.currentUser;
