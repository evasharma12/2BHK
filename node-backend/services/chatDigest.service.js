const cron = require('node-cron');
const ChatMessage = require('../models/chatMessage.model');
const User = require('../models/user.model');
const { sendChatUnreadDigest, resolveAppPublicUrl } = require('./email.service');

/**
 * Sends one digest email per eligible user with unread inbound messages.
 * Safe to call from cron or a one-off script.
 */
async function runChatUnreadDigest() {
  if (process.env.CHAT_DIGEST_ENABLED !== 'true') {
    return { skipped: true, reason: 'CHAT_DIGEST_ENABLED is not true' };
  }

  const appUrl = resolveAppPublicUrl();
  const recipients = await ChatMessage.listUnreadInboundTotalsByUser({ forDigest: true });

  const stats = { sent: 0, skipped: 0, failed: 0 };
  for (const row of recipients) {
    try {
      // Always use current users.email (login identifier) for this user_id, not only the aggregate join.
      const user = await User.findById(row.user_id);
      const toEmail = user?.email ? String(user.email).trim() : '';
      const fullName = user?.full_name ?? row.full_name;
      if (!toEmail) {
        stats.skipped += 1;
        continue;
      }

      const result = await sendChatUnreadDigest({
        toEmail,
        fullName,
        unreadCount: row.unread_total,
        appUrl,
      });
      if (result.sent) {
        stats.sent += 1;
        await User.updateLastChatDigestSentAt(row.user_id);
      } else {
        stats.skipped += 1;
      }
    } catch (err) {
      stats.failed += 1;
      console.error(`Chat digest: failed for user_id=${row.user_id}:`, err.message || err);
    }
  }

  return {
    ok: true,
    stats,
    recipientCount: recipients.length,
  };
}

/**
 * Schedules the daily digest using node-cron.
 *
 * Ops: If you run multiple Node processes behind a load balancer, each instance
 * will execute this schedule and can send duplicate digests. Use a single worker,
 * EventBridge + Lambda, or a distributed lock (e.g. Redis) before scaling horizontally.
 */
function registerChatDigestCron() {
  if (process.env.CHAT_DIGEST_ENABLED !== 'true') {
    console.log('Chat digest cron: disabled (set CHAT_DIGEST_ENABLED=true to enable).');
    return;
  }

  const expression = (process.env.CHAT_DIGEST_CRON || '0 9 * * *').trim();
  if (!cron.validate(expression)) {
    console.error('Chat digest cron: invalid CHAT_DIGEST_CRON:', expression);
    return;
  }

  cron.schedule(expression, () => {
    runChatUnreadDigest().catch((err) => {
      console.error('Chat digest cron run failed:', err);
    });
  });

  console.log(
    `Chat digest cron: scheduled (${expression}, server local timezone unless TZ is set). ` +
      'Multiple app replicas each run this job — duplicate emails are possible; use one worker or a lock when horizontal scaling.'
  );
}

module.exports = {
  runChatUnreadDigest,
  registerChatDigestCron,
};
