import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 60 * 1000,
  });

  const appRole = user?.app_role || 'View Only';
  const isAdmin = appRole === 'Admin';
  const isTechnician = appRole === 'Technician';
  const isClient = appRole === 'Client';
  const isViewOnly = appRole === 'View Only';

  const canView = (resource) => {
    if (resource === 'dashboard') return true;
    if (isViewOnly) return ['dashboard', 'reports'].includes(resource);
    if (isClient) return ['dashboard', 'client-portal', 'tests', 'invoices', 'payments', 'reports', 'documents'].includes(resource);
    if (isTechnician) return !['settings', 'expenses', 'owner-view', 'client-portal', 'automation', 'users'].includes(resource);
    if (resource === 'client-portal') return false;
    return isAdmin;
  };

  const canEdit = (resource) => {
    if (isViewOnly || isClient) return false;
    if (isTechnician) return ['tests', 'calendar', 'map', 'technicians', 'documents'].includes(resource);
    return isAdmin;
  };

  const canDelete = () => isAdmin;
  const canCreate = (resource) => {
    if (isViewOnly || isClient) return false;
    if (isTechnician) return ['tests', 'documents'].includes(resource);
    return isAdmin;
  };

  const isApprovedUser = Boolean(user && user.status !== 'Suspended');

  return {
    user,
    isLoading,
    refetch,
    appRole,
    isAdmin,
    isTechnician,
    isClient,
    isViewOnly,
    isApprovedUser,
    canView,
    canEdit,
    canDelete,
    canCreate,
  };
}
