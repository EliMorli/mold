// QuickBooks Online OAuth 2.0 Integration
// Docs: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization
//
// Token exchange happens through our backend (/api/quickbooks/token) so the
// CLIENT_SECRET is never exposed to the browser.

import { base44 } from '@/api/base44Client';

const QB_CONFIG = {
  clientId: import.meta.env.VITE_QUICKBOOKS_CLIENT_ID || '',
  redirectUri: import.meta.env.VITE_QUICKBOOKS_REDIRECT_URI || `${window.location.origin}/Settings?tab=quickbooks`,
  environment: import.meta.env.VITE_QUICKBOOKS_ENVIRONMENT || 'sandbox',
  scopes: 'com.intuit.quickbooks.accounting',
};

const getBaseUrl = () => QB_CONFIG.environment === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';

const AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const BACKEND_TOKEN_URL = '/api/quickbooks/token';

const STORAGE_KEYS = {
  accessToken: 'qb_access_token',
  refreshToken: 'qb_refresh_token',
  realmId: 'qb_realm_id',
  tokenExpiry: 'qb_token_expiry',
  companyName: 'qb_company_name',
};

// ============ OAuth Flow ============

function generateRandomState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function hasCredentials() {
  return !!QB_CONFIG.clientId;
}

export function getAuthorizationUrl() {
  if (!QB_CONFIG.clientId) {
    throw new Error('QuickBooks Client ID not configured. Add VITE_QUICKBOOKS_CLIENT_ID to your environment.');
  }
  const state = generateRandomState();
  sessionStorage.setItem('qb_oauth_state', state);

  const params = new URLSearchParams({
    client_id: QB_CONFIG.clientId,
    redirect_uri: QB_CONFIG.redirectUri,
    response_type: 'code',
    scope: QB_CONFIG.scopes,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function handleOAuthCallback(code, state, realmId) {
  const savedState = sessionStorage.getItem('qb_oauth_state');
  if (state !== savedState) {
    throw new Error('Invalid OAuth state - possible CSRF attack');
  }
  sessionStorage.removeItem('qb_oauth_state');

  // Call our backend to exchange code for tokens (keeps client_secret server-side)
  const response = await fetch(BACKEND_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, grant_type: 'authorization_code' }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || error.error || error.details || 'Failed to exchange authorization code');
  }

  const tokens = await response.json();
  storeTokens(tokens, realmId);
  await fetchAndStoreCompanyInfo();
  return tokens;
}

function storeTokens(tokens, realmId) {
  const expiry = Date.now() + (tokens.expires_in * 1000);
  localStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
  localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
  localStorage.setItem(STORAGE_KEYS.tokenExpiry, expiry.toString());
  if (realmId) localStorage.setItem(STORAGE_KEYS.realmId, realmId);
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await fetch(BACKEND_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error('Session expired - please reconnect to QuickBooks');
  }

  const tokens = await response.json();
  storeTokens(tokens, localStorage.getItem(STORAGE_KEYS.realmId));
  return tokens.access_token;
}

export async function getAccessToken() {
  const expiry = parseInt(localStorage.getItem(STORAGE_KEYS.tokenExpiry) || '0');
  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (!accessToken) return null;

  // Refresh 5 min before expiry
  if (Date.now() > expiry - (5 * 60 * 1000)) {
    return await refreshAccessToken();
  }
  return accessToken;
}

export function clearTokens() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}

/**
 * Fully disconnect: revoke token on Intuit's side + clear local storage.
 * This forces a fresh login and company selection on the next connect.
 */
export async function disconnect() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  const token = refreshToken || accessToken;

  // Try to revoke on Intuit's side (best effort - don't block on failure)
  if (token) {
    try {
      await fetch('/api/quickbooks/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (e) {
      console.warn('Failed to revoke token on Intuit side:', e);
    }
  }

  clearTokens();
}

export function isConnected() {
  return !!localStorage.getItem(STORAGE_KEYS.accessToken);
}

export function getConnectionInfo() {
  return {
    isConnected: isConnected(),
    companyName: localStorage.getItem(STORAGE_KEYS.companyName),
    realmId: localStorage.getItem(STORAGE_KEYS.realmId),
    environment: QB_CONFIG.environment,
  };
}

/**
 * Returns the URL to open the connected QuickBooks company
 */
