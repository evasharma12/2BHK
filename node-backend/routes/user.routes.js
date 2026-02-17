const express = require('express');
const router = express.Router();

const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Update basic profile info
router.put('/:id', authMiddleware, UserController.updateProfile);

// Update primary phone number
router.put('/:id/phone', authMiddleware, UserController.updatePhone);

// Saved properties (renters/buyers) - auth required, user can only access own
router.get('/:id/saved-properties', authMiddleware, UserController.getSavedProperties);
router.get('/:id/saved-properties/check/:propertyId', authMiddleware, UserController.checkSavedProperty);
router.post('/:id/saved-properties', authMiddleware, UserController.saveProperty);
router.delete('/:id/saved-properties/:propertyId', authMiddleware, UserController.unsaveProperty);

module.exports = router;

