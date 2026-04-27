const db = require('../storage/dbConnection');

const ChatThread = {
  async getPropertyOwner(propertyId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          p.property_id,
          p.owner_id,
          p.chat_owner_user_id,
          COALESCE(p.chat_owner_user_id, p.owner_id) AS effective_owner_user_id
        FROM properties p
        WHERE p.property_id = ? AND p.status = 'active'
        LIMIT 1
      `;
      db.query(sql, [propertyId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      });
    });
  },

  async createOrGet(propertyId, ownerUserId, participantUserId) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO chat_threads (property_id, owner_user_id, participant_user_id)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          thread_id = LAST_INSERT_ID(thread_id),
          updated_at = updated_at
      `;
      db.query(sql, [propertyId, ownerUserId, participantUserId], (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      });
    });
  },

  async findById(threadId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT *
        FROM chat_threads
        WHERE thread_id = ?
        LIMIT 1
      `;
      db.query(sql, [threadId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      });
    });
  },

  async findByIdForUser(threadId, userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT *
        FROM chat_threads
        WHERE thread_id = ?
          AND (owner_user_id = ? OR participant_user_id = ?)
        LIMIT 1
      `;
      db.query(sql, [threadId, userId, userId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      });
    });
  },

  async listForUser(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          t.thread_id,
          t.property_id,
          t.owner_user_id,
          t.participant_user_id,
          t.last_message_at,
          t.last_message_text,
          t.created_at,
          t.updated_at,
          p.bhk_type,
          p.locality,
          p.city,
          p.property_for,
          p.property_type,
          p.expected_price,
          CASE
            WHEN t.owner_user_id = ? THEN participant.full_name
            ELSE owner.full_name
          END AS other_user_name,
          (
            SELECT COUNT(*)
            FROM chat_messages m
            WHERE m.thread_id = t.thread_id
              AND m.sender_user_id != ?
              AND m.is_read = 0
          ) AS unread_count
        FROM chat_threads t
        JOIN properties p ON p.property_id = t.property_id
        JOIN users owner ON owner.user_id = t.owner_user_id
        JOIN users participant ON participant.user_id = t.participant_user_id
        WHERE t.owner_user_id = ? OR t.participant_user_id = ?
        ORDER BY COALESCE(t.last_message_at, t.updated_at, t.created_at) DESC
      `;
      db.query(sql, [userId, userId, userId, userId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  async touchLastMessage(threadId, lastMessageText, conn = db) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE chat_threads
        SET last_message_text = ?, last_message_at = NOW(), updated_at = NOW()
        WHERE thread_id = ?
      `;
      conn.query(sql, [lastMessageText, threadId], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },
};

module.exports = ChatThread;
