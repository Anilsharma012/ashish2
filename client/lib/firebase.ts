// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
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

// Firebase configuration via environment variables (no secrets committed)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only if required env vars are present
const isConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);
export const isFirebaseConfigured = isConfigured;
try {
  const safeConfig = {
    apiKey: firebaseConfig.apiKey ? "***SET***" : null,
    authDomain: firebaseConfig.authDomain || null,
    projectId: firebaseConfig.projectId || null,
    appId: firebaseConfig.appId || null,
  };
  console.info("Firebase safe config:", safeConfig);
  console.info("isConfigured:", isConfigured, "env present:", {
    VITE_FIREBASE_API_KEY: Boolean(import.meta.env.VITE_FIREBASE_API_KEY),
    VITE_FIREBASE_AUTH_DOMAIN: Boolean(
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    ),
    VITE_FIREBASE_PROJECT_ID: Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    VITE_FIREBASE_APP_ID: Boolean(import.meta.env.VITE_FIREBASE_APP_ID),
  });
} catch (e) {
  // ignore
}
let app: any = null;
let analytics: any = undefined;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
  // Initialize Analytics only when measurementId is present and in browser
  if (
    typeof window !== "undefined" &&
    Boolean(firebaseConfig.measurementId) &&
    import.meta.env.MODE === "production"
  ) {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      // Avoid crashing on analytics/installation registration issues in dev
      console.warn(
        "Analytics initialization skipped:",
        (e as any)?.message || e,
      );
    }
  }
} else {
  console.warn(
    "Firebase not configured: missing env vars. App will run without Firebase features.",
  );
}
export { analytics };

// Initialize Firebase Auth/Firestore conditionally
export const auth: any = isConfigured ? getAuth(app) : (null as any);
export const db: any = isConfigured ? getFirestore(app) : (null as any);

// Enable offline persistence (best-effort)
if (isConfigured && typeof window !== "undefined" && db) {
  enableIndexedDbPersistence(db).catch((err: any) => {
    if (err?.code === "failed-precondition") {
      console.warn("Firestore persistence disabled: multiple tabs open.");
    } else if (err?.code === "unimplemented") {
      console.warn("Firestore persistence not available in this browser.");
    } else {
      console.warn(
        "Failed to enable Firestore persistence:",
        err?.message || err,
      );
    }
  });
}

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

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
        if (this.recaptchaVerifier) {
          this.recaptchaVerifier.clear();
        }

        if (!auth) {
          return reject(new Error("Firebase not configured"));
        }
        this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          size,
          callback: () => {
            console.log("reCAPTCHA solved");
            resolve();
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired");
            reject(new Error("reCAPTCHA expired"));
          },
          "error-callback": (error: any) => {
            console.error("reCAPTCHA error:", error);
            reject(error);
          },
        });

        this.recaptchaVerifier
          .render()
          .then(() => {
            console.log("reCAPTCHA rendered successfully");
            resolve();
          })
          .catch(reject);
      } catch (error) {
        console.error("Failed to initialize reCAPTCHA:", error);
        reject(error);
      }
    });
  }

  // Send OTP to phone number
  async sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
    if (!this.recaptchaVerifier) {
      throw new Error(
        "reCAPTCHA not initialized. Call initializeRecaptcha first.",
      );
    }

    try {
      // Format phone number to include country code
      const formattedPhoneNumber = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;

      console.log("Sending OTP to:", formattedPhoneNumber);

      this.confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhoneNumber,
        this.recaptchaVerifier,
      );

      console.log("OTP sent successfully");
      return this.confirmationResult;
    } catch (error) {
      console.error("Failed to send OTP:", error);
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
      console.log("Phone authentication successful");
      return result.user;
    } catch (error) {
      console.error("OTP verification failed:", error);
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
        message = error.message || "Authentication failed";
    }

    return new Error(message);
  }
}

// Google Auth helpers
// Google Auth helpers
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  try {
    if (!auth) throw new Error("Firebase not configured");

    // First, handle redirect result (for environments where popups are blocked)
    try {
      const redirectRes = await getRedirectResult(auth);
      if (redirectRes && redirectRes.user) {
        return redirectRes.user;
      }
    } catch (e) {
      // ignore redirect errors - we'll fallback to popup
    }

    // Try popup normally
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (popupError: any) {
      // If popup fails due to being blocked, fallback to redirect
      const code = popupError?.code || "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          // After redirect, the app will reload and getRedirectResult will resolve
          // Throw an informative error so caller can show a message if needed
          throw new Error("Redirecting to Google sign-in (popup blocked)");
        } catch (redirectErr) {
          // If redirect also fails, fall through to standard error handling
          console.error("Google redirect failed:", redirectErr);
          throw redirectErr;
        }
      }
      throw popupError;
    }
  } catch (error) {
    console.error("Google authentication failed:", error);
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
        message =
          "Network error. Add this preview domain to Firebase > Authentication > Settings > Authorized domains, then retry.";
        break;
      default:
        message =
          (error && (error as any).message) ||
          authError?.message ||
          "Google authentication failed";
    }

    throw new Error(message);
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    if (!auth) return;
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Sign out failed:", error);
    throw error;
  }
};

// Auth state listener
export const onAuthStateChange = (
  callback: (user: FirebaseUser | null) => void,
) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};

// Utility functions
export const getCurrentUser = (): FirebaseUser | null => {
  return auth ? auth.currentUser : null;
};

export const isUserSignedIn = (): boolean => {
  return !!(auth && auth.currentUser);
};

export default app;
