import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/shared/hooks/use-auth";

interface UserRouteProps {
  children: React.ReactNode;
}

export const UserRoute = ({ children }: UserRouteProps) => {
  const { user, session, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-lg text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
