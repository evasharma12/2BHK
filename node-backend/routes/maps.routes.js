const express = require('express');
const router = express.Router();
const MapsController = require('../controllers/maps.controller');

// Public maps utility routes used by frontend forms
router.get('/autocomplete', MapsController.autocomplete);
router.get('/geocode', MapsController.geocode);

module.exports = router;
