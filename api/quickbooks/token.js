// Vercel Serverless Function: POST /api/quickbooks/token
// Securely exchanges OAuth authorization code for access/refresh tokens.
// Keeps QUICKBOOKS_CLIENT_SECRET on the server (NOT exposed to browser).

const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export default async function handler(req, res) {
  // CORS (allow same origin by default on Vercel)
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: 'Server not configured',
      details: 'QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET must be set on the server.'
    });
  }

  const { code, grant_type, refresh_token } = req.body || {};

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  let body;
  if (grant_type === 'refresh_token') {
    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token required' });
    }
    body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
    });
  } else {
    if (!code) {
      return res.status(400).json({ error: 'code required' });
    }
    body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({ error: 'Token exchange failed', details: error.message });
  }
}
