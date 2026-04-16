// QuickBooks auto-sync: push newly created/updated records to QuickBooks
// in the background when connected. Can be disabled via Settings.

import { toast } from 'sonner';
import { registerEntityHook } from '@/api/base44Client';
import { base44 } from '@/api/base44Client';
import {
  isConnected,
  createQBCustomer,
  createQBInvoice,
  createQBExpense,
  getQBCustomers,
  getQBInvoices,
  getQBExpenses,
} from './quickbooks';

const AUTO_SYNC_KEY = 'qb_auto_sync_enabled';

export const isAutoSyncEnabled = () => {
  const v = localStorage.getItem(AUTO_SYNC_KEY);
  return v === null ? true : v === 'true';
};

export const setAutoSyncEnabled = (enabled) => {
  localStorage.setItem(AUTO_SYNC_KEY, String(!!enabled));
};

const shouldSync = () => isConnected() && isAutoSyncEnabled();

async function syncClientToQB(client) {
  if (!shouldSync()) return;
  if (client.qb_id) return; // already synced
  try {
    const existing = await getQBCustomers();
    const match = existing.find(c => c.DisplayName?.toLowerCase() === client.name?.toLowerCase());
    if (match) {
      await base44.entities.Client.update(client.id, { qb_id: match.Id, qb_sync_token: match.SyncToken });
      return;
    }
    const created = await createQBCustomer(client);
    if (created?.Id) {
      await base44.entities.Client.update(client.id, { qb_id: created.Id, qb_sync_token: created.SyncToken });
      toast.success('Client synced to QuickBooks', { description: client.name });
    }
  } catch (e) {
    console.error('[AutoSync] Client sync failed:', e);
    toast.error('Could not sync client to QuickBooks', { description: e.message });
  }
}

async function syncInvoiceToQB(invoice) {
  if (!shouldSync()) return;
  if (invoice.qb_id) return;
  try {
    const existing = await getQBInvoices();
    const match = existing.find(i => i.DocNumber === invoice.invoice_number);
    if (match) {
      await base44.entities.Invoice.update(invoice.id, { qb_id: match.Id, qb_sync_token: match.SyncToken });
      return;
    }
    const created = await createQBInvoice(invoice);
    if (created?.Id) {
      await base44.entities.Invoice.update(invoice.id, { qb_id: created.Id, qb_sync_token: created.SyncToken });
      toast.success('Invoice synced to QuickBooks', { description: invoice.invoice_number });
    }
  } catch (e) {
    console.error('[AutoSync] Invoice sync failed:', e);
    toast.error('Could not sync invoice to QuickBooks', { description: e.message });
  }
}

async function syncExpenseToQB(expense) {
  if (!shouldSync()) return;
  if (expense.qb_id) return;
  try {
    const existing = await getQBExpenses();
    const match = existing.find(e => e.DocNumber === expense.id);
    if (match) {
      await base44.entities.Expense.update(expense.id, { qb_id: match.Id, qb_sync_token: match.SyncToken });
      return;
    }
    const created = await createQBExpense(expense);
    if (created?.Id) {
      await base44.entities.Expense.update(expense.id, { qb_id: created.Id, qb_sync_token: created.SyncToken });
      toast.success('Expense synced to QuickBooks', { description: expense.description });
    }
  } catch (e) {
    console.error('[AutoSync] Expense sync failed:', e);
    toast.error('Could not sync expense to QuickBooks', { description: e.message });
  }
}

let initialized = false;
export function initQuickBooksAutoSync() {
  if (initialized) return;
  initialized = true;
  registerEntityHook('clients', 'create', syncClientToQB);
  registerEntityHook('invoices', 'create', syncInvoiceToQB);
  registerEntityHook('expenses', 'create', syncExpenseToQB);
}
