const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Feedback = require('../models/feedback.model');
const { sendFeedbackNotification } = require('../services/email.service');

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

class FeedbackController {
  static async submitFeedback(req, res) {
    try {
      const feedbackText = String(req.body?.feedback_text || '').trim();
      if (!feedbackText) {
        return res.status(400).json({
          success: false,
          message: 'feedback_text is required',
        });
      }
      if (feedbackText.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'feedback_text should be 2000 characters or less',
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

      const feedbackId = await Feedback.create({
        userId,
        email,
        phone,
        feedbackText,
      });

      res.status(201).json({
        success: true,
        message: 'Feedback submitted',
        data: { feedback_id: feedbackId },
      });

      setImmediate(async () => {
        try {
          const result = await sendFeedbackNotification({ feedbackId, feedbackText, email, phone, userId });
          if (result?.sent) {
            console.log(`Feedback email sent for submission #${feedbackId}`);
          } else if (result?.skipped) {
            console.warn(
              `Feedback email skipped for submission #${feedbackId}: ${result.reason || 'unknown reason'}`
            );
          } else {
            console.warn(`Feedback email not sent for submission #${feedbackId}`);
          }
        } catch (emailError) {
          console.error(`Feedback email failed for submission #${feedbackId}:`, emailError.message);
        }
      });
      return;
    } catch (error) {
      console.error('Submit feedback error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit feedback',
      });
    }
  }
}

module.exports = FeedbackController;