export function getQuickBooksAppUrl(path = '') {
  const realmId = localStorage.getItem(STORAGE_KEYS.realmId);
  if (!realmId) return null;

  const base = QB_CONFIG.environment === 'production'
    ? 'https://qbo.intuit.com'
    : 'https://app.sandbox.qbo.intuit.com';

  return `${base}/app/${path}`;
}

/**
 * Tests the connection by fetching company info from QuickBooks.
 * Returns the company info object on success, throws on failure.
 */
export async function testConnection() {
  const realmId = localStorage.getItem(STORAGE_KEYS.realmId);
  if (!realmId) throw new Error('Not connected');
  const data = await qbRequest(`/companyinfo/${realmId}`);
  // Update stored company name in case it changed
  if (data.CompanyInfo?.CompanyName) {
    localStorage.setItem(STORAGE_KEYS.companyName, data.CompanyInfo.CompanyName);
  }
  return data.CompanyInfo;
}

// ============ API calls (routed through /api/quickbooks/proxy to avoid CORS) ============

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function qbRequest(endpoint, options = {}, _attempt = 0) {
  const MAX_RETRIES = 3;
  const BACKOFF_MS = [1000, 2000, 4000]; // Exponential backoff

  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not connected to QuickBooks');

  const realmId = localStorage.getItem(STORAGE_KEYS.realmId);

  let response;
  try {
    response = await fetch('/api/quickbooks/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body) : undefined,
        accessToken,
        realmId,
        environment: QB_CONFIG.environment,
      }),
    });
  } catch (networkError) {
    // Network failure (offline, DNS, timeout) - retry with backoff
    if (_attempt < MAX_RETRIES) {
      console.warn(`[QB] Network error, retrying in ${BACKOFF_MS[_attempt]}ms...`, networkError.message);
      await sleep(BACKOFF_MS[_attempt]);
      return qbRequest(endpoint, options, _attempt + 1);
    }
    throw new Error(`Network error after ${MAX_RETRIES} retries: ${networkError.message}`);
  }

  if (response.status === 401) {
    await refreshAccessToken();
    return qbRequest(endpoint, options, 0); // Reset retry count after token refresh
  }

  // Retry on 5xx server errors or rate limits (429)
  if ((response.status >= 500 || response.status === 429) && _attempt < MAX_RETRIES) {
    console.warn(`[QB] Server error ${response.status}, retrying in ${BACKOFF_MS[_attempt]}ms...`);
    await sleep(BACKOFF_MS[_attempt]);
    return qbRequest(endpoint, options, _attempt + 1);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.Fault?.Error?.[0]?.Message || error.error || 'QuickBooks API error');
  }

  return response.json();
}

async function fetchAndStoreCompanyInfo() {
  try {
    const realmId = localStorage.getItem(STORAGE_KEYS.realmId);
    const data = await qbRequest(`/companyinfo/${realmId}`);
    const companyName = data.CompanyInfo?.CompanyName || 'QuickBooks Company';
    localStorage.setItem(STORAGE_KEYS.companyName, companyName);
    return companyName;
  } catch (e) {
    console.error('Failed to fetch company info:', e);
    return null;
  }
}

// ============ Customer Sync ============

export async function getQBCustomers() {
  const data = await qbRequest('/query?query=' + encodeURIComponent('SELECT * FROM Customer MAXRESULTS 1000'));
  return data.QueryResponse?.Customer || [];
}

export async function createQBCustomer(customer) {
  const qbCustomer = {
    DisplayName: customer.name,
    PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
    PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
    Notes: customer.client_type ? `Type: ${customer.client_type}` : undefined,
  };

  if (customer.address) {
    const parts = customer.address.split(',').map(s => s.trim());
    qbCustomer.BillAddr = {
      Line1: parts[0] || '',
      City: parts[1] || '',
      CountrySubDivisionCode: parts[2]?.split(' ')[0] || '',
      PostalCode: parts[2]?.split(' ')[1] || '',
    };
  }

  const data = await qbRequest('/customer', {
    method: 'POST',
    body: JSON.stringify(qbCustomer),
  });
  return data.Customer;
}

