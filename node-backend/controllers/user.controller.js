const db = require('../storage/dbConnection');
const User = require('../models/user.model');

function ensureOwnUser(req, res) {
  const userId = req.params.id;
  const authUserId = req.user?.user_id;
  if (!authUserId || String(authUserId) !== String(userId)) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return false;
  }
  return true;
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

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
        });
      }

      // Check if a primary phone already exists
      const selectSql = `
        SELECT phone_id
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
          const updateSql = `
            UPDATE user_phones
            SET phone_number = ?
            WHERE phone_id = ?
          `;

          db.query(updateSql, [phone_number, phoneId], (updateErr) => {
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

          db.query(insertSql, [userId, phone_number], (insertErr) => {
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

