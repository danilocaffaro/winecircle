#!/usr/bin/env node
/**
 * Wine Circle Push Notification Daemon
 * Reads from /tmp/wc-push-queue.jsonl and sends Web Push notifications
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Load VAPID keys from vault
require('dotenv').config({ path: '/opt/sharevault/tokens.env' });
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('❌ VAPID keys not found in /opt/sharevault/tokens.env');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:admin@winecircle.local',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

const QUEUE_FILE = '/tmp/wc-push-queue.jsonl';

async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log(`✅ Push sent to ${subscription.endpoint.slice(0, 50)}...`);
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — should delete from PB
      console.log(`⚠️  Subscription expired: ${subscription.endpoint.slice(0, 50)}...`);
    } else {
      console.error(`❌ Push failed:`, err.message);
    }
    return false;
  }
}

async function processQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return;

  const content = fs.readFileSync(QUEUE_FILE, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  if (lines.length === 0) return;

  console.log(`📨 Processing ${lines.length} queued notifications...`);

  for (const line of lines) {
    try {
      const job = JSON.parse(line);
      const { title, body, url, subscriptions } = job;

      for (const sub of subscriptions) {
        await sendPush(sub, { title, body, url });
      }
    } catch (err) {
      console.error('❌ Job parse error:', err.message);
    }
  }

  // Clear queue file
  fs.writeFileSync(QUEUE_FILE, '');
  console.log('✅ Queue processed');
}

// Poll every 5 seconds
setInterval(processQueue, 5000);
console.log('🚀 Push daemon started (polling every 5s)');
processQueue(); // Run immediately on start