export async function syncCustomersToQB(customers) {
  const results = { created: 0, skipped: 0, errors: [] };
  const existing = await getQBCustomers();

  // Build map of existing QB customers by normalized name (trimmed + lowercase)
  const normalizeName = (n) => (n || '').trim().toLowerCase();
  const existingByName = new Map();
  existing.forEach(c => {
    if (c.DisplayName) existingByName.set(normalizeName(c.DisplayName), c);
    if (c.CompanyName) existingByName.set(normalizeName(c.CompanyName), c);
  });

  for (const c of customers) {
    try {
      const nameKey = normalizeName(c.name);
      if (nameKey && existingByName.has(nameKey)) {
        // Customer already exists in QB - link app client to QB ID if not already linked
        if (!c.qb_id && c.id) {
          const qbCust = existingByName.get(nameKey);
          await base44.entities.Client.update(c.id, { qb_id: qbCust.Id, qb_sync_token: qbCust.SyncToken });
        }
        results.skipped++;
        continue;
      }
      // Create in QuickBooks and store the returned QB ID back to app client
      const createdQBCustomer = await createQBCustomer(c);
      if (createdQBCustomer && c.id) {
        await base44.entities.Client.update(c.id, {
          qb_id: createdQBCustomer.Id,
          qb_sync_token: createdQBCustomer.SyncToken
        });
      }
      results.created++;
    } catch (e) {
      // Handle QB duplicate name error gracefully - treat as skipped
      if (e.message && /duplicate name/i.test(e.message)) {
        // Try to find the existing customer with a fresh query and link
        try {
          const freshList = await getQBCustomers();
          const existingCust = freshList.find(qc =>
            normalizeName(qc.DisplayName) === normalizeName(c.name) ||
            normalizeName(qc.CompanyName) === normalizeName(c.name)
          );
          if (existingCust && c.id) {
            await base44.entities.Client.update(c.id, {
              qb_id: existingCust.Id,
              qb_sync_token: existingCust.SyncToken
            });
          }
        } catch (_) { /* best effort */ }
        results.skipped++;
        continue;
      }
      results.errors.push({ name: c.name, error: e.message });
    }
  }
  return results;
}

// ============ Invoice Sync ============

export async function getQBInvoices() {
  const data = await qbRequest('/query?query=' + encodeURIComponent('SELECT * FROM Invoice MAXRESULTS 1000'));
  return data.QueryResponse?.Invoice || [];
}

async function findOrCreateCustomer(name, email) {
  const normalized = (name || '').trim();
  // Fetch all customers and match with trim + case-insensitive (QB names can have
  // trailing whitespace or varying case that exact-match queries miss).
  const allCustomers = await getQBCustomers();
  const match = allCustomers.find(c =>
    (c.DisplayName || '').trim().toLowerCase() === normalized.toLowerCase() ||
    (c.CompanyName || '').trim().toLowerCase() === normalized.toLowerCase()
  );
  if (match) return match;

  try {
    return await createQBCustomer({ name: normalized, email });
  } catch (e) {
    // If QB says duplicate, re-fetch and find the existing one
    if (e.message && /duplicate name/i.test(e.message)) {
      const fresh = await getQBCustomers();
      const existing = fresh.find(c =>
        (c.DisplayName || '').trim().toLowerCase() === normalized.toLowerCase() ||
        (c.CompanyName || '').trim().toLowerCase() === normalized.toLowerCase()
      );
      if (existing) return existing;
    }
    throw e;
  }
}

// Cache for service items
let cachedItems = null;
let itemsCacheTime = 0;
const ITEMS_CACHE_TTL = 5 * 60 * 1000;

async function findOrCreateServiceItem() {
  // Reuse cached result if fresh
  if (cachedItems && Date.now() - itemsCacheTime < ITEMS_CACHE_TTL) {
    return cachedItems;
  }

  // First try to find an existing Service item
  const data = await qbRequest('/query?query=' + encodeURIComponent(
    "SELECT * FROM Item WHERE Type = 'Service' MAXRESULTS 10"
  ));
  const items = data.QueryResponse?.Item || [];
  const activeItem = items.find(i => i.Active !== false);
  if (activeItem) {
    cachedItems = { value: activeItem.Id, name: activeItem.Name };
    itemsCacheTime = Date.now();
    return cachedItems;
  }

  // No service items exist - create one
  // First find an income account to link the item to
  const accounts = await getQBAccounts();
  const incomeAccount = accounts.find(a =>
    (a.AccountType === 'Income' || a.AccountType === 'Other Income') && a.Active !== false
  );
  if (!incomeAccount) {
    throw new Error('No Income account found in QuickBooks. Please create one before syncing invoices.');
  }

  const newItem = {
    Name: 'Mold Testing Services',
    Type: 'Service',
    IncomeAccountRef: { value: incomeAccount.Id, name: incomeAccount.Name },
  };

  const createData = await qbRequest('/item', {
    method: 'POST',
    body: JSON.stringify(newItem),
  });
  const created = createData.Item;
  cachedItems = { value: created.Id, name: created.Name };
  itemsCacheTime = Date.now();
  return cachedItems;
}

