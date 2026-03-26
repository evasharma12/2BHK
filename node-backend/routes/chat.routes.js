const express = require('express');
const router = express.Router();

const ChatController = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/threads', ChatController.createOrGetThread);
router.get('/threads', ChatController.getThreads);
router.get('/threads/:threadId/messages', ChatController.getThreadMessages);
router.post('/threads/:threadId/messages', ChatController.sendMessage);
router.post('/threads/:threadId/read', ChatController.markThreadRead);

module.exports = router;
