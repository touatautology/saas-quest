/**
 * Parent Server (Port 4000) - SaaS Quest Verification Server Mock
 *
 * This simulates the SaaS Quest server that verifies user servers.
 * In production, this would be the actual SaaS Quest backend.
 */

import http from 'http';
import crypto from 'crypto';

const PORT = 4002;
const CHILD_SERVER_URL = 'http://localhost:4003';

// Test token (in production, this would be stored encrypted in DB)
const VERIFICATION_TOKEN = 'test-verification-token-12345';

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function generateHmacSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyHmacSignature(payload, signature, secret) {
  const expected = generateHmacSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function verifyChildServer(requiredFields) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();
  const requestBody = {
    action: 'verify_status',
    timestamp,
    nonce,
  };

  // Generate signature
  const payload = `${timestamp}.${nonce}.${JSON.stringify(requestBody)}`;
  const signature = generateHmacSignature(payload, VERIFICATION_TOKEN);

  console.log('\n=== Sending verification request to child server ===');
  console.log('URL:', `${CHILD_SERVER_URL}/api/saas-quest/status`);
  console.log('Timestamp:', timestamp);
  console.log('Nonce:', nonce);
  console.log('Signature:', signature.substring(0, 20) + '...');

  try {
    const response = await fetch(`${CHILD_SERVER_URL}/api/saas-quest/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SaaS-Quest-Signature': signature,
        'X-SaaS-Quest-Timestamp': timestamp.toString(),
        'X-SaaS-Quest-Nonce': nonce,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return {
        isValid: false,
        message: `Child server returned error: ${response.status}`,
      };
    }

    const responseData = await response.json();
    console.log('\n=== Response from child server ===');
    console.log('Data:', JSON.stringify(responseData, null, 2));

    // Verify response signature
    if (!responseData.signature || !responseData.timestamp || !responseData.data) {
      return {
        isValid: false,
        message: 'Invalid response format from child server',
      };
    }

    // Timestamp validation (5 minutes)
    const responseTimestamp = responseData.timestamp;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - responseTimestamp) > 300) {
      return {
        isValid: false,
        message: 'Response timestamp is too old',
      };
    }

    // Verify signature
    const responsePayload = `${responseTimestamp}.${JSON.stringify(responseData.data)}`;
    if (!verifyHmacSignature(responsePayload, responseData.signature, VERIFICATION_TOKEN)) {
      return {
        isValid: false,
        message: 'Signature verification failed',
      };
    }

    console.log('Signature verified successfully!');

    // Check required fields
    const serverData = responseData.data;
    const missingFields = [];
    const falseFields = [];

    for (const field of requiredFields) {
      if (!(field in serverData)) {
        missingFields.push(field);
      } else if (serverData[field] === false) {
        falseFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        data: serverData,
      };
    }

    if (falseFields.length > 0) {
      return {
        isValid: false,
        message: `Fields not satisfied: ${falseFields.join(', ')}`,
        data: serverData,
      };
    }

    return {
      isValid: true,
      message: 'All verifications passed!',
      data: serverData,
    };
  } catch (error) {
    return {
      isValid: false,
      message: `Failed to connect to child server: ${error.message}`,
    };
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      name: 'Parent Server (SaaS Quest Verification Server)',
      port: PORT,
      status: 'running',
      endpoints: {
        '/verify': 'POST - Verify child server status',
        '/token': 'GET - Get the verification token (for testing)',
      },
    }));
    return;
  }

  if (req.method === 'GET' && req.url === '/token') {
    res.writeHead(200);
    res.end(JSON.stringify({
      token: VERIFICATION_TOKEN,
      note: 'Use this token in your child server as SAAS_QUEST_VERIFICATION_TOKEN',
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/verify') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const { requiredFields = ['server', 'test_field'] } = JSON.parse(body || '{}');
      console.log('\n========================================');
      console.log('Verification request received');
      console.log('Required fields:', requiredFields);
      console.log('========================================');

      const result = await verifyChildServer(requiredFields);

      console.log('\n=== Verification Result ===');
      console.log('Valid:', result.isValid);
      console.log('Message:', result.message);
      console.log('========================================\n');

      res.writeHead(result.isValid ? 200 : 400);
      res.end(JSON.stringify(result, null, 2));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`
========================================
  Parent Server (SaaS Quest Mock)
  Running on http://localhost:${PORT}
========================================

Endpoints:
  GET  /        - Server info
  GET  /token   - Get verification token
  POST /verify  - Verify child server

To test:
  1. Start child server on port 4001
  2. Run: curl -X POST http://localhost:${PORT}/verify -d '{"requiredFields":["server","test_field"]}'

Verification token: ${VERIFICATION_TOKEN}
`);
});
