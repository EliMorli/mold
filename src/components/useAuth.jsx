import { useQuery } from "@tanstack/react-query";
import { base44, DEMO_MODE } from "@/api/base44Client";

// Mock user for demo mode
const DEMO_USER = {
  id: 'demo-user',
  full_name: 'Demo Admin',
  email: 'demo@example.com',
  app_role: 'Admin',
};

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => DEMO_MODE ? Promise.resolve(DEMO_USER) : base44.auth.me(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const appRole = user?.app_role || 'View Only';
  const isAdmin = appRole === 'Admin';
  const isTechnician = appRole === 'Technician';
  const isClient = appRole === 'Client';
  const isViewOnly = appRole === 'View Only';

  const canView = (resource) => {
    // Everyone can view dashboard
    if (resource === 'dashboard') return true;

    // View Only can only see dashboard and reports
    if (isViewOnly) return ['dashboard', 'reports'].includes(resource);

    // Clients can see client portal, tests, invoices, payments
    if (isClient) return ['dashboard', 'client-portal', 'tests', 'invoices', 'payments', 'reports'].includes(resource);

    // Technicians can see most things except financial settings
    if (isTechnician) return !['settings', 'expenses', 'owner-view', 'client-portal', 'automation'].includes(resource);

    // Admins can see everything except client portal (that's for clients only)
    if (resource === 'client-portal') return false;

    return isAdmin;
  };

  const canEdit = (resource) => {
    // View Only and Clients cannot edit
    if (isViewOnly || isClient) return false;
    
    // Technicians can edit tests, calendar, map, their profile
    if (isTechnician) return ['tests', 'calendar', 'map', 'technicians'].includes(resource);
    
    // Admins can edit everything
    return isAdmin;
  };

  const canDelete = (resource) => {
    // Only admins can delete
    return isAdmin;
  };

  const canCreate = (resource) => {
    // View Only and Clients cannot create
    if (isViewOnly || isClient) return false;
    
    // Technicians can create tests
    if (isTechnician) return ['tests'].includes(resource);
    
    // Admins can create everything
    return isAdmin;
  };

  return {
    user,
    isLoading,
    appRole,
    isAdmin,
    isTechnician,
    isClient,
    isViewOnly,
    canView,
    canEdit,
    canDelete,
    canCreate,
  };
}