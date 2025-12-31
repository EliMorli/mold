import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID || "68fe9e0ba7e63fa3c343bbd2",
  requiresAuth: true // Ensure authentication is required for all operations
});