export async function createQBInvoice(invoice) {
  const customer = await findOrCreateCustomer(invoice.client_name, invoice.client_email);
  const serviceItem = await findOrCreateServiceItem();

  const qbInvoice = {
    CustomerRef: { value: customer.Id },
    DocNumber: invoice.invoice_number,
    TxnDate: invoice.issue_date ? new Date(invoice.issue_date).toISOString().split('T')[0] : undefined,
    DueDate: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : undefined,
    Line: [{
      Amount: parseFloat(invoice.total) || 0,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: serviceItem,
        Qty: 1,
        UnitPrice: parseFloat(invoice.total) || 0,
      },
      Description: `Mold Testing - ${invoice.invoice_number || ''}`,
    }],
    PrivateNote: invoice.notes || '',
  };

  const data = await qbRequest('/invoice', {
    method: 'POST',
    body: JSON.stringify(qbInvoice),
  });
  return data.Invoice;
}

export async function syncInvoicesToQB(invoices) {
  const results = { created: 0, skipped: 0, errors: [] };
  const existing = await getQBInvoices();

  // Build map of existing QB invoices by DocNumber
  const existingByNum = new Map();
  existing.forEach(i => {
    if (i.DocNumber) existingByNum.set(i.DocNumber, i);
  });

  for (const inv of invoices) {
    try {
      if (inv.invoice_number && existingByNum.has(inv.invoice_number)) {
        // Invoice already exists in QB - link app invoice to QB ID if not already linked
        if (!inv.qb_id && inv.id) {
          const qbInv = existingByNum.get(inv.invoice_number);
          await base44.entities.Invoice.update(inv.id, { qb_id: qbInv.Id, qb_sync_token: qbInv.SyncToken });
        }
        results.skipped++;
        continue;
      }
      // Create in QuickBooks and store the returned QB ID back to app invoice
      const createdQBInvoice = await createQBInvoice(inv);
      if (createdQBInvoice && inv.id) {
        await base44.entities.Invoice.update(inv.id, {
          qb_id: createdQBInvoice.Id,
          qb_sync_token: createdQBInvoice.SyncToken
        });
      }
      results.created++;
    } catch (e) {
      // Treat duplicate-name/docnumber errors as skipped (already exists in QB)
      if (e.message && /duplicate (name|document)|already exists/i.test(e.message)) {
        // Try to find the existing QB invoice and link it
        try {
          const fresh = await getQBInvoices();
          const match = fresh.find(qi => qi.DocNumber === inv.invoice_number);
          if (match && inv.id) {
            await base44.entities.Invoice.update(inv.id, {
              qb_id: match.Id,
              qb_sync_token: match.SyncToken,
            });
          }
        } catch (_) { /* best effort */ }
        results.skipped++;
        continue;
      }
      results.errors.push({ number: inv.invoice_number, error: e.message });
    }
  }
  return results;
}

// ============ Expense Sync ============

export async function getQBExpenses() {
  const data = await qbRequest('/query?query=' + encodeURIComponent('SELECT * FROM Purchase MAXRESULTS 1000'));
  return data.QueryResponse?.Purchase || [];
}

// Cache for QB accounts to avoid repeated queries
let cachedAccounts = null;
let accountsCacheTime = 0;
const ACCOUNTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getQBAccounts() {
  if (cachedAccounts && Date.now() - accountsCacheTime < ACCOUNTS_CACHE_TTL) {
    return cachedAccounts;
  }
  const data = await qbRequest('/query?query=' + encodeURIComponent('SELECT * FROM Account MAXRESULTS 1000'));
  cachedAccounts = data.QueryResponse?.Account || [];
  accountsCacheTime = Date.now();
  return cachedAccounts;
}

