// Role-based access control (RBAC) for the Mold app.
// In demo mode, user is always Admin. In production, this would check auth.me().

import { base44 } from '@/api/base44Client';

// Define what each role can do
const ROLE_PERMISSIONS = {
  Admin: {
    canViewDashboard: true,
    canManageClients: true,
    canManageInvoices: true,
    canManageTests: true,
    canManageLeads: true,
    canManageExpenses: true,
    canManageTechnicians: true,
    canManageLabs: true,
    canManageUsers: true,
    canManageSettings: true,
    canSyncQuickBooks: true,
    canViewAuditLog: true,
  },
  Manager: {
    canViewDashboard: true,
    canManageClients: true,
    canManageInvoices: true,
    canManageTests: true,
    canManageLeads: true,
    canManageExpenses: true,
    canManageTechnicians: true,
    canManageLabs: true,
    canManageUsers: false,
    canManageSettings: false,
    canSyncQuickBooks: true,
    canViewAuditLog: true,
  },
  Technician: {
    canViewDashboard: true,
    canManageClients: false, // can view only
    canManageInvoices: false,
    canManageTests: true, // their own tests
    canManageLeads: false,
    canManageExpenses: false,
    canManageTechnicians: false,
    canManageLabs: false,
    canManageUsers: false,
    canManageSettings: false,
    canSyncQuickBooks: false,
    canViewAuditLog: false,
  },
  Viewer: {
    canViewDashboard: true,
    canManageClients: false,
    canManageInvoices: false,
    canManageTests: false,
    canManageLeads: false,
    canManageExpenses: false,
    canManageTechnicians: false,
    canManageLabs: false,
    canManageUsers: false,
    canManageSettings: false,
    canSyncQuickBooks: false,
    canViewAuditLog: false,
  },
};

let cachedUser = null;

export async function getCurrentUser() {
  if (cachedUser) return cachedUser;
  try {
    cachedUser = await base44.auth.me();
    return cachedUser;
  } catch {
    return { id: 'anonymous', app_role: 'Viewer', full_name: 'Guest' };
  }
}

export function getUserRole(user) {
  return user?.app_role || user?.role || 'Viewer';
}

export function hasPermission(user, permission) {
  const role = getUserRole(user);
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Viewer;
  return !!perms[permission];
}

export function getPermissions(user) {
  const role = getUserRole(user);
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Viewer;
}

// React hook for checking permissions
import { useState, useEffect } from 'react';

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return {
    user,
    loading,
    role: getUserRole(user),
    permissions: getPermissions(user),
    can: (perm) => hasPermission(user, perm),
  };
}
