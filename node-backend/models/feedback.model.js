const db = require('../storage/dbConnection');

const Feedback = {
  async create({ userId = null, email = null, phone = null, feedbackText }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO feedback_submissions (user_id, email, phone_number, feedback_text)
        VALUES (?, ?, ?, ?)
      `;
      db.query(sql, [userId, email, phone, feedbackText], (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      });
    });
  },
};

module.exports = Feedback;
