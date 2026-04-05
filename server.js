const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function verifyGitHubSignature(rawBody, signatureHeader, secret) {
  if (!secret) {
    return true;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

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
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

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
      homepageUrl: APP_BASE_URL,
      webhookUrl: `${APP_BASE_URL}/webhook/github`,
      callbackUrl: `${APP_BASE_URL}/auth/github/callback`,
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/auth/github/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

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
  console.log(`GitHub-ify running on ${APP_BASE_URL}`);
});
