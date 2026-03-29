/**
 * Manual verification for chat digest behavior (run from node-backend):
 *   node scripts/verify-chat-digest.js
 *
 * Checks:
 * 1) sendChatUnreadDigest skips safely when SMTP is not configured (no throw).
 * 2) runChatUnreadDigest skips when CHAT_DIGEST_ENABLED is not "true".
 * 3) SQL helper: listUnreadInboundTotalsByUser (if DB is reachable).
 *
 * For unread>0 → actual send: set CHAT_DIGEST_ENABLED=true, configure SMTP, ensure
 * users.email_chat_digest=1, seed unread messages, and run:
 *   node -e "require('./services/chatDigest.service').runChatUnreadDigest().then(console.log)"
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const emailService = require('../services/email.service');
const { runChatUnreadDigest } = require('../services/chatDigest.service');
const ChatMessage = require('../models/chatMessage.model');

async function main() {
  const out = { checks: [] };

  // 1) SMTP missing / safe skip
  const prevSmtp = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].map((k) => ({ k, v: process.env[k] }));
  prevSmtp.forEach(({ k }) => {
    delete process.env[k];
  });
  try {
    const r = await emailService.sendChatUnreadDigest({
      toEmail: 'verify@example.com',
      fullName: 'Verify',
      unreadCount: 3,
      appUrl: 'http://localhost:3000',
    });
    if (!r.skipped || r.reason !== 'SMTP config missing') {
      throw new Error(`Expected SMTP skip, got ${JSON.stringify(r)}`);
    }
    out.checks.push('sendChatUnreadDigest: SMTP missing → skipped (no throw)');
  } finally {
    prevSmtp.forEach(({ k, v }) => {
      if (v !== undefined) process.env[k] = v;
    });
  }

  // 2) Digest disabled
  const prevDigest = process.env.CHAT_DIGEST_ENABLED;
  process.env.CHAT_DIGEST_ENABLED = 'false';
  try {
    const r = await runChatUnreadDigest();
    if (!r.skipped || r.reason !== 'CHAT_DIGEST_ENABLED is not true') {
      throw new Error(`Expected digest disabled skip, got ${JSON.stringify(r)}`);
    }
    out.checks.push('runChatUnreadDigest: CHAT_DIGEST_ENABLED false → skipped');
  } finally {
    if (prevDigest === undefined) delete process.env.CHAT_DIGEST_ENABLED;
    else process.env.CHAT_DIGEST_ENABLED = prevDigest;
  }

  // 3) DB + unread query (optional)
  try {
    const rows = await ChatMessage.listUnreadInboundTotalsByUser({ forDigest: false });
    out.checks.push(
      `listUnreadInboundTotalsByUser: ok (${rows.length} user(s) with unread>0 and email)`
    );
  } catch (e) {
    out.checks.push(`listUnreadInboundTotalsByUser: failed — ${e.message}`);
  }
  try {
    const digestRows = await ChatMessage.listUnreadInboundTotalsByUser({ forDigest: true });
    out.checks.push(
      `listUnreadInboundTotalsByUser(forDigest): ok (${digestRows.length} digest-eligible user(s))`
    );
  } catch (e) {
    out.checks.push(
      `listUnreadInboundTotalsByUser(forDigest): failed — ${e.message} (run node storage/createTables.js to add columns)`
    );
  }

  // 4) Digest enabled + SMTP missing: still no throw; skips sends (unread>0 users get skipped, not "sent")
  const prevDigest2 = process.env.CHAT_DIGEST_ENABLED;
  const prevSmtp2 = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].map((k) => ({ k, v: process.env[k] }));
  process.env.CHAT_DIGEST_ENABLED = 'true';
  prevSmtp2.forEach(({ k }) => delete process.env[k]);
  try {
    const r = await runChatUnreadDigest();
    if (!r.ok || !r.stats) throw new Error(`unexpected result ${JSON.stringify(r)}`);
    if (r.stats.sent > 0) throw new Error('expected no sends without SMTP');
    out.checks.push(
      `runChatUnreadDigest with digest enabled, no SMTP: ok (sent=${r.stats.sent}, skipped=${r.stats.skipped}, failed=${r.stats.failed})`
    );
  } finally {
    if (prevDigest2 === undefined) delete process.env.CHAT_DIGEST_ENABLED;
    else process.env.CHAT_DIGEST_ENABLED = prevDigest2;
    prevSmtp2.forEach(({ k, v }) => {
      if (v !== undefined) process.env[k] = v;
    });
  }

  console.log(JSON.stringify({ success: true, ...out }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
