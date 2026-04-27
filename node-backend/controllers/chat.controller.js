const ChatThread = require('../models/chatThread.model');
const ChatMessage = require('../models/chatMessage.model');
const { emitNewMessage, emitReadReceipt } = require('../services/chatRealtime.service');

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

class ChatController {
  static async createOrGetThread(req, res) {
    try {
      const currentUserId = req.user?.user_id;
      const propertyId = parsePositiveInt(req.body?.property_id);

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!propertyId) {
        return res.status(400).json({
          success: false,
          message: 'property_id is required and must be a positive integer',
        });
      }

      const property = await ChatThread.getPropertyOwner(propertyId);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found',
        });
      }

      const ownerUserId = Number(property.effective_owner_user_id || 0);
      if (!ownerUserId) {
        return res.status(400).json({
          success: false,
          message:
            'This listing does not have a chat owner configured yet. Please contact support.',
        });
      }
      if (Number(ownerUserId) === Number(currentUserId)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot start a chat with your own property',
        });
      }

      const threadId = await ChatThread.createOrGet(propertyId, ownerUserId, currentUserId);
      const thread = await ChatThread.findByIdForUser(threadId, currentUserId);

      return res.status(201).json({
        success: true,
        data: thread,
      });
    } catch (error) {
      console.error('Create or get thread error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create or get chat thread',
      });
    }
  }

  static async getThreads(req, res) {
    try {
      const currentUserId = req.user?.user_id;
      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const threads = await ChatThread.listForUser(currentUserId);
      return res.json({
        success: true,
        data: threads,
      });
    } catch (error) {
      console.error('Get threads error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch chat threads',
      });
    }
  }

  static async getThreadMessages(req, res) {
    try {
      const currentUserId = req.user?.user_id;
      const threadId = parsePositiveInt(req.params.threadId);
      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
      if (!threadId) {
        return res.status(400).json({
          success: false,
          message: 'threadId must be a positive integer',
        });
      }

      const thread = await ChatThread.findByIdForUser(threadId, currentUserId);
      if (!thread) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this thread',
        });
      }

      const messages = await ChatMessage.listByThread(threadId, {
        before: req.query.before,
        limit: req.query.limit,
      });

      return res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      console.error('Get thread messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch chat messages',
      });
    }
  }

  static async sendMessage(req, res) {
    try {
      const currentUserId = req.user?.user_id;
      const threadId = parsePositiveInt(req.params.threadId);
      const messageText = String(req.body?.message_text || '').trim();
      const messageType = req.body?.message_type || 'text';

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
      if (!threadId) {
        return res.status(400).json({
          success: false,
          message: 'threadId must be a positive integer',
        });
      }
      if (!messageText) {
        return res.status(400).json({
          success: false,
          message: 'message_text is required',
        });
      }
      if (messageType !== 'text') {
        return res.status(400).json({
          success: false,
          message: 'Unsupported message_type',
        });
      }

      const thread = await ChatThread.findByIdForUser(threadId, currentUserId);
      if (!thread) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to send messages in this thread',
        });
      }

      const messageId = await ChatMessage.create(threadId, currentUserId, messageText, messageType);
      const message = await ChatMessage.findById(messageId);
      emitNewMessage(thread, message);

      return res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      console.error('Send message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message',
      });
    }
  }

  static async markThreadRead(req, res) {
    try {
      const currentUserId = req.user?.user_id;
      const threadId = parsePositiveInt(req.params.threadId);

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
      if (!threadId) {
        return res.status(400).json({
          success: false,
          message: 'threadId must be a positive integer',
        });
      }

      const thread = await ChatThread.findByIdForUser(threadId, currentUserId);
      if (!thread) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to modify this thread',
        });
      }

      const markedCount = await ChatMessage.markThreadReadByUser(threadId, currentUserId);
      emitReadReceipt(thread, currentUserId, markedCount);

      return res.json({
        success: true,
        data: {
          marked_count: markedCount,
        },
      });
    } catch (error) {
      console.error('Mark thread read error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read',
      });
    }
  }
}

module.exports = ChatController;