async function findPaymentAccount() {
  const accounts = await getQBAccounts();
  // For Purchase entity, QB requires:
  //   PaymentType='Cash' or 'Check' -> AccountRef must be Bank type
  //   PaymentType='CreditCard' -> AccountRef must be Credit Card type
  const bankAccount = accounts.find(a => a.AccountType === 'Bank' && a.Active !== false);
  if (bankAccount) {
    return {
      paymentType: 'Cash',
      accountRef: { value: bankAccount.Id, name: bankAccount.Name },
    };
  }

  const creditCard = accounts.find(a => a.AccountType === 'Credit Card' && a.Active !== false);
  if (creditCard) {
    return {
      paymentType: 'CreditCard',
      accountRef: { value: creditCard.Id, name: creditCard.Name },
    };
  }

  const accountTypes = [...new Set(accounts.map(a => a.AccountType))];
  console.error('[QB] No Bank/CreditCard account found. Available types:', accountTypes);
  throw new Error(`No Bank or Credit Card account in QuickBooks. Available types: ${accountTypes.join(', ')}. Please create a Bank account.`);
}

async function findExpenseAccount(category) {
  const accounts = await getQBAccounts();
  // Map app categories to QB expense account types
  // IMPORTANT: Only Expense, Other Expense, and Cost of Goods Sold are valid
  // for AccountBasedExpenseLineDetail - NOT Fixed Asset or other types
  const categoryMap = {
    'Lab Fees': ['Cost of Goods Sold', 'Expense', 'Other Expense'],
    'Equipment': ['Expense', 'Other Expense', 'Cost of Goods Sold'],
    'Travel': ['Expense', 'Other Expense'],
    'Marketing': ['Expense', 'Other Expense'],
    'Office Supplies': ['Expense', 'Other Expense'],
    'Insurance': ['Expense', 'Other Expense'],
    'Utilities': ['Expense', 'Other Expense'],
    'Salaries': ['Expense', 'Other Expense'],
    'Other': ['Expense', 'Other Expense', 'Cost of Goods Sold'],
  };

  const preferredTypes = categoryMap[category] || ['Expense', 'Other Expense'];

  for (const acctType of preferredTypes) {
    const expenseAccount = accounts.find(a => a.AccountType === acctType && a.Active !== false);
    if (expenseAccount) return { value: expenseAccount.Id, name: expenseAccount.Name };
  }

  // Fallback: any expense-type account
  const anyExpense = accounts.find(a =>
    ['Expense', 'Cost of Goods Sold', 'Other Expense'].includes(a.AccountType) && a.Active !== false
  );
  if (anyExpense) return { value: anyExpense.Id, name: anyExpense.Name };

  // Log available accounts for debugging
  const accountTypes = [...new Set(accounts.map(a => a.AccountType))];
  console.error('[QB] No expense account found. Available types:', accountTypes);
  throw new Error(`No valid expense account found in QuickBooks. Available account types: ${accountTypes.join(', ')}. Please create an Expense account.`);
}

// Tag embedded in PrivateNote to identify expenses created from this app
const APP_EXPENSE_TAG = (id) => `[MoldApp:${id}]`;

export async function createQBExpense(expense) {
  // Get valid accounts from QuickBooks (payment account determines PaymentType)
  const [payment, expenseAccount] = await Promise.all([
    findPaymentAccount(),
    findExpenseAccount(expense.category),
  ]);

  const notePieces = [
    APP_EXPENSE_TAG(expense.id),
    expense.category,
    expense.vendor,
    expense.notes,
  ].filter(Boolean);

  const qbPurchase = {
    PaymentType: payment.paymentType,
    AccountRef: payment.accountRef,
    TxnDate: expense.date ? new Date(expense.date).toISOString().split('T')[0] : undefined,
    Line: [{
      Amount: parseFloat(expense.amount) || 0,
      DetailType: 'AccountBasedExpenseLineDetail',
      AccountBasedExpenseLineDetail: {
        AccountRef: expenseAccount,
      },
      Description: (expense.description || expense.category || 'Expense').slice(0, 4000),
    }],
    PrivateNote: notePieces.join(' | ').slice(0, 4000),
  };

  console.log('[QB] Creating expense with:', {
    PaymentType: payment.paymentType,
    BankAccount: payment.accountRef,
    ExpenseAccount: expenseAccount,
    Category: expense.category,
  });

  const data = await qbRequest('/purchase', {
    method: 'POST',
    body: JSON.stringify(qbPurchase),
  });
  return data.Purchase;
}

