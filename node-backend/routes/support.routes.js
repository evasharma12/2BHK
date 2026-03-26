const express = require('express');
const SupportController = require('../controllers/support.controller');

const router = express.Router();

router.post('/queries', SupportController.submitQuery);

module.exports = router;
