// Vercel Serverless Function: POST /api/quickbooks/proxy
// Proxies requests to QuickBooks Online API, avoiding CORS issues.
// The browser sends requests here; this server function forwards them to QB.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint, method = 'GET', body, accessToken, realmId, environment } = req.body || {};

  if (!endpoint || !accessToken || !realmId) {
    return res.status(400).json({ error: 'endpoint, accessToken, and realmId are required' });
  }

  const baseUrl = environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';

  const url = `${baseUrl}/v3/company/${realmId}${endpoint}`;

  try {
    const fetchOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => ({}));

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('QB proxy error:', error);
    return res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
}
