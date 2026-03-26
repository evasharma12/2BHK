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
};

module.exports = ChatMessage;
