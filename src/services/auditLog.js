// Audit logging service: records create/update/delete events on key entities.
// Logs are stored in localStorage via the AuditLog entity.

import { registerEntityHook, base44 } from '@/api/base44Client';

const AUDITED_ENTITIES = ['clients', 'invoices', 'tests', 'leads', 'expenses', 'technicians'];

function getCurrentUser() {
  // In demo mode, we use a static user. In production, this would come from auth.
  return { id: 'demo', name: 'Demo Admin' };
}

async function logEvent(entityType, operation, record, details = {}) {
  const user = getCurrentUser();
  const entry = {
    entity_type: entityType,
    entity_id: record?.id || 'unknown',
    operation, // 'create' | 'update' | 'delete'
    user_id: user.id,
    user_name: user.name,
    timestamp: new Date().toISOString(),
    summary: buildSummary(entityType, operation, record),
    details: JSON.stringify(details).slice(0, 1000), // Limit size
  };
  try {
    await base44.entities.AuditLog.create(entry);
  } catch (e) {
    console.error('[AuditLog] Failed to log:', e);
  }
}

function buildSummary(entityType, operation, record) {
  const name = record?.name || record?.client_name || record?.invoice_number || record?.description || record?.id || '';
  const ops = { create: 'created', update: 'updated', delete: 'deleted' };
  return `${entityType.replace(/s$/, '')} "${name}" ${ops[operation] || operation}`;
}

let initialized = false;

export function initAuditLog() {
  if (initialized) return;
  initialized = true;

  AUDITED_ENTITIES.forEach(entityKey => {
    registerEntityHook(entityKey, 'create', (item) => logEvent(entityKey, 'create', item));
    registerEntityHook(entityKey, 'update', (item) => logEvent(entityKey, 'update', item));
    registerEntityHook(entityKey, 'delete', (item) => logEvent(entityKey, 'delete', item));
  });
}

export async function getAuditLog(limit = 100) {
  const all = await base44.entities.AuditLog.list();
  return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

export async function clearAuditLog() {
  const all = await base44.entities.AuditLog.list();
  for (const entry of all) {
    await base44.entities.AuditLog.delete(entry.id);
  }
}
