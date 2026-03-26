const express = require('express');
const FeedbackController = require('../controllers/feedback.controller');

const router = express.Router();

router.post('/submissions', FeedbackController.submitFeedback);

module.exports = router;
