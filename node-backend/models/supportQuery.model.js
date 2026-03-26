const db = require('../storage/dbConnection');

const SupportQuery = {
  async create({ userId = null, email = null, phone = null, queryText }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO support_queries (user_id, email, phone_number, query_text)
        VALUES (?, ?, ?, ?)
      `;
      db.query(sql, [userId, email, phone, queryText], (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      });
    });
  },
};

module.exports = SupportQuery;
