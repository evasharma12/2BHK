const bcrypt = require('bcrypt');
const db = require('../storage/dbConnection');

// Number of salt rounds for password hashing
const SALT_ROUNDS = 10;

const User = {
  // Check if an email is already registered
  async emailExists(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT 1 FROM users WHERE email = ? LIMIT 1';
      db.query(sql, [email], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0);
      });
    });
  },

  // Check if a username is already taken
  async usernameExists(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT 1 FROM users WHERE username = ? LIMIT 1';
      db.query(sql, [username], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0);
      });
    });
  },

  // Create a new user (and optional phone numbers)
  async create({ username, email, password, user_type, full_name, phone_numbers }) {
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    return new Promise((resolve, reject) => {
      db.getConnection((connErr, conn) => {
        if (connErr) return reject(connErr);

        const release = (fn) => (err, ...args) => {
          conn.release();
          if (fn) fn(err, ...args);
        };

        conn.beginTransaction((txErr) => {
          if (txErr) {
            conn.release();
            return reject(txErr);
          }

          const insertUserSql = `
            INSERT INTO users (username, email, password_hash, user_type, full_name)
            VALUES (?, ?, ?, ?, ?)
          `;

          conn.query(
            insertUserSql,
            [username, email, passwordHash, user_type || 'renter', full_name || null],
            (userErr, result) => {
              if (userErr) {
                return conn.rollback(() => {
                  conn.release();
                  reject(userErr);
                });
              }

              const userId = result.insertId;

              // If no phone numbers provided, just commit
              if (!phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
                return conn.commit((commitErr) => {
                  if (commitErr) {
                    return conn.rollback(() => {
                      conn.release();
                      reject(commitErr);
                    });
                  }
                  conn.release();
                  resolve(userId);
                });
              }

              // Insert phone numbers
              const insertPhoneSql = `
                INSERT INTO user_phones (user_id, phone_number, is_primary)
                VALUES ?
              `;

              const values = phone_numbers.map((num, index) => [
                userId,
                num,
                index === 0 // first number as primary
              ]);

              conn.query(insertPhoneSql, [values], (phoneErr) => {
                if (phoneErr) {
                  return conn.rollback(() => {
                    conn.release();
                    reject(phoneErr);
                  });
                }

                conn.commit((commitErr) => {
                  if (commitErr) {
                    return conn.rollback(() => {
                      conn.release();
                      reject(commitErr);
                    });
                  }
                  conn.release();
                  resolve(userId);
                });
              });
            }
          );
        });
      });
    });
  },

  // Find a user by ID
  async findById(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE user_id = ? LIMIT 1';
      db.query(sql, [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      });
    });
  },

  // Find a user by ID and include comma-separated phone numbers
  async findByIdWithPhones(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          u.*,
          GROUP_CONCAT(up.phone_number ORDER BY up.is_primary DESC SEPARATOR ',') AS phone_numbers,
          CASE WHEN MAX(CASE WHEN au.is_active = 1 THEN 1 ELSE 0 END) = 1 THEN 1 ELSE 0 END AS is_admin
        FROM users u
        LEFT JOIN user_phones up ON u.user_id = up.user_id
        LEFT JOIN admin_users au ON u.user_id = au.user_id
        WHERE u.user_id = ?
        GROUP BY u.user_id
        LIMIT 1
      `;
      db.query(sql, [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      });
    });
  },

  // Find a user by email (used for login)
  async findByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
      db.query(sql, [email], (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      });
    });
  },

  // Verify password against stored hash
  async verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
  },

  // Update last_login timestamp
  async updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET last_login = NOW() WHERE user_id = ?';
      db.query(sql, [userId], (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  },

  // Update user_type (e.g. upgrade renter/buyer to 'both' when they post a property)
  async updateUserType(userId, userType) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET user_type = ? WHERE user_id = ?';
      db.query(sql, [userType, userId], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  // --- Saved properties (for renters/buyers) ---
  async getSavedProperties(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          p.property_id,
          p.property_for,
          p.property_type,
          p.bhk_type,
          p.locality,
          p.city,
          p.expected_price,
          p.built_up_area,
          p.carpet_area,
          p.furnishing,
          p.status,
          p.created_at,
          (SELECT pi.image_url FROM property_images pi WHERE pi.property_id = p.property_id ORDER BY pi.image_order ASC, pi.image_id ASC LIMIT 1) AS cover_image
        FROM saved_properties sp
        JOIN properties p ON sp.property_id = p.property_id AND p.status = 'active'
        WHERE sp.user_id = ?
        ORDER BY sp.saved_at DESC
      `;
      db.query(sql, [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },

  async addSavedProperty(userId, propertyId) {
    return new Promise((resolve, reject) => {
      db.query(
        'INSERT IGNORE INTO saved_properties (user_id, property_id) VALUES (?, ?)',
        [userId, propertyId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  async removeSavedProperty(userId, propertyId) {
    return new Promise((resolve, reject) => {
      db.query(
        'DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?',
        [userId, propertyId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  async isPropertySavedByUser(userId, propertyId) {
    return new Promise((resolve, reject) => {
      db.query(
        'SELECT 1 FROM saved_properties WHERE user_id = ? AND property_id = ? LIMIT 1',
        [userId, propertyId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0);
        }
      );
    });
  },

  // Used by Google auth to create / update users
  async createOrUpdateFromGoogle(googleData) {
    const { email, name, picture, googleId, emailVerified } = googleData;

    return new Promise((resolve, reject) => {
      // Check if user already exists
      const selectSql = 'SELECT user_id FROM users WHERE email = ? LIMIT 1';
      db.query(selectSql, [email], (selectErr, results) => {
        if (selectErr) return reject(selectErr);

        if (results.length > 0) {
          const userId = results[0].user_id;
          // When Google marks the email verified, persist that email on the row (same address used for login / digests).
          const updateSql =
            emailVerified === true
              ? `
            UPDATE users
            SET full_name = COALESCE(?, full_name),
                profile_image = COALESCE(?, profile_image),
                is_verified = TRUE,
                email = ?
            WHERE user_id = ?
          `
              : `
            UPDATE users
            SET full_name = COALESCE(?, full_name),
                profile_image = COALESCE(?, profile_image),
                is_verified = TRUE
            WHERE user_id = ?
          `;
          const params =
            emailVerified === true
              ? [name || null, picture || null, email, userId]
              : [name || null, picture || null, userId];
          db.query(updateSql, params, (updateErr) => {
            if (updateErr) return reject(updateErr);
            resolve(userId);
          });
        } else {
          // Create a new user from Google
          const insertSql = `
            INSERT INTO users (username, email, password_hash, user_type, full_name, profile_image, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, TRUE)
          `;

          // Generate a dummy password hash (user logs in via Google, not password)
          bcrypt.hash(googleId, SALT_ROUNDS).then((dummyHash) => {
            const username = email.split('@')[0];

            db.query(
              insertSql,
              [username, email, dummyHash, 'renter', name || null, picture || null],
              (insertErr, result) => {
                if (insertErr) return reject(insertErr);
                resolve(result.insertId);
              }
            );
          }).catch(reject);
        }
      });
    });
  },

  async updateLastChatDigestSentAt(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE users
        SET last_chat_digest_sent_at = NOW()
        WHERE user_id = ?
      `;
      db.query(sql, [userId], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },
};

module.exports = User;

