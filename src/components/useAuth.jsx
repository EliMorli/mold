import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const isLoggedIn = !!user;
  const appRole = user?.role || 'View Only';
  const permissions = user?.permissions || {};

  const isAdmin = appRole === 'Admin';
  const isTechnician = appRole === 'Technician';
  const isClient = appRole === 'Client';
  const isViewOnly = appRole === 'View Only';

  // Check if user has specific permission for a resource
  const canView = (resource) => {
    // Not logged in - no access
    if (!user) return false;

    // Client portal is special - only for clients
    if (resource === 'client-portal') return isClient;

    // Check permissions object
    if (permissions[resource]?.view) return true;

    // Fallback for backwards compatibility with role-based checks
    if (isAdmin) return true;

    return false;
  };

  const canEdit = (resource) => {
    if (!user) return false;

    // Check permissions object
    if (permissions[resource]?.edit) return true;

    // Fallback for admin
    if (isAdmin) return true;

    return false;
  };

  const canDelete = (resource) => {
    if (!user) return false;

    // Check permissions object
    if (permissions[resource]?.delete) return true;

    // Fallback for admin
    if (isAdmin) return true;

    return false;
  };

  const canCreate = (resource) => {
    if (!user) return false;

    // Check permissions object
    if (permissions[resource]?.create) return true;

    // Fallback for admin
    if (isAdmin) return true;

    return false;
  };

  const logout = () => {
    base44.auth.logout();
  };

  return {
    user,
    isLoading,
    isLoggedIn,
    appRole,
    permissions,
    isAdmin,
    isTechnician,
    isClient,
    isViewOnly,
    canView,
    canEdit,
    canDelete,
    canCreate,
    logout,
    refetch,
  };
}