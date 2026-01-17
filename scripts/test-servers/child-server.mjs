/**
 * Child Server (Port 4001) - User's SaaS Server Mock
 *
 * This simulates a user's server that implements the SaaS Quest verification endpoint.
 * Users would deploy this kind of server on Vercel, their own infrastructure, etc.
 */

import http from 'http';
import crypto from 'crypto';

const PORT = 4003;

// This token should be set from environment variable in production
// Get it from parent server: curl http://localhost:4000/token
const TOKEN = process.env.SAAS_QUEST_VERIFICATION_TOKEN || 'test-verification-token-12345';

// Simulated server status - change these to test different scenarios
const SERVER_STATUS = {
  server: true,                    // Server is running
  test_field: true,                // Test field (required for test quest)
  stripe_configured: true,         // Stripe is configured
  database_connected: true,        // Database is connected
  environment: 'development',      // Current environment
  version: '1.0.0',               // Server version
};

function generateHmacSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyRequestSignature(timestamp, nonce, body, signature) {
  const payload = `${timestamp}.${nonce}.${JSON.stringify(body)}`;
  const expected = generateHmacSignature(payload, TOKEN);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-SaaS-Quest-Signature, X-SaaS-Quest-Timestamp, X-SaaS-Quest-Nonce');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      name: 'Child Server (User SaaS Server)',
      port: PORT,
      status: 'running',
      currentStatus: SERVER_STATUS,
      endpoints: {
        '/api/saas-quest/status': 'POST - SaaS Quest verification endpoint',
        '/status': 'GET - View current server status',
        '/set-status': 'POST - Change server status (for testing)',
      },
    }));
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: SERVER_STATUS,
      note: 'Use POST /set-status to change values for testing',
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/set-status') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const updates = JSON.parse(body);
      Object.assign(SERVER_STATUS, updates);
      console.log('Status updated:', SERVER_STATUS);
      res.writeHead(200);
      res.end(JSON.stringify({
        message: 'Status updated',
        status: SERVER_STATUS,
      }));
    } catch (error) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // SaaS Quest verification endpoint
  if (req.method === 'POST' && req.url === '/api/saas-quest/status') {
    console.log('\n=== Verification request received ===');

    // Get headers
    const signature = req.headers['x-saas-quest-signature'];
    const timestamp = req.headers['x-saas-quest-timestamp'];
    const nonce = req.headers['x-saas-quest-nonce'];

    console.log('Signature:', signature?.substring(0, 20) + '...');
    console.log('Timestamp:', timestamp);
    console.log('Nonce:', nonce);

    if (!signature || !timestamp || !nonce) {
      console.log('ERROR: Missing headers');
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing required headers' }));
      return;
    }

    // Timestamp validation (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
      console.log('ERROR: Request expired');
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Request expired' }));
      return;
    }

    // Read body
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    // Verify signature
    if (!verifyRequestSignature(timestamp, nonce, parsedBody, signature)) {
      console.log('ERROR: Invalid signature');
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }

    console.log('Signature verified!');
    console.log('Request body:', parsedBody);

    // Generate response with signature
    const resTimestamp = Math.floor(Date.now() / 1000);
    const responsePayload = `${resTimestamp}.${JSON.stringify(SERVER_STATUS)}`;
    const resSignature = generateHmacSignature(responsePayload, TOKEN);

    const response = {
      status: 'ok',
      timestamp: resTimestamp,
      data: SERVER_STATUS,
      signature: resSignature,
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));
    console.log('=================================\n');

    res.writeHead(200);
    res.end(JSON.stringify(response));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`
========================================
  Child Server (User SaaS Server)
  Running on http://localhost:${PORT}
========================================

Endpoints:
  GET  /                     - Server info
  GET  /status               - View current status
  POST /set-status           - Update status (for testing)
  POST /api/saas-quest/status - SaaS Quest verification endpoint

Current Status:
${JSON.stringify(SERVER_STATUS, null, 2)}

To test verification:
  1. Make sure parent server is running on port 4000
  2. Run: curl -X POST http://localhost:4000/verify

To change status (e.g., make test_field false):
  curl -X POST http://localhost:${PORT}/set-status -d '{"test_field":false}'
`);
});
