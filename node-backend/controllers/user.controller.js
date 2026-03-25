const db = require('../storage/dbConnection');
const User = require('../models/user.model');
const { verifyFirebaseIdToken } = require('../services/firebaseAdmin');

function ensureOwnUser(req, res) {
  const userId = req.params.id;
  const authUserId = req.user?.user_id;
  if (!authUserId || String(authUserId) !== String(userId)) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return false;
  }
  return true;
}

function normalizePhoneNumber(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

function toE164India(phone10) {
  return `+91${phone10}`;
}

class UserController {
  // Update basic profile fields (name, user_type)
  static async updateProfile(req, res) {
    try {
      const userId = req.params.id;
      const { full_name, user_type } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      if (!full_name || !user_type) {
        return res.status(400).json({
          success: false,
          message: 'Full name and user type are required',
        });
      }

      const sql = `
        UPDATE users
        SET full_name = ?, user_type = ?
        WHERE user_id = ?
      `;

      db.query(sql, [full_name, user_type, userId], async (err, result) => {
        if (err) {
          console.error('Update profile error:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to update profile',
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }

        try {
          const user = await User.findByIdWithPhones(userId);
          if (user) {
            delete user.password_hash;
          }

          return res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user,
          });
        } catch (fetchErr) {
          console.error('Fetch updated user error:', fetchErr);
          return res.status(500).json({
            success: false,
            message: 'Profile updated but failed to fetch user data',
          });
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }

  // Update primary phone number
  static async updatePhone(req, res) {
    try {
      const userId = req.params.id;
      const { phone_number } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const normalizedPhone = normalizePhoneNumber(phone_number);
      if (!normalizedPhone || normalizedPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Valid 10-digit phone number is required',
        });
      }

      // Check if a primary phone already exists
      const selectSql = `
        SELECT phone_id, phone_number, is_verified
        FROM user_phones
        WHERE user_id = ? AND is_primary = 1
        LIMIT 1
      `;

      db.query(selectSql, [userId], (selectErr, results) => {
        if (selectErr) {
          console.error('Select phone error:', selectErr);
          return res.status(500).json({
            success: false,
            message: 'Failed to update phone number',
          });
        }

        if (results.length > 0) {
          // Update existing primary phone
          const phoneId = results[0].phone_id;
          const existingPhone = normalizePhoneNumber(results[0].phone_number);
          const keepVerified = existingPhone === normalizedPhone && !!results[0].is_verified;
          const updateSql = `
            UPDATE user_phones
            SET phone_number = ?, is_verified = ?
            WHERE phone_id = ?
          `;

          db.query(updateSql, [normalizedPhone, keepVerified ? 1 : 0, phoneId], (updateErr) => {
            if (updateErr) {
              console.error('Update phone error:', updateErr);
              return res.status(500).json({
                success: false,
                message: 'Failed to update phone number',
              });
            }

            return res.json({
              success: true,
              message: 'Phone number updated successfully',
            });
          });
        } else {
          // Insert new primary phone
          const insertSql = `
            INSERT INTO user_phones (user_id, phone_number, is_primary)
            VALUES (?, ?, 1)
          `;

          db.query(insertSql, [userId, normalizedPhone], (insertErr) => {
            if (insertErr) {
              console.error('Insert phone error:', insertErr);
              return res.status(500).json({
                success: false,
                message: 'Failed to update phone number',
              });
            }

            return res.json({
              success: true,
              message: 'Phone number updated successfully',
            });
          });
        }
      });
    } catch (error) {
      console.error('Update phone error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update phone number',
      });
    }
  }

  // Check if the provided phone is already verified for this user.
  static async getPhoneVerificationStatus(req, res) {
    try {
      if (!ensureOwnUser(req, res)) return;
      const userId = req.params.id;
      const phone = normalizePhoneNumber(req.query.phone_number);

      if (!phone || phone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Valid 10-digit phone number is required',
        });
      }

      const sql = `
        SELECT phone_number, is_verified
        FROM user_phones
        WHERE user_id = ? AND is_primary = 1
        LIMIT 1
      `;

      db.query(sql, [userId], (err, rows) => {
        if (err) {
          console.error('Phone verification status error:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to check phone verification status',
          });
        }

        const row = rows && rows.length ? rows[0] : null;
        const storedPhone = row ? normalizePhoneNumber(row.phone_number) : '';
        const isVerified = !!(row && row.is_verified);
        const needsVerification = !(storedPhone === phone && isVerified);

        return res.json({
          success: true,
          data: {
            is_verified: storedPhone === phone ? isVerified : false,
            needs_verification: needsVerification,
          },
        });
      });
    } catch (error) {
      console.error('Phone verification status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check phone verification status',
      });
    }
  }

  // Mark phone as verified after Firebase OTP check.
  static async verifyPhoneOtp(req, res) {
    try {
      if (!ensureOwnUser(req, res)) return;
      const userId = req.params.id;
      const { phone_number, firebase_id_token } = req.body || {};

      const normalizedPhone = normalizePhoneNumber(phone_number);
      if (!normalizedPhone || normalizedPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Valid 10-digit phone number is required',
        });
      }
      if (!firebase_id_token) {
        return res.status(400).json({
          success: false,
          message: 'firebase_id_token is required',
        });
      }

      const decoded = await verifyFirebaseIdToken(firebase_id_token);
      const firebasePhone = normalizePhoneNumber(decoded.phone_number);
      if (!firebasePhone || firebasePhone !== normalizedPhone) {
        return res.status(400).json({
          success: false,
          message: 'OTP was verified for a different phone number',
        });
      }

      const selectSql = `
        SELECT phone_id
        FROM user_phones
        WHERE user_id = ? AND is_primary = 1
        LIMIT 1
      `;

      db.query(selectSql, [userId], (selectErr, rows) => {
        if (selectErr) {
          console.error('Verify phone select error:', selectErr);
          return res.status(500).json({
            success: false,
            message: 'Failed to verify phone number',
          });
        }

        if (rows && rows.length) {
          const updateSql = `
            UPDATE user_phones
            SET phone_number = ?, is_verified = 1
            WHERE phone_id = ?
          `;
          db.query(updateSql, [normalizedPhone, rows[0].phone_id], (updateErr) => {
            if (updateErr) {
              console.error('Verify phone update error:', updateErr);
              return res.status(500).json({
                success: false,
                message: 'Failed to verify phone number',
              });
            }
            return res.json({
              success: true,
              message: 'Phone number verified successfully',
              data: { is_verified: true, phone_number: toE164India(normalizedPhone) },
            });
          });
        } else {
          const insertSql = `
            INSERT INTO user_phones (user_id, phone_number, is_primary, is_verified)
            VALUES (?, ?, 1, 1)
          `;
          db.query(insertSql, [userId, normalizedPhone], (insertErr) => {
            if (insertErr) {
              console.error('Verify phone insert error:', insertErr);
              return res.status(500).json({
                success: false,
                message: 'Failed to verify phone number',
              });
            }
            return res.json({
              success: true,
              message: 'Phone number verified successfully',
              data: { is_verified: true, phone_number: toE164India(normalizedPhone) },
            });
          });
        }
      });
    } catch (error) {
      console.error('Verify phone OTP error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify phone number',
      });
    }
  }

  static async getSavedProperties(req, res) {
    try {
      if (!ensureOwnUser(req, res)) return;
      const userId = req.params.id;
      const properties = await User.getSavedProperties(userId);
      return res.json({ success: true, data: properties });
    } catch (error) {
      console.error('Get saved properties error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch saved properties',
      });
    }
  }

  static async checkSavedProperty(req, res) {
    try {
      if (!ensureOwnUser(req, res)) return;
      const userId = req.params.id;
      const propertyId = req.params.propertyId;
      const saved = await User.isPropertySavedByUser(userId, propertyId);
      return res.json({ success: true, data: { saved } });
    } catch (error) {
      console.error('Check saved property error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check saved status',
      });
    }
  }

  static async saveProperty(req, res) {
    try {
      if (!ensureOwnUser(req, res)) return;
      const userId = req.params.id;
      const { property_id } = req.body;
      if (!property_id) {
        return res.status(400).json({
          success: false,
          message: 'property_id is required',
        });
      }
      const added = await User.addSavedProperty(userId, property_id);
      return res.json({
        success: true,
        message: added ? 'Property saved' : 'Already saved',
        data: { saved: true },
      });
    } catch (error) {
      console.error('Save property error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save property',
      });
    }
  }

  static async unsaveProperty(req, res) {
    try {
      if (!ensureOwnUser(req, res)) return;
      const userId = req.params.id;
      const propertyId = req.params.propertyId;
      await User.removeSavedProperty(userId, propertyId);
      return res.json({
        success: true,
        message: 'Property removed from saved',
        data: { saved: false },
      });
    } catch (error) {
      console.error('Unsave property error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove saved property',
      });
    }
  }
}

module.exports = UserController;

