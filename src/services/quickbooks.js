// QuickBooks Online OAuth 2.0 Integration
// Docs: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization
//
// Token exchange happens through our backend (/api/quickbooks/token) so the
// CLIENT_SECRET is never exposed to the browser.

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

async function qbRequest(endpoint, options = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not connected to QuickBooks');

  const realmId = localStorage.getItem(STORAGE_KEYS.realmId);

  const response = await fetch('/api/quickbooks/proxy', {
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

  if (response.status === 401) {
    await refreshAccessToken();
    return qbRequest(endpoint, options);
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
  const existingNames = new Set(existing.map(c => c.DisplayName?.toLowerCase()));

  for (const c of customers) {
    try {
      if (existingNames.has(c.name?.toLowerCase())) {
        results.skipped++;
        continue;
      }
      await createQBCustomer(c);
      results.created++;
    } catch (e) {
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
  const query = encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${(name || '').replace(/'/g, "\\'")}'`);
  const data = await qbRequest(`/query?query=${query}`);
  if (data.QueryResponse?.Customer?.length > 0) {
    return data.QueryResponse.Customer[0];
  }
  return await createQBCustomer({ name, email });
}

export async function createQBInvoice(invoice) {
  const customer = await findOrCreateCustomer(invoice.client_name, invoice.client_email);

  const qbInvoice = {
    CustomerRef: { value: customer.Id },
    DocNumber: invoice.invoice_number,
    TxnDate: invoice.issue_date ? new Date(invoice.issue_date).toISOString().split('T')[0] : undefined,
    DueDate: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : undefined,
    Line: [{
      Amount: parseFloat(invoice.total) || 0,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: { value: '1', name: 'Services' },
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
  const existingNums = new Set(existing.map(i => i.DocNumber));

  for (const inv of invoices) {
    try {
      if (existingNums.has(inv.invoice_number)) {
        results.skipped++;
        continue;
      }
      await createQBInvoice(inv);
      results.created++;
    } catch (e) {
      results.errors.push({ number: inv.invoice_number, error: e.message });
    }
  }
  return results;
}

export async function performFullSync(customers, invoices) {
  return {
    customers: await syncCustomersToQB(customers),
    invoices: await syncInvoicesToQB(invoices),
  };
}
