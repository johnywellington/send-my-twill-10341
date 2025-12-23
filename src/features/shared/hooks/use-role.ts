import { useAuth } from "@/features/shared/hooks/use-auth";

type UserRole = "user";

export const useRole = () => {
  const { role, loading } = useAuth();

  const hasRole = (requiredRole: UserRole): boolean => {
    if (loading || !role) return false;
    return role === requiredRole;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (loading || !role) return false;
    return roles.includes(role);
  };

  return {
    role,
    loading,
    hasRole,
    hasAnyRole,
  };
};
