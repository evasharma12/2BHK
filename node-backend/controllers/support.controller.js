const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const SupportQuery = require('../models/supportQuery.model');
const { sendSupportQueryNotification } = require('../services/email.service');

function getOptionalAuthUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded?.user_id || null;
  } catch {
    return null;
  }
}

class SupportController {
  static async submitQuery(req, res) {
    try {
      const queryText = String(req.body?.query_text || '').trim();
      if (!queryText) {
        return res.status(400).json({
          success: false,
          message: 'query_text is required',
        });
      }
      if (queryText.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'query_text should be 2000 characters or less',
        });
      }

      const userId = getOptionalAuthUserId(req);
      let email = null;
      let phone = null;

      if (userId) {
        const user = await User.findByIdWithPhones(userId);
        email = user?.email || null;
        const phones = String(user?.phone_numbers || '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
        phone = phones[0] || null;
      }

      const queryId = await SupportQuery.create({
        userId,
        email,
        phone,
        queryText,
      });

      // Respond immediately after DB save; email notification runs in background.
      res.status(201).json({
        success: true,
        message: 'Support query submitted',
        data: { query_id: queryId },
      });

      setImmediate(async () => {
        try {
          const result = await sendSupportQueryNotification({ queryId, queryText, email, phone, userId });
          if (result?.sent) {
            console.log(`Support email sent for query #${queryId}`);
          } else if (result?.skipped) {
            console.warn(
              `Support email skipped for query #${queryId}: ${result.reason || 'unknown reason'}`
            );
          } else {
            console.warn(`Support email not sent for query #${queryId}`);
          }
        } catch (emailError) {
          console.error(`Support email failed for query #${queryId}:`, emailError.message);
        }
      });
      return;
    } catch (error) {
      console.error('Submit support query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit support query',
      });
    }
  }
}

module.exports = SupportController;
