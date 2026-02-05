import { createClient } from '@base44/sdk';

export const DEMO_MODE = false;

const appId = import.meta.env.VITE_BASE44_APP_ID || '68fe9e0ba7e63fa3c343bbd2';

export const base44 = createClient({
  appId,
  requiresAuth: true,
});
