const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const APP_BASE_URL = process.env.APP_BASE_URL || '';
const GITHUB_APP_SLUG = process.env.GITHUB_APP_SLUG || '';
const GITHUB_APP_ID = process.env.GITHUB_APP_ID || '';
const GITHUB_APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID || '';
const GITHUB_APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET || '';
const GITHUB_APP_PRIVATE_KEY = (process.env.GITHUB_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function getBaseUrl(req) {
  if (APP_BASE_URL) {
    return APP_BASE_URL.replace(/\/$/, '');
  }

  const host = req.headers.host;
  if (!host) {
    return `http://localhost:${PORT}`;
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto ? String(forwardedProto).split(',')[0].trim() : 'http';
  return `${protocol}://${host}`;
}

function getInstallUrl() {
  if (!GITHUB_APP_SLUG) {
    return null;
  }
  return `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;
}

function verifyGitHubSignature(rawBody, signatureHeader, secret) {
  if (!secret) {
    return true;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const headerBuffer = Buffer.from(signatureHeader, 'utf8');

  if (expectedBuffer.length !== headerBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, headerBuffer);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const text = raw.toString('utf8');

      try {
        const json = text ? JSON.parse(text) : {};
        resolve({ raw, json, text });
      } catch {
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createGitHubAppJwt() {
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
    throw new Error('Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: GITHUB_APP_ID,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(GITHUB_APP_PRIVATE_KEY, 'base64url');
  return `${unsignedToken}.${signature}`;
}

function serveIndex(req, res) {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const baseUrl = getBaseUrl(req);
  const installUrl = getInstallUrl() || '#';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    html
      .replaceAll('{{APP_BASE_URL}}', baseUrl)
      .replaceAll('{{WEBHOOK_URL}}', `${baseUrl}/webhook/github`)
      .replaceAll('{{CALLBACK_URL}}', `${baseUrl}/auth/github/callback`)
      .replaceAll('{{INSTALL_URL}}', installUrl),
  );
}

function requireAdmin(req, res) {
  if (!ADMIN_TOKEN) {
    sendJson(res, 403, { ok: false, error: 'Admin endpoints are disabled. Set ADMIN_TOKEN to enable.' });
    return false;
  }

  const given = req.headers['x-admin-token'];
  if (given !== ADMIN_TOKEN) {
    sendJson(res, 401, { ok: false, error: 'Invalid admin token' });
    return false;
  }

  return true;
}

const server = http.createServer(async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const url = new URL(req.url, baseUrl);

  if (req.method === 'GET' && url.pathname === '/') {
    serveIndex(req, res);
function serveIndex(res) {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    html
      .replaceAll('{{APP_BASE_URL}}', APP_BASE_URL)
      .replaceAll('{{WEBHOOK_URL}}', `${APP_BASE_URL}/webhook/github`)
      .replaceAll('{{CALLBACK_URL}}', `${APP_BASE_URL}/auth/github/callback`),
  );
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, APP_BASE_URL);

  if (req.method === 'GET' && url.pathname === '/') {
    serveIndex(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'github-ify', timestamp: new Date().toISOString() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/app/config') {
    sendJson(res, 200, {
      homepageUrl: `${baseUrl}/`,
      webhookUrl: `${baseUrl}/webhook/github`,
      callbackUrl: `${baseUrl}/auth/github/callback`,
      installUrl: getInstallUrl(),
      environmentReady: {
        hasWebhookSecret: Boolean(WEBHOOK_SECRET),
        hasAppId: Boolean(GITHUB_APP_ID),
        hasClientId: Boolean(GITHUB_APP_CLIENT_ID),
        hasClientSecret: Boolean(GITHUB_APP_CLIENT_SECRET),
        hasPrivateKey: Boolean(GITHUB_APP_PRIVATE_KEY),
        hasAppSlug: Boolean(GITHUB_APP_SLUG),
      },
      homepageUrl: APP_BASE_URL,
      webhookUrl: `${APP_BASE_URL}/webhook/github`,
      callbackUrl: `${APP_BASE_URL}/auth/github/callback`,
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/auth/github/start') {
    if (!GITHUB_APP_CLIENT_ID) {
      sendJson(res, 400, { ok: false, error: 'Set GITHUB_APP_CLIENT_ID to enable OAuth start.' });
      return;
    }

    const state = crypto.randomBytes(12).toString('hex');
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', GITHUB_APP_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${baseUrl}/auth/github/callback`);
    authUrl.searchParams.set('state', state);

    res.writeHead(302, { Location: authUrl.toString() });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/auth/github/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      sendJson(res, 400, { ok: false, error: 'Missing ?code in callback URL.' });
      return;
    }

    if (!GITHUB_APP_CLIENT_ID || !GITHUB_APP_CLIENT_SECRET) {
      sendJson(res, 200, {
        ok: true,
        message: 'Callback reached. Set GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET to exchange this code.',
        received: { code: 'present', state: state ? 'present' : 'missing' },
      });
      return;
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_APP_CLIENT_ID,
        client_secret: GITHUB_APP_CLIENT_SECRET,
        code,
      }),
    });

    const tokenJson = await tokenResponse.json();
    sendJson(res, tokenResponse.ok ? 200 : 400, {
      ok: tokenResponse.ok,
      message: tokenResponse.ok
        ? 'OAuth code exchanged. Store this access token securely server-side.'
        : 'OAuth exchange failed.',
      tokenType: tokenJson.token_type || null,
      scope: tokenJson.scope || null,
      hasAccessToken: Boolean(tokenJson.access_token),
      error: tokenJson.error || null,
      errorDescription: tokenJson.error_description || null,
      state: state || null,
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/github/install-url') {
    const installUrl = getInstallUrl();
    if (!installUrl) {
      sendJson(res, 400, { ok: false, error: 'Set GITHUB_APP_SLUG to generate install URL.' });
      return;
    }

    sendJson(res, 200, { ok: true, installUrl });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/github/app/installations') {
    if (!requireAdmin(req, res)) {
      return;
    }

    let jwt;
    try {
      jwt = createGitHubAppJwt();
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
      return;
    }

    const apiRes = await fetch('https://api.github.com/app/installations', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${jwt}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'github-ify',
      },
    });

    const apiJson = await apiRes.json();
    sendJson(res, apiRes.ok ? 200 : 400, {
      ok: apiRes.ok,
      count: Array.isArray(apiJson) ? apiJson.length : null,
      installations: Array.isArray(apiJson)
        ? apiJson.map((item) => ({
            id: item.id,
            account: item.account?.login || null,
            targetType: item.target_type,
            htmlUrl: item.html_url,
          }))
        : null,
      error: Array.isArray(apiJson) ? null : apiJson,
    });
    sendJson(res, 200, {
      ok: true,
      message: 'GitHub callback endpoint is reachable. Exchange code for a user token in your auth service.',
      received: {
        code: code ? 'present' : 'missing',
        state: state ? 'present' : 'missing',
      },
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/webhook/github') {
    let body;
    try {
      body = await parseBody(req);
    } catch {
    } catch (error) {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return;
    }

    const signature = req.headers['x-hub-signature-256'];
    const verified = verifyGitHubSignature(body.raw, signature, WEBHOOK_SECRET);

    if (!verified) {
      sendJson(res, 401, { ok: false, error: 'Webhook signature verification failed' });
      return;
    }

    const event = req.headers['x-github-event'] || 'unknown';
    const delivery = req.headers['x-github-delivery'] || 'unknown';

    sendJson(res, 202, {
      ok: true,
      accepted: true,
      event,
      delivery,
      action: body.json.action || null,
      note: 'Webhook accepted. Persist/sync star state in your data store from this payload.',
    });
    return;
  }

  sendText(res, 404, 'Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`GitHub-ify running on ${HOST}:${PORT}`);
  console.log(`GitHub-ify running on ${APP_BASE_URL}`);
});