export async function syncExpensesToQB(expenses) {
  const results = { created: 0, skipped: 0, errors: [] };
  const existing = await getQBExpenses();

  // Build lookup by embedded app-id tag in PrivateNote
  const existingByAppId = new Map();
  existing.forEach(e => {
    const note = e.PrivateNote || '';
    const match = note.match(/\[MoldApp:([^\]]+)\]/);
    if (match) existingByAppId.set(match[1], e);
  });

  for (const exp of expenses) {
    try {
      if (exp.qb_id) {
        results.skipped++;
        continue;
      }
      if (existingByAppId.has(exp.id)) {
        // Found a matching QB expense - link them
        const qbExp = existingByAppId.get(exp.id);
        await base44.entities.Expense.update(exp.id, { qb_id: qbExp.Id, qb_sync_token: qbExp.SyncToken });
        results.skipped++;
        continue;
      }
      const created = await createQBExpense(exp);
      if (created && exp.id) {
        await base44.entities.Expense.update(exp.id, { qb_id: created.Id, qb_sync_token: created.SyncToken });
      }
      results.created++;
    } catch (e) {
      results.errors.push({ description: exp.description, error: e.message });
    }
  }
  return results;
}

export async function performFullSync(customers, invoices, expenses = []) {
  const results = {
    customers: await syncCustomersToQB(customers),
    invoices: await syncInvoicesToQB(invoices),
  };
  if (expenses.length > 0) {
    results.expenses = await syncExpensesToQB(expenses);
  }
  return results;
}

// ============ Import FROM QuickBooks (pull direction) ============
// These fetch records from QuickBooks and save them into the app's local data store.

/**
 * Convert a QuickBooks Customer object to our app's client format.
 */
function qbCustomerToAppClient(qbCustomer) {
  // Build address string from BillAddr components
  let address = '';
  if (qbCustomer.BillAddr) {
    const parts = [
      qbCustomer.BillAddr.Line1,
      qbCustomer.BillAddr.Line2,
      qbCustomer.BillAddr.City,
      [qbCustomer.BillAddr.CountrySubDivisionCode, qbCustomer.BillAddr.PostalCode].filter(Boolean).join(' '),
    ].filter(Boolean);
    address = parts.join(', ');
  }

  return {
    name: qbCustomer.DisplayName || qbCustomer.CompanyName || 'Unknown',
    email: qbCustomer.PrimaryEmailAddr?.Address || '',
    phone: qbCustomer.PrimaryPhone?.FreeFormNumber || qbCustomer.Mobile?.FreeFormNumber || '',
    address,
    client_type: qbCustomer.CompanyName ? 'Business' : 'Homeowner',
    qb_id: qbCustomer.Id,
    qb_sync_token: qbCustomer.SyncToken,
    notes: qbCustomer.Notes || '',
  };
}

/**
 * Convert a QuickBooks Invoice object to our app's invoice format.
 */
function qbInvoiceToAppInvoice(qbInvoice, clientLookup = {}) {
  const balance = parseFloat(qbInvoice.Balance) || 0;
  const total = parseFloat(qbInvoice.TotalAmt) || 0;
  const customerName = qbInvoice.CustomerRef?.name || '';
  const customerQbId = qbInvoice.CustomerRef?.value || '';

  // Determine status based on balance and total
  let status = 'Sent';
  if (balance === 0 && total > 0) status = 'Paid';
  else if (balance > 0 && balance < total) status = 'Partially Paid';

  // Check if overdue
  const dueDate = qbInvoice.DueDate ? new Date(qbInvoice.DueDate) : null;
  if (status === 'Sent' && dueDate && dueDate < new Date()) {
    status = 'Overdue';
  }

  // Look up client: first by QB customer ID (reliable), then fall back to name match
  let client_id = '';
  let client_name = customerName;

  if (customerQbId && clientLookup.byQbId[customerQbId]) {
    const client = clientLookup.byQbId[customerQbId];
    client_id = client.id;
    client_name = client.name || customerName;
  } else if (customerName && clientLookup.byName[customerName.toLowerCase()]) {
    const client = clientLookup.byName[customerName.toLowerCase()];
    client_id = client.id;
    client_name = client.name || customerName;
  }

  return {
    invoice_number: qbInvoice.DocNumber || `QB-${qbInvoice.Id}`,
    client_id,
    client_name,
    total,
    amount_paid: total - balance,
    status,
    issue_date: qbInvoice.TxnDate ? new Date(qbInvoice.TxnDate).toISOString() : null,
    due_date: qbInvoice.DueDate ? new Date(qbInvoice.DueDate).toISOString() : null,
    paid_date: balance === 0 && qbInvoice.MetaData?.LastUpdatedTime
      ? new Date(qbInvoice.MetaData.LastUpdatedTime).toISOString()
      : null,
    qb_id: qbInvoice.Id,
    qb_sync_token: qbInvoice.SyncToken,
    notes: qbInvoice.PrivateNote || qbInvoice.CustomerMemo?.value || '',
  };
}

