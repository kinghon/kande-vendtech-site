/**
 * Quo SMS Bridge for Clawdbot
 * 
 * Simple webhook bridge that:
 * 1. Receives incoming SMS from Quo webhooks
 * 2. Sends to Clawdbot via CLI
 * 3. Returns response via Quo API
 */

require('dotenv').config();
const express = require('express');
const { execSync, spawn } = require('child_process');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;
const QUO_API_KEY = process.env.QUO_API_KEY || '96lMlU3NWoa7HBFrtqaUGtWD7t395pKk';
const QUO_FROM_NUMBER = process.env.QUO_FROM_NUMBER || '+17252278288';
const ALLOWED_NUMBERS = (process.env.ALLOWED_NUMBERS || '+12013211968').split(',');

// Send SMS via Quo API
async function sendSms(to, message) {
  console.log(`[QUO] Sending SMS to ${to}: ${message.substring(0, 50)}...`);
  
  const response = await fetch('https://api.openphone.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': QUO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: message,
      from: QUO_FROM_NUMBER,
      to: [to],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[QUO] API error: ${response.status}`, error);
    throw new Error(`Quo API error: ${response.status}`);
  }

  const result = await response.json();
  console.log(`[QUO] SMS sent, ID: ${result.data?.id}`);
  return result;
}

// Get response from Clawdbot
async function askClawdbot(message, senderId) {
  console.log(`[CLAWDBOT] Processing: ${message.substring(0, 50)}...`);
  
  return new Promise((resolve, reject) => {
    // Use clawdbot CLI to send message and get response
    const child = spawn('clawdbot', ['message', 'send', '--to', 'main', '--wait', message], {
      timeout: 120000,
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[CLAWDBOT] CLI error: ${stderr}`);
        reject(new Error(`Clawdbot CLI error: ${stderr}`));
        return;
      }
      
      // Parse the response
      const response = stdout.trim();
      console.log(`[CLAWDBOT] Response: ${response.substring(0, 100)}...`);
      resolve(response);
    });
    
    child.on('error', (error) => {
      console.error(`[CLAWDBOT] Spawn error:`, error);
      reject(error);
    });
  });
}

// Alternative: Use Clawdbot gateway API directly
async function askClawdbotApi(message, senderId) {
  console.log(`[CLAWDBOT] Processing via API: ${message.substring(0, 50)}...`);
  
  // Get gateway token from config
  const configPath = `${process.env.HOME}/.clawdbot/clawdbot.json`;
  const config = require(configPath);
  const token = config.gateway?.auth?.token;
  
  if (!token) {
    throw new Error('Gateway token not found in config');
  }

  const response = await fetch('http://localhost:5150/api/sessions/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionKey: `quo:${senderId}`,
      message: message,
      timeoutSeconds: 120,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gateway API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.response || result.text || 'No response';
}

// Webhook endpoint for Quo
app.post('/webhooks/quo', async (req, res) => {
  try {
    const payload = req.body;
    console.log(`[WEBHOOK] Received:`, JSON.stringify(payload).substring(0, 200));

    // Only process incoming messages
    if (payload.type !== 'message.received' && payload.type !== 'message.created') {
      console.log(`[WEBHOOK] Ignoring event type: ${payload.type}`);
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const message = payload.data?.object;
    if (!message || message.direction !== 'incoming') {
      console.log(`[WEBHOOK] Ignoring outgoing or invalid message`);
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const from = message.from;
    const body = message.body;

    console.log(`[WEBHOOK] SMS from ${from}: ${body}`);

    // Check if sender is allowed
    const normalizedFrom = from.replace(/\D/g, '');
    const isAllowed = ALLOWED_NUMBERS.some(allowed => {
      const normalizedAllowed = allowed.replace(/\D/g, '');
      return normalizedFrom.includes(normalizedAllowed) || normalizedAllowed.includes(normalizedFrom);
    });

    if (!isAllowed) {
      console.log(`[WEBHOOK] Sender ${from} not in allowlist`);
      res.status(200).json({ ok: true, ignored: true, reason: 'not allowed' });
      return;
    }

    // Acknowledge webhook immediately
    res.status(200).json({ ok: true, processing: true });

    // Process message async
    try {
      const response = await askClawdbotApi(body, from);
      await sendSms(from, response);
    } catch (error) {
      console.error(`[ERROR] Failed to process message:`, error);
      try {
        await sendSms(from, `Sorry, I encountered an error: ${error.message}`);
      } catch (e) {
        console.error(`[ERROR] Failed to send error message:`, e);
      }
    }
  } catch (error) {
    console.error(`[ERROR] Webhook handler error:`, error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'quo-bridge' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔗 Quo Bridge running at http://localhost:${PORT}`);
  console.log(`   Webhook URL: http://localhost:${PORT}/webhooks/quo`);
  console.log(`   From number: ${QUO_FROM_NUMBER}`);
  console.log(`   Allowed: ${ALLOWED_NUMBERS.join(', ')}`);
});
