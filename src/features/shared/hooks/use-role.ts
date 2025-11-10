import { useAuth } from "@/features/shared/hooks/use-auth";

type UserRole = "admin" | "user";

export const useRole = () => {
  const { role, loading } = useAuth();

  const hasRole = (requiredRole: UserRole): boolean => {
    if (loading || !role) return false;
    
    // Admin has access to everything
    if (role === 'admin') return true;
    
    // Check specific role
    return role === requiredRole;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (loading || !role) return false;
    
    // Admin has access to everything
    if (role === 'admin') return true;
    
    return roles.includes(role);
  };

  const canAccessAdminPanel = (): boolean => {
    return hasRole('admin');
  };

  const canManageUsers = (): boolean => {
    return hasRole('admin');
  };

  const canConfigureProviders = (): boolean => {
    return hasRole('admin');
  };

  const canViewAllData = (): boolean => {
    return hasRole('admin');
  };

  return {
    role,
    loading,
    hasRole,
    hasAnyRole,
    canAccessAdminPanel,
    canManageUsers,
    canConfigureProviders,
    canViewAllData,
  };
};