/**
 * Import customers FROM QuickBooks into the app.
 * Skips duplicates (matches on qb_id first, then name).
 */
export async function importCustomersFromQB() {
  const results = { imported: 0, skipped: 0, errors: [] };

  // Fetch existing app clients to detect duplicates
  const existingClients = await base44.entities.Client.list();
  const existingByQbId = new Map();
  const existingByName = new Map();
  existingClients.forEach(c => {
    if (c.qb_id) existingByQbId.set(c.qb_id, c);
    if (c.name) existingByName.set(c.name.toLowerCase(), c);
  });

  // Pull customers from QuickBooks
  const qbCustomers = await getQBCustomers();

  for (const qbCust of qbCustomers) {
    try {
      // Skip if we already have this QB customer (by QB ID)
      if (existingByQbId.has(qbCust.Id)) {
        results.skipped++;
        continue;
      }
      // Skip if we have a record with the same name (avoid duplicates on re-sync)
      const displayName = (qbCust.DisplayName || qbCust.CompanyName || '').toLowerCase();
      if (displayName && existingByName.has(displayName)) {
        // Link existing record to QB ID so future syncs know
        const existing = existingByName.get(displayName);
        await base44.entities.Client.update(existing.id, { qb_id: qbCust.Id, qb_sync_token: qbCust.SyncToken });
        results.skipped++;
        continue;
      }

      const appClient = qbCustomerToAppClient(qbCust);
      await base44.entities.Client.create(appClient);
      results.imported++;
    } catch (e) {
      results.errors.push({ name: qbCust.DisplayName, error: e.message });
    }
  }
  return results;
}

/**
 * Import invoices FROM QuickBooks into the app.
 * Skips duplicates (matches on qb_id first, then invoice_number).
 */
export async function importInvoicesFromQB() {
  const results = { imported: 0, skipped: 0, errors: [] };

  // Fetch existing app invoices and clients to link them up
  const [existingInvoices, existingClients] = await Promise.all([
    base44.entities.Invoice.list(),
    base44.entities.Client.list(),
  ]);

  const existingByQbId = new Map();
  const existingByNumber = new Map();
  existingInvoices.forEach(inv => {
    if (inv.qb_id) existingByQbId.set(inv.qb_id, inv);
    if (inv.invoice_number) existingByNumber.set(inv.invoice_number, inv);
  });

  // Build client lookup maps for linking invoices to app clients
  // Primary: by qb_id (QB customer ID → app client) - reliable link
  // Fallback: by name (case-insensitive)
  const clientLookup = { byQbId: {}, byName: {} };
  existingClients.forEach(c => {
    if (c.qb_id) clientLookup.byQbId[c.qb_id] = c;
    if (c.name) clientLookup.byName[c.name.toLowerCase()] = c;
  });

  // Pull invoices from QuickBooks
  const qbInvoices = await getQBInvoices();

  for (const qbInv of qbInvoices) {
    try {
      // Skip if we already imported this QB invoice
      if (existingByQbId.has(qbInv.Id)) {
        results.skipped++;
        continue;
      }
      // Skip if we have an invoice with the same number
      if (qbInv.DocNumber && existingByNumber.has(qbInv.DocNumber)) {
        // Link existing record to QB ID
        const existing = existingByNumber.get(qbInv.DocNumber);
        await base44.entities.Invoice.update(existing.id, { qb_id: qbInv.Id, qb_sync_token: qbInv.SyncToken });
        results.skipped++;
        continue;
      }

      const appInvoice = qbInvoiceToAppInvoice(qbInv, clientLookup);
      await base44.entities.Invoice.create(appInvoice);
      results.imported++;
    } catch (e) {
      results.errors.push({ number: qbInv.DocNumber, error: e.message });
    }
  }
  return results;
}

/**
 * Pull both customers and invoices from QuickBooks into the app.
 */
export async function performFullImport() {
  // Import customers first so invoices can link to them
  const customers = await importCustomersFromQB();
  const invoices = await importInvoicesFromQB();
  return { customers, invoices };
}
