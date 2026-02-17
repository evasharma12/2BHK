const express = require('express');
const router = express.Router();

const PropertyController = require('../controllers/property.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// List all active properties (must be before /:id)
router.get('/', PropertyController.getAllProperties);

// My listings (auth; must be before /:id)
router.get('/my-listings', authMiddleware, PropertyController.getMyListings);

// Get single property by id
router.get('/:id', PropertyController.getPropertyById);

// Delete own property (auth required)
router.delete('/:id', authMiddleware, PropertyController.deleteProperty);

// Update own property (auth required)
router.put('/:id', authMiddleware, PropertyController.updateProperty);

// Upload property images (auth first, then multer; multer errors return JSON)
router.post('/upload', authMiddleware, (req, res, next) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed (max 5MB per image, JPEG/PNG/GIF/WebP only)',
      });
    }
    next();
  });
}, PropertyController.uploadImages);

// Create a new property (requires auth)
router.post('/', authMiddleware, PropertyController.createProperty);

module.exports = router;

