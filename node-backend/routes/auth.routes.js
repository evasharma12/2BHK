const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// ============================================
// AUTH ROUTES
// ============================================

// Google Sign-In
router.post('/google', AuthController.googleSignIn);

// Signup
router.post('/signup', AuthController.signup);

// Login
router.post('/login', AuthController.login);

// Get current user (protected route)
router.get('/me', authMiddleware, AuthController.getCurrentUser);

module.exports = router;