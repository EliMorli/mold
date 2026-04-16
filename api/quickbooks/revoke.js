// Vercel Serverless Function: POST /api/quickbooks/revoke
// Revokes a QuickBooks OAuth token so the user is forced to re-authorize
// (and pick a company again) on the next connection.

const REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(REVOKE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    // Intuit returns 200 with empty body on success
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Revoke error:', error);
    return res.status(500).json({ error: 'Revoke failed', details: error.message });
  }
}
