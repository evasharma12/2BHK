const express = require('express');
const router = express.Router();

// TODO: wire up real amenity controller methods
// const AmenityController = require('../controllers/amenity.controller');

// Example placeholder route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Amenity routes placeholder. Implement real endpoints here.'
  });
});

module.exports = router;

