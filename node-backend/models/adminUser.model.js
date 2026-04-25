const db = require('../storage/dbConnection');

const AdminUser = {
  async isActiveAdmin(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 1
        FROM admin_users
        WHERE user_id = ? AND is_active = 1
        LIMIT 1
      `;
      db.query(sql, [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0);
      });
    });
  },
};

module.exports = AdminUser;
