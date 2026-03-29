const db = require('../storage/dbConnection');
const ChatThread = require('./chatThread.model');

const ChatMessage = {
  async listByThread(threadId, options = {}) {
    const limitInput = Number(options.limit);
    const limit =
      Number.isFinite(limitInput) && limitInput > 0
        ? Math.min(Math.floor(limitInput), 100)
        : 30;
    const beforeInput = Number(options.before);
    const hasBefore = Number.isFinite(beforeInput) && beforeInput > 0;

    return new Promise((resolve, reject) => {
      const params = [threadId];
      let beforeClause = '';
      if (hasBefore) {
        beforeClause = 'AND message_id < ?';
        params.push(Math.floor(beforeInput));
      }
      params.push(limit);

      const sql = `
        SELECT
          message_id,
          thread_id,
          sender_user_id,
          message_text,
          message_type,
          is_read,
          created_at
        FROM chat_messages
        WHERE thread_id = ?
          ${beforeClause}
        ORDER BY message_id DESC
        LIMIT ?
      `;

      db.query(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows.reverse());
      });
    });
  },

  async create(threadId, senderUserId, messageText, messageType = 'text') {
    return new Promise((resolve, reject) => {
      db.getConnection((connErr, conn) => {
        if (connErr) return reject(connErr);

        conn.beginTransaction((txErr) => {
          if (txErr) {
            conn.release();
            return reject(txErr);
          }

          const insertSql = `
            INSERT INTO chat_messages (thread_id, sender_user_id, message_text, message_type)
            VALUES (?, ?, ?, ?)
          `;

          conn.query(
            insertSql,
            [threadId, senderUserId, messageText, messageType],
            async (insertErr, result) => {
              if (insertErr) {
                return conn.rollback(() => {
                  conn.release();
                  reject(insertErr);
                });
              }

              try {
                await ChatThread.touchLastMessage(threadId, messageText, conn);

                conn.commit((commitErr) => {
                  if (commitErr) {
                    return conn.rollback(() => {
                      conn.release();
                      reject(commitErr);
                    });
                  }

                  conn.release();
                  resolve(result.insertId);
                });
              } catch (updateErr) {
                conn.rollback(() => {
                  conn.release();
                  reject(updateErr);
                });
              }
            }
          );
        });
      });
    });
  },

  async findById(messageId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          message_id,
          thread_id,
          sender_user_id,
          message_text,
          message_type,
          is_read,
          created_at
        FROM chat_messages
        WHERE message_id = ?
        LIMIT 1
      `;
      db.query(sql, [messageId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      });
    });
  },

  async markThreadReadByUser(threadId, userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE chat_messages
        SET is_read = 1
        WHERE thread_id = ?
          AND sender_user_id != ?
          AND is_read = 0
      `;
      db.query(sql, [threadId, userId], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows || 0);
      });
    });
  },

  /**
   * Per-user counts of unread inbound messages (recipient = other party in thread).
   * @param {object} [options]
   * @param {boolean} [options.forDigest=false] — if true, only users with non-empty email,
   *   email_chat_digest enabled, and not sent a digest in the last 24 hours.
   * @returns {Promise<Array<{ user_id: number, email: string, full_name: string | null, unread_total: number }>>}
   */
  async listUnreadInboundTotalsByUser(options = {}) {
    const forDigest = Boolean(options.forDigest);
    const digestClause = forDigest
      ? `
        AND COALESCE(u.email_chat_digest, TRUE) = TRUE
        AND (
          u.last_chat_digest_sent_at IS NULL
          OR u.last_chat_digest_sent_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        )
      `
      : '';

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          u.user_id,
          u.email,
          u.full_name,
          COUNT(*) AS unread_total
        FROM chat_messages m
        INNER JOIN chat_threads t ON t.thread_id = m.thread_id
        INNER JOIN users u ON u.user_id = CASE
          WHEN m.sender_user_id = t.owner_user_id THEN t.participant_user_id
          ELSE t.owner_user_id
        END
        WHERE m.is_read = 0
          AND u.email IS NOT NULL
          AND TRIM(u.email) <> ''
          ${digestClause}
        GROUP BY u.user_id, u.email, u.full_name
        HAVING COUNT(*) > 0
      `;
      db.query(sql, (err, rows) => {
        if (err) return reject(err);
        const mapped = (rows || []).map((row) => ({
          user_id: row.user_id,
          email: row.email,
          full_name: row.full_name,
          unread_total: Number(row.unread_total) || 0,
        }));
        resolve(mapped);
      });
    });
  },
};

module.exports = ChatMessage;
