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

    // Capture as text first so non-JSON bodies (HTML gateway errors, plain
    // text from QB on 5xx) reach the caller verbatim instead of being lost.
    const raw = await response.text().catch(() => '');
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { _raw: raw.slice(0, 500) };
    }

    // Forward Retry-After so the client can honor QB's rate-limit hint.
    // Header value can be either seconds or an HTTP-date.
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds)) {
        data._retryAfterMs = Math.max(0, seconds * 1000);
      } else {
        const dateMs = Date.parse(retryAfter);
        if (!Number.isNaN(dateMs)) data._retryAfterMs = Math.max(0, dateMs - Date.now());
      }
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('QB proxy error:', error);
    return res.status(502).json({ error: 'Proxy request failed', details: error.message });
  }
}
