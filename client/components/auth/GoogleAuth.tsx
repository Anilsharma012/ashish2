import { useState } from "react";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Mail, CheckCircle, AlertCircle, Shield, Chrome } from "lucide-react";
import { signInWithGoogle, isFirebaseConfigured } from "../../lib/firebase";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

interface GoogleAuthProps {
  userType?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: "card" | "button";
}

export default function GoogleAuth({
  userType = "buyer",
  onSuccess,
  onError,
  className = "",
  variant = "card",
}: GoogleAuthProps) {
  const { loginWithFirebase } = useFirebaseAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("Starting Google authentication...");

      // Sign in with Google popup
      const firebaseUser = await signInWithGoogle();
      console.log(
        "Google authentication successful, Firebase user:",
        firebaseUser.uid,
      );

      // Login with Firebase (this will create or update the user profile)
      await loginWithFirebase(firebaseUser, userType);

      setSuccess("Successfully signed in with Google!");

      // Call success callback
      if (onSuccess) {
        setTimeout(onSuccess, 1000);
      }
    } catch (error: any) {
      console.error("Google authentication failed:", error);
      const errorMessage =
        error.message || "Google authentication failed. Please try again.";
      setError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (variant === "button") {
    return (
      <div className={className}>
        {/* Error Alert */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleGoogleLogin}
          className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400"
          enabled={loading}
          size="lg"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full mr-3"></div>
              Signing in...
            </div>
          ) : (
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </div>
          )}
        </Button>
      </div>
    );
  }

  // Card variant
  return (
    <div className={className}>
      {/* Error Alert */}
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl">Sign in with Google</CardTitle>
          <p className="text-gray-600">
            Quick and secure authentication with your Google account
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Benefits */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Shield className="h-4 w-4 mr-2 text-green-600" />
              Why use Google Sign-In?
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                No need to remember another password
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                Secure authentication by Google
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                Quick and easy access to your account
              </li>
            </ul>
          </div>

          {/* Google Sign-In Button */}
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200"
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full mr-3"></div>
                Connecting to Google...
              </div>
            ) : (
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </div>
            )}
          </Button>

          {/* Browser notice */}
          <div className="flex items-center justify-center text-xs text-gray-500 space-x-1">
            <Chrome className="h-3 w-3" />
            <span>Works best with Chrome, Firefox, Safari, and Edge</span>
          </div>

          {/* Privacy notice */}
          <p className="text-xs text-gray-500 text-center">
            By signing in with Google, you agree to our{" "}
            <a
              href="/terms-conditions"
              className="text-[#C70000] hover:underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy-policy"
              className="text-[#C70000] hover:underline"
            >
              Privacy Policy
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
