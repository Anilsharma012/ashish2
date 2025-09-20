import { ReactNode, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { useFirebaseAuth } from "../../hooks/useFirebaseAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserTypes?: ("buyer" | "seller" | "agent" | "admin" | "staff")[];
  fallbackPath?: string;
  requireAuth?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredUserTypes = [],
  fallbackPath = "/auth",
  requireAuth = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useFirebaseAuth();
  const location = useLocation();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Store the attempted location to redirect back after login
    const redirectPath = `${fallbackPath}?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectPath} replace />;
  }

  // If user is authenticated but doesn't have required user type
  if (isAuthenticated && user && requiredUserTypes.length > 0) {
    if (!requiredUserTypes.includes(user.userType)) {
      // Redirect to appropriate dashboard based on user type
      const dashboardRoutes = {
        seller: "/seller-dashboard",
        buyer: "/buyer-dashboard",
        agent: "/agent-dashboard",
        admin: "/admin",
        staff: "/staff-dashboard",
      };

      const userDashboard = dashboardRoutes[user.userType] || "/";
      return <Navigate to={userDashboard} replace />;
    }
  }

  // User is authenticated and authorized, render the protected content
  return <>{children}</>;
}

// Higher-order component for protecting routes based on user types
export const withAuth = (
  Component: React.ComponentType<any>,
  options: Omit<ProtectedRouteProps, "children"> = {},
) => {
  return function AuthenticatedComponent(props: any) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

// Specific protected route components for common use cases
export const SellerProtectedRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredUserTypes={["seller"]}>{children}</ProtectedRoute>
);

export const BuyerProtectedRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredUserTypes={["buyer"]}>{children}</ProtectedRoute>
);

export const AgentProtectedRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredUserTypes={["agent"]}>{children}</ProtectedRoute>
);

export const AdminProtectedRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredUserTypes={["admin"]}>{children}</ProtectedRoute>
);

export const StaffProtectedRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredUserTypes={["staff"]}>{children}</ProtectedRoute>
);

// Component for redirecting authenticated users away from auth pages
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading } = useFirebaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, redirect to their dashboard
  if (isAuthenticated && user) {
    const dashboardRoutes = {
      seller: "/seller-dashboard",
      buyer: "/buyer-dashboard",
      agent: "/agent-dashboard",
      admin: "/admin",
      staff: "/staff-dashboard",
    };

    const userDashboard = dashboardRoutes[user.userType] || "/";
    return <Navigate to={userDashboard} replace />;
  }

  // User is not authenticated, show the public page
  return <>{children}</>;
}
